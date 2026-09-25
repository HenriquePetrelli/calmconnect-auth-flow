import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Keeps `subscribers` in sync with Stripe on its own. Until now the table was
// only refreshed when the user opened the app (check-subscription): a
// cancellation, a failed renewal or a plan change done in the customer
// portal only showed up whenever that person happened to come back — and
// SOS/appointment quotas were decided on stale data in between.
//
// Configure in Stripe → Developers → Webhooks, pointing to
// https://<project>.supabase.co/functions/v1/stripe-webhook, with events:
//   checkout.session.completed, customer.subscription.created,
//   customer.subscription.updated, customer.subscription.deleted,
//   invoice.payment_failed
// and set the signing secret as the STRIPE_WEBHOOK_SECRET edge function secret.

const PLAN_PRICES = {
  Plus: Deno.env.get("STRIPE_PRICE_PLUS") ?? "price_1S3qAKPhFwqSktZsXexQefrx",
  Premium: Deno.env.get("STRIPE_PRICE_PREMIUM") ?? "price_1S3q9YPhFwqSktZsejrePGuS",
} as const;

const PLAN_LIMITS = {
  Plus: { appointments: 0, sos_uses: 1 },
  Premium: { appointments: 1, sos_uses: 1 },
} as const;

const log = (step: string, details?: unknown) =>
  console.log(`[STRIPE-WEBHOOK] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } }
);

const tierForPrice = (priceId: string | undefined): keyof typeof PLAN_PRICES | null => {
  if (priceId === PLAN_PRICES.Plus) return "Plus";
  if (priceId === PLAN_PRICES.Premium) return "Premium";
  return null;
};

const customerEmail = async (customer: string | Stripe.Customer | Stripe.DeletedCustomer | null): Promise<string | null> => {
  if (!customer) return null;
  if (typeof customer !== "string") return "deleted" in customer ? null : customer.email;
  const c = await stripe.customers.retrieve(customer);
  return "deleted" in c ? null : c.email;
};

/** Applies a subscription's current state to the subscriber row. */
const syncSubscription = async (subscription: Stripe.Subscription, userIdHint?: string | null) => {
  const email = await customerEmail(subscription.customer);
  if (!email) {
    log("Subscription without customer email, skipped", { id: subscription.id });
    return;
  }

  // Only "active"/"trialing" count as subscribed — same rule as
  // check-subscription, which lists active subscriptions only. past_due
  // (failed renewal still being retried) stops granting SOS/appointments.
  const live = subscription.status === "active" || subscription.status === "trialing";
  const tier = live ? tierForPrice(subscription.items.data[0]?.price.id) : null;
  if (live && !tier) log("Unknown price, no tier granted", { price: subscription.items.data[0]?.price.id });

  const patch = {
    email,
    stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
    subscribed: Boolean(live && tier),
    subscription_tier: tier,
    subscription_end: live ? new Date(subscription.current_period_end * 1000).toISOString() : null,
    plan_limits: tier ? PLAN_LIMITS[tier] : { appointments: 0, sos_uses: 0 },
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase.from("subscribers").select("user_id").eq("email", email).maybeSingle();
  const userId = existing?.user_id ?? userIdHint ?? null;
  if (!userId) {
    // No row yet and nothing tying the email to an account: check-subscription
    // will create it on the user's next visit.
    log("No subscriber row for email yet, skipped", { email });
    return;
  }

  const { error } = await supabase.from("subscribers").upsert({ ...patch, user_id: userId }, { onConflict: "email" });
  if (error) throw error;
  log("Subscriber synced", { email, status: subscription.status, tier });
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(body, signature, secret, undefined, cryptoProvider);
  } catch (err) {
    log("Invalid signature", { message: err instanceof Error ? err.message : String(err) });
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(String(session.subscription));
          await syncSubscription(subscription, session.metadata?.user_id ?? null);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(String(invoice.subscription));
          await syncSubscription(subscription);
        }
        log("Payment failed", { invoice: invoice.id, attempt: invoice.attempt_count });
        break;
      }
      default:
        log("Ignored event", { type: event.type });
    }
    return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    // 500 makes Stripe retry later, which is what we want for transient failures.
    log("Error handling event", { type: event.type, message: err instanceof Error ? err.message : String(err) });
    return new Response("Webhook handler failed", { status: 500 });
  }
});

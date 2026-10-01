import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Plans are resolved on the server from Stripe price IDs configured as
// secrets (STRIPE_PRICE_PLUS / STRIPE_PRICE_PREMIUM), defaulting to the
// current live prices. An unknown price grants NO tier — there used to be a
// fallback that promoted any price above R$ 69,99 to Premium, which, with
// create-checkout accepting any priceId from the client, let anyone
// subscribe to some other price in the account and be treated as Premium.
const PLAN_PRICES = {
  Plus: Deno.env.get("STRIPE_PRICE_PLUS") ?? "price_1S3qAKPhFwqSktZsXexQefrx",
  Premium: Deno.env.get("STRIPE_PRICE_PREMIUM") ?? "price_1S3q9YPhFwqSktZsejrePGuS",
} as const;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Monthly quotas (SOS, appointments) reset by calendar month — but this
// function runs on Deno's UTC clock, not Brazil's. Comparing getUTCFullYear/
// getUTCMonth means the "month" flips ~3h early (21h-24h BRT), so a use late
// on the last day of the month could get attributed to the next month and
// wrongly block a legitimate use early in that next month. Compare the
// month as lived in America/Sao_Paulo instead.
const brazilYearMonth = (date: Date) => {
  const brazil = new Date(date.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  return { year: brazil.getFullYear(), month: brazil.getMonth() };
};
const isSameBrazilMonth = (a: Date, b: Date) => {
  const ym1 = brazilYearMonth(a);
  const ym2 = brazilYearMonth(b);
  return ym1.year === ym2.year && ym1.month === ym2.month;
};

// sos_last_used is a plain `date` column (no time-of-day), unlike
// appointments_last_used (timestamptz). A date-only value like
// "2026-02-01" must be compared by its own Y/M digits — re-parsing it as
// `new Date("2026-02-01")` treats it as UTC midnight, and converting THAT
// to Brazil time rolls it back to Jan 31 21:00, wrongly classifying every
// "1st of the month" value as the previous month.
const isSameBrazilMonthAsDateOnly = (storedDateOnly: string, instant: Date): boolean => {
  const [storedYear, storedMonth] = storedDateOnly.split('-').map(Number);
  const brazilInstant = new Date(instant.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  return storedYear === brazilInstant.getFullYear() && storedMonth === brazilInstant.getMonth() + 1;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    // Use the service role key to perform writes (upsert) in Supabase
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId: string | null = customers.data[0]?.id ?? null;
    logStep(customerId ? "Found Stripe customer" : "No Stripe customer", { customerId });

    let stripeTier: "Plus" | "Premium" | null = null;
    let stripeEnd: string | null = null;
    if (customerId) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });
      if (subscriptions.data.length > 0) {
        const subscription = subscriptions.data[0];
        stripeEnd = new Date(subscription.current_period_end * 1000).toISOString();
        const priceId = subscription.items.data[0].price.id;
        if (priceId === PLAN_PRICES.Plus) stripeTier = "Plus";
        else if (priceId === PLAN_PRICES.Premium) stripeTier = "Premium";
        else logStep("Unknown price on active subscription — no tier granted", { priceId });
        logStep("Active subscription found", { subscriptionId: subscription.id, stripeTier, stripeEnd });
      } else {
        logStep("No active subscription found");
      }
    }

    // B2B: plano oferecido pela empresa (organization_members). Vale o maior
    // entre o do Stripe e o da empresa — o mesmo que o trigger
    // apply_organization_entitlement grava em `subscribers`.
    const { data: orgRows } = await supabaseClient.rpc("organization_entitlement", { p_user_id: user.id });
    const org = (orgRows ?? [])[0] as { tier: "Plus" | "Premium"; organization_name: string; ends_on: string | null } | undefined;
    const rank = (t: string | null | undefined) => (t === "Premium" ? 2 : t === "Plus" ? 1 : 0);
    const fromOrganization = Boolean(org && rank(org.tier) > rank(stripeTier));

    const subscriptionTier: "Plus" | "Premium" | null = fromOrganization ? org!.tier : stripeTier;
    const hasActiveSub = subscriptionTier !== null;
    const subscriptionEnd = fromOrganization ? (org!.ends_on ? new Date(`${org!.ends_on}T23:59:59-03:00`).toISOString() : null) : stripeEnd;
    const planLimits =
      subscriptionTier === "Premium"
        ? { appointments: 1, sos_uses: 1 }
        : subscriptionTier === "Plus"
          ? { appointments: 0, sos_uses: 1 }
          : { appointments: 0, sos_uses: 0 };
    logStep("Determined subscription tier", { subscriptionTier, source: fromOrganization ? "organization" : "stripe" });

    // Get current usage and SOS flags from database
    const { data: existingSubscriberRow } = await supabaseClient
      .from("subscribers")
      .select("current_usage, sos_used_this_month, sos_last_used, appointments_used_this_month, appointments_last_used, subscribed, subscription_tier, user_id")
      .eq("email", user.email)
      .maybeSingle();

    const currentUsage = existingSubscriberRow?.current_usage || { appointments: 0, sos_uses: 0 };
    let sosUsedThisMonth = existingSubscriberRow?.sos_used_this_month ?? false;
    let sosLastUsed = existingSubscriberRow?.sos_last_used ?? null as string | null;
    let appointmentsUsedThisMonth = existingSubscriberRow?.appointments_used_this_month ?? false;
    let appointmentsLastUsed = existingSubscriberRow?.appointments_last_used ?? null as string | null;

    // Compute SOS availability based on plan rules
    let canUseSOS = false;
    let sosReason = "Sem assinatura ativa";
    const now = new Date();
    const sameMonth = sosLastUsed
      ? isSameBrazilMonthAsDateOnly(sosLastUsed, now)
      : false;

    if (!hasActiveSub || !subscriptionTier) {
      canUseSOS = false;
      sosReason = "Usuário não possui assinatura ativa";
    } else if (subscriptionTier === "Plus") {
      // Reset monthly flag when month changed
      if (sosUsedThisMonth && sosLastUsed && !sameMonth) {
        await supabaseClient
          .from("subscribers")
          .update({ sos_used_this_month: false, sos_last_used: null, updated_at: new Date().toISOString() })
          .eq("email", user.email);
        sosUsedThisMonth = false;
        sosLastUsed = null;
      }
      
      canUseSOS = !sosUsedThisMonth;
      sosReason = canUseSOS ? "Pode usar SOS (PLUS: 1x/mês)" : "Limite mensal de SOS já utilizado (PLUS: 1x/mês)";
    } else if (subscriptionTier === "Premium") {
      // Reset monthly flag when month changed
      if (sosUsedThisMonth && sosLastUsed && !sameMonth) {
        await supabaseClient
          .from("subscribers")
          .update({ sos_used_this_month: false, sos_last_used: null, updated_at: new Date().toISOString() })
          .eq("email", user.email);
        sosUsedThisMonth = false;
        sosLastUsed = null;
      }
      
      canUseSOS = !sosUsedThisMonth;
      sosReason = canUseSOS ? "Pode usar SOS (PREMIUM: 1x/mês)" : "Limite mensal de SOS já utilizado (PREMIUM: 1x/mês)";
    }

    // Compute appointment-scheduling availability: only Premium has any
    // allowance (planLimits.appointments), 1x/month, same reset pattern as SOS.
    let canScheduleAppointment = false;
    let appointmentReason = "Sem assinatura ativa";
    const sameMonthAppointments = appointmentsLastUsed
      ? isSameBrazilMonth(new Date(appointmentsLastUsed), now)
      : false;

    if (!hasActiveSub || !subscriptionTier) {
      canScheduleAppointment = false;
      appointmentReason = "Sem assinatura ativa";
    } else if (subscriptionTier === "Plus") {
      canScheduleAppointment = false;
      appointmentReason = "Agendamento de consultas disponível apenas no plano Premium";
    } else if (subscriptionTier === "Premium") {
      // Reset monthly flag when month changed
      if (appointmentsUsedThisMonth && appointmentsLastUsed && !sameMonthAppointments) {
        await supabaseClient
          .from("subscribers")
          .update({ appointments_used_this_month: false, appointments_last_used: null, updated_at: new Date().toISOString() })
          .eq("email", user.email);
        appointmentsUsedThisMonth = false;
        appointmentsLastUsed = null;
      }

      canScheduleAppointment = !appointmentsUsedThisMonth;
      appointmentReason = canScheduleAppointment
        ? "Pode agendar consulta (PREMIUM: 1x/mês)"
        : "Limite mensal de consultas agendadas já utilizado (PREMIUM: 1x/mês)";
    }

    // Update subscriber in database
    // Grava o estado do Stripe (entitlement_source = 'stripe'); o trigger do
    // banco soma o plano da empresa, se houver.
    await supabaseClient.from("subscribers").upsert({
      email: user.email,
      user_id: user.id,
      stripe_customer_id: customerId,
      subscribed: stripeTier !== null,
      subscription_tier: stripeTier,
      subscription_end: stripeEnd,
      plan_limits: stripeTier === "Premium" ? { appointments: 1, sos_uses: 1 } : stripeTier === "Plus" ? { appointments: 0, sos_uses: 1 } : { appointments: 0, sos_uses: 0 },
      entitlement_source: "stripe",
      current_usage: currentUsage,
      sos_used_this_month: sosUsedThisMonth,
      sos_last_used: sosLastUsed,
      appointments_used_this_month: appointmentsUsedThisMonth,
      appointments_last_used: appointmentsLastUsed,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'email' });

    logStep("Updated database with subscription info", { subscribed: hasActiveSub, subscriptionTier, planLimits });
    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd,
      plan_limits: planLimits,
      current_usage: currentUsage,
      can_use_sos: canUseSOS,
      reason: sosReason,
      can_schedule_appointment: canScheduleAppointment,
      appointment_reason: appointmentReason,
      plan_type: subscriptionTier,
      entitlement_source: hasActiveSub ? (fromOrganization ? "organization" : "stripe") : null,
      organization_name: fromOrganization ? org!.organization_name : null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
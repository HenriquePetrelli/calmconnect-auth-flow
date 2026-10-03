import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PLAN_LIMITS, stripeState, tierRank } from "../_shared/billing.ts";
import { PLAN_PRICES, findCustomerId, listSubscriptions, newStripe, syncCustomerEmail } from "../_shared/stripe.ts";

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

    const stripe = newStripe();
    const customerId = await findCustomerId(stripe, supabaseClient, user);
    logStep(customerId ? "Found Stripe customer" : "No Stripe customer", { customerId });

    // Todas as assinaturas: em dia, em teste ou com pagamento atrasado (que
    // mantém o acesso enquanto o Stripe tenta cobrar de novo).
    const stripeSub = customerId
      ? stripeState(PLAN_PRICES, await listSubscriptions(stripe, customerId), Math.floor(Date.now() / 1000))
      : stripeState(PLAN_PRICES, [], 0);
    const stripeTier = stripeSub.tier;
    const stripeEnd = stripeSub.periodEnd;
    if (stripeSub.extraSubscriptions > 0) logStep("More than one live subscription (double charge)", { customerId, extra: stripeSub.extraSubscriptions });
    if (customerId) {
      // Quem trocou o e-mail da conta passa a receber recibos no e-mail novo.
      await syncCustomerEmail(stripe, customerId, user).catch((e) => logStep("Could not sync customer email", { message: String(e) }));
    }
    logStep("Stripe state", stripeSub);

    // B2B: plano oferecido pela empresa (organization_members). Vale o maior
    // entre o do Stripe e o da empresa — o mesmo que o trigger
    // apply_organization_entitlement grava em `subscribers`.
    const { data: orgRows } = await supabaseClient.rpc("organization_entitlement", { p_user_id: user.id });
    const org = (orgRows ?? [])[0] as { tier: "Plus" | "Premium"; organization_name: string; ends_on: string | null } | undefined;
    const fromOrganization = Boolean(org && tierRank(org.tier) > tierRank(stripeTier));

    const subscriptionTier: "Plus" | "Premium" | null = fromOrganization ? org!.tier : stripeTier;
    const hasActiveSub = subscriptionTier !== null;
    const subscriptionEnd = fromOrganization ? (org!.ends_on ? new Date(`${org!.ends_on}T23:59:59-03:00`).toISOString() : null) : stripeEnd;
    const planLimits = PLAN_LIMITS[subscriptionTier ?? "none"];
    logStep("Determined subscription tier", { subscriptionTier, source: fromOrganization ? "organization" : "stripe" });

    // Get current usage and SOS flags from database
    // A linha é da pessoa (user_id), não do e-mail: quem troca o e-mail da
    // conta continua com a mesma linha e os mesmos contadores do mês (antes
    // ganhava uma linha nova, zerada, e o SOS do mês "voltava").
    const subscriberColumns = "id, email, current_usage, sos_used_this_month, sos_last_used, appointments_used_this_month, appointments_last_used, subscribed, subscription_tier, user_id";
    const { data: byUser } = await supabaseClient
      .from("subscribers")
      .select(subscriberColumns)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1);
    let existingSubscriberRow = byUser?.[0] ?? null;
    if (!existingSubscriberRow) {
      const { data: byEmail } = await supabaseClient.from("subscribers").select(subscriberColumns).eq("email", user.email).maybeSingle();
      existingSubscriberRow = byEmail ?? null;
    }
    const rowFilter = existingSubscriberRow ? { column: "id", value: existingSubscriberRow.id } : { column: "email", value: user.email };

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
          .eq(rowFilter.column, rowFilter.value)
          // Só zera se ninguém usou o SOS do mês novo enquanto esta checagem rodava.
          .eq("sos_last_used", sosLastUsed);
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
          .eq(rowFilter.column, rowFilter.value)
          // Só zera se ninguém usou o SOS do mês novo enquanto esta checagem rodava.
          .eq("sos_last_used", sosLastUsed);
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
          .eq(rowFilter.column, rowFilter.value)
          // Só zera se a consulta do mês novo não foi reservada enquanto esta checagem rodava.
          .eq("appointments_last_used", appointmentsLastUsed);
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
    const stripeRow = {
      email: user.email,
      user_id: user.id,
      stripe_customer_id: customerId,
      subscribed: stripeTier !== null,
      subscription_tier: stripeTier,
      subscription_end: stripeEnd,
      plan_limits: PLAN_LIMITS[stripeTier ?? "none"],
      entitlement_source: "stripe",
      updated_at: new Date().toISOString(),
    };
    // O uso do mês (SOS e consulta) não é regravado numa linha existente:
    // ele muda por outros caminhos (início do SOS, agendamento, devoluções) e
    // regravar o valor lido no começo desta checagem apagava um uso feito no
    // meio dela (SOS ou consulta extra de graça).
    const { error: writeError } = existingSubscriberRow
      ? await supabaseClient.from("subscribers").update(stripeRow).eq("id", existingSubscriberRow.id)
      : await supabaseClient.from("subscribers").upsert({
          ...stripeRow,
          current_usage: currentUsage,
          sos_used_this_month: sosUsedThisMonth,
          sos_last_used: sosLastUsed,
          appointments_used_this_month: appointmentsUsedThisMonth,
          appointments_last_used: appointmentsLastUsed,
        }, { onConflict: "email" });
    if (writeError) logStep("Could not write subscriber row", { message: writeError.message });

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
      // Paga uma assinatura própria além do benefício da empresa: o app avisa
      // que pode cancelar (é o que Headspace e Calm fazem com quem já pagava).
      personal_subscription_tier: fromOrganization ? stripeTier : null,
      // Estado da assinatura própria, para a tela de planos.
      stripe_status: stripeSub.status,
      cancel_at_period_end: stripeSub.cancelAtPeriodEnd,
      pending_tier: stripeSub.pendingTier,
      pending_from: stripeSub.pendingFrom,
      payment_issue: stripeSub.status === "past_due",
      extra_subscriptions: stripeSub.extraSubscriptions,
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
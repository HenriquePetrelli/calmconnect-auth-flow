import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
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
    
    if (customers.data.length === 0) {
      logStep("No customer found, updating unsubscribed state");
      await supabaseClient.from("subscribers").upsert({
        email: user.email,
        user_id: user.id,
        stripe_customer_id: null,
        subscribed: false,
        subscription_tier: null,
        subscription_end: null,
        plan_limits: { appointments: 0, sos_uses: 0 },
        current_usage: { appointments: 0, sos_uses: 0 },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' });
      return new Response(JSON.stringify({
        subscribed: false,
        plan_limits: { appointments: 0, sos_uses: 0 },
        current_usage: { appointments: 0, sos_uses: 0 },
        can_use_sos: false,
        reason: "Usuário não possui assinatura ativa",
        can_schedule_appointment: false,
        appointment_reason: "Usuário não possui assinatura ativa"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    const hasActiveSub = subscriptions.data.length > 0;
    let subscriptionTier = null;
    let subscriptionEnd = null;
    let planLimits = { appointments: 0, sos_uses: 0 };

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      logStep("Active subscription found", { subscriptionId: subscription.id, endDate: subscriptionEnd });
      
      // Determine subscription tier from price
      const priceId = subscription.items.data[0].price.id;
      
      // Check if it's one of our specific price IDs
      if (priceId === "price_1S3qAKPhFwqSktZsXexQefrx") {
        subscriptionTier = "Plus";
        planLimits = { appointments: 0, sos_uses: 1 };
      } else if (priceId === "price_1S3q9YPhFwqSktZsejrePGuS") {
        subscriptionTier = "Premium";
        planLimits = { appointments: 1, sos_uses: 1 };
      } else {
        // Fallback based on amount
        const price = await stripe.prices.retrieve(priceId);
        const amount = price.unit_amount || 0;
        if (amount <= 6999) {
          subscriptionTier = "Plus";
          planLimits = { appointments: 0, sos_uses: 1 };
        } else {
          subscriptionTier = "Premium";
          planLimits = { appointments: 1, sos_uses: 1 };
        }
      }
      logStep("Determined subscription tier", { priceId, subscriptionTier, planLimits });
    } else {
      logStep("No active subscription found");
    }

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
      ? (new Date(sosLastUsed)).getUTCFullYear() === now.getUTCFullYear() && (new Date(sosLastUsed)).getUTCMonth() === now.getUTCMonth()
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
      ? (new Date(appointmentsLastUsed)).getUTCFullYear() === now.getUTCFullYear() && (new Date(appointmentsLastUsed)).getUTCMonth() === now.getUTCMonth()
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
    await supabaseClient.from("subscribers").upsert({
      email: user.email,
      user_id: user.id,
      stripe_customer_id: customerId,
      subscribed: hasActiveSub,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd,
      plan_limits: planLimits,
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
      plan_type: subscriptionTier
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
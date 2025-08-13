import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MARK-SOS-USED] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseService = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const body = await req.json();
    const requestId: string | undefined = body?.request_id;
    if (!requestId) {
      return new Response(JSON.stringify({ error: "Missing request_id" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logStep("Marking SOS used for request", { requestId });

    // Fetch emergency request to identify the patient
    const { data: emergency, error: emergencyError } = await supabaseService
      .from('emergency_requests')
      .select('id, patient_id, started_at')
      .eq('id', requestId)
      .maybeSingle();

    if (emergencyError || !emergency?.patient_id) {
      logStep("Emergency request not found", { error: emergencyError?.message });
      return new Response(JSON.stringify({ error: 'Emergency request not found' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    const patientId = (emergency as any).patient_id as string;

    // Fetch subscriber row for the patient
    const { data: subscriber } = await supabaseService
      .from('subscribers')
      .select('id, user_id, email, subscribed, subscription_tier, sos_used_this_month, sos_last_used')
      .eq('user_id', patientId)
      .maybeSingle();

    if (!subscriber || !subscriber.subscribed) {
      logStep("Subscriber not found or not active", { patientId });
      return new Response(JSON.stringify({ ok: false, reason: 'No active subscription' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Only apply for Plus plan
    if ((subscriber.subscription_tier || '').toLowerCase() !== 'plus') {
      logStep("Not Plus plan, no SOS usage recorded", { patientId, tier: subscriber.subscription_tier });
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const today = new Date();
    const last = subscriber.sos_last_used ? new Date(subscriber.sos_last_used) : null;
    const sameMonth = last ? (last.getUTCFullYear() === today.getUTCFullYear() && last.getUTCMonth() === today.getUTCMonth()) : false;

    // If already used this month, nothing to do (idempotent)
    if (subscriber.sos_used_this_month && sameMonth) {
      logStep("SOS already used this month, skipping", { patientId });
      return new Response(JSON.stringify({ ok: true, already_used: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // If month changed, reset first (optional)
    let updatePayload: any = {
      sos_used_this_month: true,
      sos_last_used: today.toISOString().slice(0, 10), // store as date
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabaseService
      .from('subscribers')
      .update(updatePayload)
      .eq('user_id', patientId);

    if (updateError) {
      logStep("Failed to update subscriber", { error: updateError.message });
      return new Response(JSON.stringify({ error: 'Failed to update subscriber' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    logStep("SOS usage marked for patient", { patientId });
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR in mark-sos-used", { message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

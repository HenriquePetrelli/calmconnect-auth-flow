import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Supabase env not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization header missing" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { emergency_request_id, user_id, user_type } = await req.json();

    if (!emergency_request_id || !user_id || !user_type) {
      return new Response(JSON.stringify({ error: "Missing required parameters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the emergency request exists and user has permission
    const { data: emergencyRequest, error: emergencyError } = await supabase
      .from("emergency_requests")
      .select("id, status, patient_id, accepted_by")
      .eq("id", emergency_request_id)
      .single();

    if (emergencyError || !emergencyRequest) {
      return new Response(JSON.stringify({ error: "Emergency request not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user has access to this emergency request
    const hasAccess = (user_type === "patient" && emergencyRequest.patient_id === user_id) ||
                     (user_type === "psychologist" && emergencyRequest.accepted_by === user_id);

    if (!hasAccess) {
      return new Response(JSON.stringify({ error: "Unauthorized access" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create or get existing WebRTC session
    const { data: existingSession } = await supabase
      .from("webrtc_sessions")
      .select("*")
      .eq("emergency_request_id", emergency_request_id)
      .single();

    if (existingSession) {
      return new Response(JSON.stringify({
        session_id: existingSession.id,
        stun_servers: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"]
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create new WebRTC session
    const sessionData: any = {
      emergency_request_id,
      status: "pending"
    };

    if (user_type === "psychologist") {
      sessionData.psychologist_id = user_id;
    } else {
      sessionData.patient_id = user_id;
    }

    const { data: session, error: sessionError } = await supabase
      .from("webrtc_sessions")
      .insert(sessionData)
      .select()
      .single();

    if (sessionError) {
      console.error("Error creating WebRTC session:", sessionError);
      return new Response(JSON.stringify({ error: "Failed to create session" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("WebRTC session created:", session.id, "for user:", user_id);

    return new Response(JSON.stringify({
      session_id: session.id,
      stun_servers: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"]
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in initiate-webrtc:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
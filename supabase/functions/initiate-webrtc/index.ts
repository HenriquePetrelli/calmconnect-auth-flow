import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  console.log(`${req.method} request received to initiate-webrtc`);

  if (req.method === "OPTIONS") {
    console.log("CORS preflight request");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log("Environment check:", {
      hasUrl: !!SUPABASE_URL,
      hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY,
      urlStart: SUPABASE_URL?.substring(0, 20)
    });

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing environment variables");
      return new Response(JSON.stringify({ error: "Supabase env not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log all incoming headers for debugging
    console.log("Request headers:", Object.fromEntries(req.headers.entries()));

    // Extract and validate JWT token
    const authHeader = req.headers.get("Authorization") ?? "";
    console.log("Auth header present:", !!authHeader, "Format check:", authHeader.startsWith("Bearer "));
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("Invalid authorization header format");
      return new Response(JSON.stringify({ error: "Token de autenticação ausente ou mal formatado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.split(" ")[1];
    console.log("Token extracted, length:", token?.length);
    
    // Validate token with Supabase Admin client
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    console.log("Validating token with Supabase admin client...");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth validation failed:", {
        error: authError,
        hasUser: !!user,
        errorMessage: authError?.message,
        errorStatus: authError?.status
      });
      return new Response(JSON.stringify({ error: "Token inválido ou expirado", debug: authError?.message }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Authentication successful for user:", user.id, "Email:", user.email);

    if (req.method !== "POST") {
      console.error("Invalid method:", req.method);
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requestBody = await req.json();
    console.log("Request body received:", requestBody);
    
    const { emergency_request_id, user_type } = requestBody;

    if (!emergency_request_id || !user_type) {
      console.error("Missing parameters:", { emergency_request_id, user_type });
      return new Response(JSON.stringify({ error: "Missing required parameters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create client with user's token for RLS
    const supabaseClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: {
        headers: { Authorization: `Bearer ${token}` }
      }
    });

    console.log("Checking emergency request:", emergency_request_id, "for user:", user.id, "type:", user_type);

    // Verify the emergency request exists and user has permission
    const { data: emergencyRequest, error: emergencyError } = await supabaseClient
      .from("emergency_requests")
      .select("id, status, patient_id, accepted_by")
      .eq("id", emergency_request_id)
      .single();

    console.log("Emergency request query result:", {
      data: emergencyRequest,
      error: emergencyError,
      errorCode: emergencyError?.code,
      errorMessage: emergencyError?.message
    });

    if (emergencyError || !emergencyRequest) {
      console.error("Emergency request not found or access denied:", emergencyError);
      return new Response(JSON.stringify({ 
        error: "Emergency request not found",
        debug: emergencyError?.message || "Request not found"
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user has access to this emergency request
    const hasAccess = (user_type === "patient" && emergencyRequest.patient_id === user.id) ||
                     (user_type === "psychologist" && (
                       emergencyRequest.accepted_by === user.id || 
                       (emergencyRequest.status === 'pending' && emergencyRequest.accepted_by === null)
                     ));

    console.log("Access check:", {
      userType: user_type,
      userId: user.id,
      patientId: emergencyRequest.patient_id,
      acceptedBy: emergencyRequest.accepted_by,
      status: emergencyRequest.status,
      hasAccess
    });

    if (!hasAccess) {
      console.error("User does not have access to this emergency request");
      return new Response(JSON.stringify({ error: "Unauthorized access to this emergency request" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for existing WebRTC session
    console.log("Checking for existing WebRTC session...");
    const { data: existingSession, error: existingError } = await supabaseClient
      .from("webrtc_sessions")
      .select("*")
      .eq("emergency_request_id", emergency_request_id)
      .single();

    console.log("Existing session check:", {
      found: !!existingSession,
      error: existingError,
      sessionId: existingSession?.id
    });

    if (existingSession) {
      console.log("Returning existing session:", existingSession.id);
      return new Response(JSON.stringify({
        success: true,
        session_id: existingSession.id,
        stun_servers: ["stun:stun.l.google.com:19302", "stun:global.stun.twilio.com:3478"]
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
      sessionData.psychologist_id = user.id;
    } else {
      sessionData.patient_id = user.id;
    }

    console.log("Creating new WebRTC session with data:", sessionData);

    const { data: session, error: sessionError } = await supabaseClient
      .from("webrtc_sessions")
      .insert(sessionData)
      .select()
      .single();

    console.log("Session creation result:", {
      success: !!session,
      error: sessionError,
      sessionId: session?.id,
      errorCode: sessionError?.code,
      errorMessage: sessionError?.message
    });

    if (sessionError) {
      console.error("Failed to create WebRTC session:", sessionError);
      
      // Try with admin client as fallback
      console.log("Attempting session creation with admin client...");
      const { data: adminSession, error: adminError } = await supabaseAdmin
        .from("webrtc_sessions")
        .insert(sessionData)
        .select()
        .single();

      if (adminError) {
        console.error("Admin fallback also failed:", adminError);
        return new Response(JSON.stringify({ 
          error: "Failed to create session", 
          details: sessionError.message,
          adminError: adminError.message 
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("Session created with admin client:", adminSession.id);
      session = adminSession;
    }

    console.log("WebRTC session successfully created:", session.id, "for user:", user.id);

    return new Response(JSON.stringify({
      success: true,
      session_id: session.id,
      stun_servers: ["stun:stun.l.google.com:19302", "stun:global.stun.twilio.com:3478"]
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Unexpected error in initiate-webrtc:", {
      error: error.message,
      stack: error.stack,
      name: error.name
    });
    return new Response(JSON.stringify({ 
      error: "Erro interno no servidor", 
      details: error.message,
      type: error.name 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
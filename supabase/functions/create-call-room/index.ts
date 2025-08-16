import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const DAILY_API_KEY = Deno.env.get("DAILY_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Supabase env not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!DAILY_API_KEY) {
      return new Response(JSON.stringify({ error: "DAILY_API_KEY is not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";

    // Auth-aware client (to read user info)
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client (to write regardless of RLS when needed)
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { requestId } = await req.json();
    if (!requestId) {
      return new Response(JSON.stringify({ error: "requestId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get current user (for logging/authorization if needed)
    const { data: userData } = await supabase.auth.getUser();
    const callerId = userData?.user?.id;

    // Fetch emergency request to ensure it exists
    const { data: requestRow, error: fetchErr } = await supabaseAdmin
      .from("emergency_requests")
      .select("id, status, accepted_by, video_room_id, room_url")
      .eq("id", requestId)
      .maybeSingle();

    if (fetchErr || !requestRow) {
      console.error("Request not found or error:", fetchErr);
      return new Response(JSON.stringify({ error: "Emergency request not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If a room already exists, return it
    if (requestRow.room_url) {
      return new Response(JSON.stringify({ room_url: requestRow.room_url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Daily room
    const roomName = `emergency_${requestId}`;
    const dailyResp = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        name: roomName,
        privacy: "public", // For simplicity; consider tokens for production
        properties: {
          start_audio_off: false,
          start_video_off: false,
          enable_chat: true,
        },
      }),
    });

    if (!dailyResp.ok) {
      const errTxt = await dailyResp.text();
      console.error(`Daily room creation failed [${dailyResp.status}]:`, errTxt);
      
      // Try to parse error details
      let errorMessage = "Failed to create Daily room";
      try {
        const errorData = JSON.parse(errTxt);
        if (errorData.error === "authentication-error") {
          errorMessage = "Daily.co API authentication failed - check DAILY_API_KEY";
        } else {
          errorMessage = `Daily.co error: ${errorData.error || errorData.message || errTxt}`;
        }
      } catch {
        errorMessage = `Daily.co API error (${dailyResp.status}): ${errTxt}`;
      }
      
      return new Response(JSON.stringify({ 
        error: errorMessage,
        status: dailyResp.status,
        details: errTxt 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dailyData = await dailyResp.json();

    // Persist room info
    const { error: updateErr } = await supabaseAdmin
      .from("emergency_requests")
      .update({
        video_room_id: roomName,
        room_url: dailyData?.url ?? null,
      })
      .eq("id", requestId);

    if (updateErr) {
      console.error("Error updating request with room:", updateErr);
      return new Response(JSON.stringify({ error: "Failed to save room info" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Room created for request", requestId, "by", callerId);

    return new Response(
      JSON.stringify({
        room_url: dailyData?.url,
        name: roomName,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Unhandled error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

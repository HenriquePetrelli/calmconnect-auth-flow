import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";

const getAllowedOrigins = () => {
  return [
    'https://82bda655-81e5-448f-832e-ea464e8925dc.sandbox.lovable.dev',
    'https://id-preview--82bda655-81e5-448f-832e-ea464e8925dc.lovable.app',
    'http://localhost:3000',
    'http://localhost:5173'
  ];
};

const getCorsHeaders = (origin: string | null) => {
  const allowedOrigins = getAllowedOrigins();
  const isAllowed = origin && allowedOrigins.includes(origin);
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true'
  };
};

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { request_id, patient_id } = await req.json();

    if (!request_id || !patient_id) {
      return new Response(
        JSON.stringify({ error: 'Missing request_id or patient_id' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if the request exists and is still pending
    const { data: existingRequest, error: fetchError } = await supabase
      .from('emergency_requests')
      .select('*')
      .eq('id', request_id)
      .eq('patient_id', patient_id)
      .eq('status', 'pending')
      .single();

    if (fetchError || !existingRequest) {
      return new Response(
        JSON.stringify({ message: 'No pending request to cleanup' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Delete the emergency request
    const { error } = await supabase
      .from('emergency_requests')
      .delete()
      .eq('id', request_id)
      .eq('patient_id', patient_id);

    if (error) {
      console.error('Error deleting emergency request:', error);
      throw error;
    }

    console.log(`Emergency request ${request_id} cleaned up for patient ${patient_id}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Emergency request cleaned up' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in emergency cleanup:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
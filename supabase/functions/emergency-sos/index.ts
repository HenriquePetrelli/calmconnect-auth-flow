import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    // Verify user type from profile - only patients and psychologists can access SOS
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('user_id', user.id)
      .single();

    if (!profile || (profile.user_type !== 'patient' && profile.user_type !== 'psychologist')) {
      throw new Error('Access denied. Invalid user type.');
    }

    if (req.method === 'POST') {
      // Create emergency request
      const { data: emergencyRequest, error: insertError } = await supabase
        .from('emergency_requests')
        .insert({
          patient_id: user.id,
          status: 'pending'
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating emergency request:', insertError.message);
        throw insertError;
      }

      // Get online psychologists (for now, we'll get all psychologists)
      const { data: psychologists, error: psychError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('user_type', 'psychologist')
        .eq('registration_status', 'approved');

      if (psychError) {
        console.error('Error fetching psychologists:', psychError.message);
        throw psychError;
      }

      // TODO: Send push notifications to online psychologists
      // This would integrate with Firebase Cloud Messaging
      // Removed sensitive logging for security

      return new Response(
        JSON.stringify({
          success: true,
          emergency_request_id: emergencyRequest.id,
          message: 'Solicitação de emergência enviada. Aguardando resposta dos psicólogos.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (req.method === 'GET') {
      // Check status of emergency request
      const url = new URL(req.url);
      const requestId = url.searchParams.get('request_id');

      if (!requestId) {
        throw new Error('Request ID is required');
      }

      const { data: request, error } = await supabase
        .from('emergency_requests')
        .select(`
          *,
          psychologist:accepted_by(full_name)
        `)
        .eq('id', requestId)
        .eq('patient_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching emergency request:', error.message);
        throw error;
      }

      return new Response(
        JSON.stringify(request),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  } catch (error: any) {
    console.error('Error in emergency-sos function:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
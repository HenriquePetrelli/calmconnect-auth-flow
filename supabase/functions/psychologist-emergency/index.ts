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

    // Verify user is a psychologist
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile || profile.user_type !== 'psychologist') {
      throw new Error('Access denied. Psychologist access required.');
    }

    if (req.method === 'GET') {
      // Get pending emergency requests
      const { data: emergencyRequests, error } = await supabase
        .from('emergency_requests')
        .select(`
          *,
          patient:patient_id(full_name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching emergency requests:', error);
        throw error;
      }

      return new Response(
        JSON.stringify(emergencyRequests),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (req.method === 'PUT') {
      // Accept/decline emergency request
      const { requestId, action } = await req.json();

      if (!requestId || !action || !['accept', 'decline'].includes(action)) {
        throw new Error('Invalid request parameters');
      }

      if (action === 'accept') {
        // Accept the emergency request
        const { data: updatedRequest, error } = await supabase
          .from('emergency_requests')
          .update({
            status: 'accepted',
            accepted_by: user.id,
            accepted_at: new Date().toISOString()
          })
          .eq('id', requestId)
          .eq('status', 'pending') // Only accept if still pending
          .select()
          .single();

        if (error) {
          console.error('Error accepting emergency request:', error);
          throw error;
        }

        if (!updatedRequest) {
          throw new Error('Emergency request no longer available');
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Emergência aceita com sucesso',
            emergency_request: updatedRequest
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } else {
        // For decline, we don't need to update the request - it remains available for other psychologists
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Emergência recusada'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  } catch (error: any) {
    console.error('Error in psychologist-emergency function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
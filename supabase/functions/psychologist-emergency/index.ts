
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";

const getCorsHeaders = (origin: string | null) => {
  // Check if origin is from Lovable domains or localhost
  const isLovableOrigin = origin && (
    origin.includes('sandbox.lovable.dev') ||
    origin.includes('lovable.app') ||
    origin.startsWith('http://localhost')
  );
  
  return {
    'Access-Control-Allow-Origin': isLovableOrigin ? origin : '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, PUT, GET, OPTIONS, DELETE',
    'Access-Control-Allow-Credentials': 'true'
  };
};

// Helper function to check if psychologist can help with patient symptoms
async function canPsychologistHelp(supabase, psychologistId, patientSymptoms) {
  try {
    // 1. Get psychologist's area of attention
    const { data: psychologist, error: psychError } = await supabase
      .from('psychologists')
      .select('area_atendimento')
      .eq('user_id', psychologistId)
      .single();

    if (psychError || !psychologist?.area_atendimento) {
      console.error('Error fetching psychologist:', psychError);
      return false;
    }

    // 2. Get symptoms associated with the psychologist's disorder
    const { data: transtornoData, error: transtornoError } = await supabase
      .from('transtornos_sintomas')
      .select('sintomas')
      .eq('transtorno', psychologist.area_atendimento)
      .single();

    if (transtornoError || !transtornoData?.sintomas) {
      console.error('Error fetching disorder symptoms:', transtornoError);
      return false;
    }

    // 3. Check if there's intersection between patient symptoms and disorder symptoms
    const transtornoSintomas = transtornoData.sintomas;
    const hasMatch = patientSymptoms.some(symptom => 
      transtornoSintomas.includes(symptom)
    );

    return hasMatch;
  } catch (error) {
    console.error('Error in matching logic:', error);
    return false;
  }
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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

    if (req.method === 'GET' || req.method === 'POST') {
      // Get pending emergency requests
      const { data: emergencyRequests, error } = await supabase
        .from('emergency_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching emergency requests:', error);
        throw error;
      }

      console.log(`Found ${emergencyRequests?.length || 0} pending emergency requests`);

      // Enhance requests with patient information - show ALL emergency requests
      const enhancedRequests = [];
      
      for (const request of emergencyRequests || []) {
        // Get patient profile for display
        const { data: patientProfile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', request.patient_id)
          .maybeSingle();

        // Get patient symptoms for additional context (optional)
        const { data: patient } = await supabase
          .from('patients')
          .select('sintomas_selecionados')
          .eq('user_id', request.patient_id)
          .maybeSingle();

        // Always include the emergency request - in emergency situations, any psychologist should be able to help
        enhancedRequests.push({
          ...request,
          patient: {
            full_name: patientProfile?.full_name || 'Paciente',
            symptoms: patient?.sintomas_selecionados || []
          }
        });
      }

      console.log(`Returning ${enhancedRequests.length} emergency requests to psychologist`);

      return new Response(
        JSON.stringify(enhancedRequests),
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

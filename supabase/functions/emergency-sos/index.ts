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
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Credentials': 'true'
  };
};

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  console.log('🆘 emergency-sos function called, method:', req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('🆘 Handling OPTIONS request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    console.log('🆘 Authorization header present:', !!authHeader);
    
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    console.log('🆘 User authentication result:', { userId: user?.id, error: authError?.message });

    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    // Verify user type from profile - only patients and psychologists can access SOS
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('user_id', user.id)
      .single();

    console.log('🆘 User profile:', { userId: user.id, userType: profile?.user_type });

    if (!profile || (profile.user_type !== 'patient' && profile.user_type !== 'psychologist')) {
      throw new Error('Access denied. Invalid user type.');
    }

    if (req.method === 'POST') {
      console.log('🆘 POST request - Creating emergency request for patient:', user.id);

      // Cap rapid-fire create/cancel cycles from flooding the psychologist
      // queue — a real crisis doesn't need more than a handful of attempts
      // in a short window.
      const { data: withinLimit } = await supabase.rpc('check_rate_limit', {
        p_key: `emergency-sos:${user.id}`,
        p_max_requests: 5,
        p_window_seconds: 600,
      });
      if (withinLimit === false) {
        throw new Error('Muitas tentativas em pouco tempo. Aguarde alguns minutos antes de tentar novamente.');
      }

      // A patient that is already inside an open flow must be sent back to it
      // instead of creating a duplicated request.
      const { data: existingRequest } = await supabase
        .from('emergency_requests')
        .select('id, status, video_room_id')
        .eq('patient_id', user.id)
        .in('status', ['pending', 'accepted', 'in_progress'])
        .is('ended_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingRequest) {
        console.log('🆘 User already has active request:', existingRequest.id);
        return new Response(
          JSON.stringify({
            success: true,
            emergency_request_id: existingRequest.id,
            status: existingRequest.status,
            session_id: existingRequest.video_room_id,
            message: 'Você já tem uma solicitação de emergência ativa. Aguardando resposta dos psicólogos.'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Patient must not be blocked.
      const { data: patientRow } = await supabase
        .from('patients')
        .select('is_blocked, blocked_until, blocked_reason')
        .eq('user_id', user.id)
        .maybeSingle();

      const blockActive =
        patientRow?.is_blocked === true &&
        (!patientRow?.blocked_until || new Date(patientRow.blocked_until) > new Date());

      if (blockActive) {
        return new Response(
          JSON.stringify({
            success: false,
            code: 'PATIENT_BLOCKED',
            error: patientRow?.blocked_reason
              ? `Sua conta está bloqueada: ${patientRow.blocked_reason}`
              : 'Sua conta está temporariamente bloqueada para atendimentos de emergência.',
          }),
          // This is an expected business-rule outcome, not a transport failure.
          // Returning 200 lets the SPA render the blocked state without Supabase
          // promoting the response to a FunctionsHttpError/runtime error.
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Subscription / monthly SOS quota is enforced server-side.
      const { data: quota, error: quotaError } = await supabase
        .rpc('can_use_sos', { p_user_id: user.id })
        .maybeSingle();

      if (quotaError) {
        console.error('❌ Error checking SOS quota:', quotaError);
      } else if (quota && quota.can_use === false) {
        return new Response(
          JSON.stringify({
            success: false,
            code: 'SOS_NOT_ALLOWED',
            error: quota.reason || 'Seu plano não permite o uso do SOS neste momento.',
            plan_type: quota.plan_type ?? null,
          }),
          // Subscription/quota denial is an expected application response.
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }



      // Create emergency request
      console.log('🆘 Creating emergency request for patient:', user.id);
      
      const { data: emergencyRequest, error: insertError } = await supabase
        .from('emergency_requests')
        .insert({
          patient_id: user.id,
          status: 'pending'
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error creating emergency request:', insertError);
        throw new Error(`Erro ao criar solicitação: ${insertError.message}`);
      }

      console.log('✅ Emergency request created successfully:', {
        id: emergencyRequest.id,
        patient_id: emergencyRequest.patient_id,
        status: emergencyRequest.status,
        created_at: emergencyRequest.created_at
      });

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

      // Push online psychologists' devices even if none of them has the
      // dashboard tab open — that's exactly the gap the in-app realtime
      // queue and Web Notifications can't cover on their own. Best-effort:
      // a push failure must never block SOS creation itself.
      try {
        const onlineSince = new Date(Date.now() - 3 * 60_000).toISOString();
        const { data: onlinePsychs } = await supabase
          .from('psychologist_presence')
          .select('psychologist_id')
          .gte('last_online', onlineSince);

        const onlineIds = (onlinePsychs ?? []).map((p) => p.psychologist_id);
        if (onlineIds.length > 0) {
          const { data: tokens } = await supabase
            .from('fcm_tokens')
            .select('token')
            .in('user_id', onlineIds)
            .eq('is_active', true);

          if (tokens && tokens.length > 0) {
            await supabase.functions.invoke('firebase-notifications', {
              body: {
                title: 'Nova solicitação de emergência',
                body: 'Um paciente precisa de atendimento imediato.',
                tokens: tokens.map((t) => t.token),
                data: { type: 'sos', emergency_request_id: emergencyRequest.id },
              },
            });
          }
        }
      } catch (pushError) {
        console.error('Error sending SOS push notification:', pushError);
      }

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
      // Check status of emergency request - GET requests should use URL params
      const url = new URL(req.url);
      const requestId = url.searchParams.get('request_id');

      if (!requestId) {
        return new Response(
          JSON.stringify({ 
            error: 'Request ID is required',
            message: 'Parameter request_id é obrigatório'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { data: request, error } = await supabase
        .from('emergency_requests')
        .select('*')
        .eq('id', requestId)
        .eq('patient_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching emergency request:', error.message);
        return new Response(
          JSON.stringify({ 
            error: 'Database error',
            message: 'Erro interno do servidor. Tente novamente.',
            temporary: true
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // If request doesn't exist, return success with null data
      if (!request) {
        console.log('Emergency request not found:', requestId);
        return new Response(
          JSON.stringify({ 
            success: true,
            data: null,
            message: 'Solicitação não encontrada ou foi cancelada'
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Get psychologist name if request is accepted
      let psychologistName = null;
      if (request.accepted_by) {
        const { data: psychologist } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', request.accepted_by)
          .maybeSingle();
        
        psychologistName = psychologist?.full_name || null;
      }

      return new Response(
        JSON.stringify({
          ...request,
          psychologist: psychologistName ? { full_name: psychologistName } : null
        }),
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
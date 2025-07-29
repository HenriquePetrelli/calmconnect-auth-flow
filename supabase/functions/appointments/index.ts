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

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const action = url.searchParams.get('action');

      if (action === 'psychologists') {
        // Get available psychologists
        const { data: psychologists, error } = await supabase
          .from('profiles')
          .select('user_id, full_name, specialty')
          .eq('user_type', 'psychologist')
          .eq('registration_status', 'approved');

        if (error) throw error;

        return new Response(
          JSON.stringify(psychologists),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (action === 'history') {
        // Get patient's appointment history
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '10');
        const offset = (page - 1) * limit;

        const { data: appointments, error } = await supabase
          .from('appointments')
          .select(`
            *,
            psychologist:psychologist_id(full_name, specialty)
          `)
          .eq('patient_id', user.id)
          .order('scheduled_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) throw error;

        return new Response(
          JSON.stringify(appointments),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Get upcoming appointments
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          *,
          psychologist:psychologist_id(full_name, specialty)
        `)
        .eq('patient_id', user.id)
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true });

      if (error) throw error;

      return new Response(
        JSON.stringify(appointments),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (req.method === 'POST') {
      // Create new appointment
      const { psychologist_id, scheduled_at, notes } = await req.json();

      if (!psychologist_id || !scheduled_at) {
        throw new Error('Psychologist ID and scheduled time are required');
      }

      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert({
          patient_id: user.id,
          psychologist_id,
          scheduled_at,
          notes,
          status: 'scheduled'
        })
        .select(`
          *,
          psychologist:psychologist_id(full_name, specialty, professional_email)
        `)
        .single();

      if (error) throw error;

      // TODO: Send confirmation email/SMS
      console.log('Appointment created:', appointment.id);

      return new Response(
        JSON.stringify({
          success: true,
          appointment,
          message: 'Consulta agendada com sucesso!'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  } catch (error: any) {
    console.error('Error in appointments function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
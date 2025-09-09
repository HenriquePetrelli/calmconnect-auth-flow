import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
      const url = new URL(req.url);
      const action = url.searchParams.get('action');

      if (action === 'upcoming') {
        // Get upcoming appointments for today and next 7 days
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);

        const { data: appointments, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('psychologist_id', user.id)
          .gte('scheduled_at', today.toISOString())
          .lte('scheduled_at', nextWeek.toISOString())
          .eq('status', 'scheduled')
          .order('scheduled_at', { ascending: true });

        if (error) {
          console.error('Error fetching upcoming appointments:', error);
          throw error;
        }

        // Fetch patient names separately
        const patientIds = appointments?.map(a => a.patient_id) || [];
        const { data: patients, error: patientsError } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', patientIds);

        if (patientsError) {
          console.error('Error fetching patient profiles:', patientsError);
          // Continue without patient names rather than failing
        }

        // Map patient names to appointments
        const appointmentsWithPatients = appointments?.map(appointment => ({
          ...appointment,
          patient: patients?.find(p => p.user_id === appointment.patient_id) || { full_name: 'Paciente' }
        })) || [];

        return new Response(
          JSON.stringify(appointmentsWithPatients),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (action === 'pending') {
        // Get pending appointments awaiting psychologist confirmation
        const { data: appointments, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('psychologist_id', user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching pending appointments:', error);
          throw error;
        }

        // Fetch patient names separately
        const patientIds = appointments?.map(a => a.patient_id) || [];
        const { data: patients, error: patientsError } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', patientIds);

        if (patientsError) {
          console.error('Error fetching patient profiles:', patientsError);
        }

        // Map patient names to appointments
        const appointmentsWithPatients = appointments?.map(appointment => ({
          ...appointment,
          patient: patients?.find(p => p.user_id === appointment.patient_id) || { full_name: 'Paciente' }
        })) || [];

        return new Response(
          JSON.stringify(appointmentsWithPatients),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (action === 'history') {
        // Get appointment history with pagination
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '10');
        const offset = (page - 1) * limit;

        const { data: appointments, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('psychologist_id', user.id)
          .order('scheduled_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) {
          console.error('Error fetching appointment history:', error);
          throw error;
        }

        // Fetch patient names separately
        const patientIds = appointments?.map(a => a.patient_id) || [];
        const { data: patients, error: patientsError } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', patientIds);

        if (patientsError) {
          console.error('Error fetching patient profiles:', patientsError);
        }

        // Map patient names to appointments
        const appointmentsWithPatients = appointments?.map(appointment => ({
          ...appointment,
          patient: patients?.find(p => p.user_id === appointment.patient_id) || { full_name: 'Paciente' }
        })) || [];

        // Get total count for pagination
        const { count, error: countError } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('psychologist_id', user.id);

        if (countError) {
          console.error('Error counting appointments:', countError);
          throw countError;
        }

        return new Response(
          JSON.stringify({
            appointments: appointmentsWithPatients,
            totalCount: count,
            currentPage: page,
            totalPages: Math.ceil((count || 0) / limit)
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Default: get today's appointments
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('psychologist_id', user.id)
        .gte('scheduled_at', startOfDay.toISOString())
        .lt('scheduled_at', endOfDay.toISOString())
        .order('scheduled_at', { ascending: true });

      if (error) {
        console.error('Error fetching today\'s appointments:', error);
        throw error;
      }

      // Fetch patient names separately
      const patientIds = appointments?.map(a => a.patient_id) || [];
      const { data: patients, error: patientsError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', patientIds);

      if (patientsError) {
        console.error('Error fetching patient profiles:', patientsError);
      }

      // Map patient names to appointments
      const appointmentsWithPatients = appointments?.map(appointment => ({
        ...appointment,
        patient: patients?.find(p => p.user_id === appointment.patient_id) || { full_name: 'Paciente' }
      })) || [];

      return new Response(
        JSON.stringify(appointmentsWithPatients),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (req.method === 'PUT') {
      // Update appointment status or add session summary
      const { appointmentId, status, sessionSummary } = await req.json();

      if (!appointmentId) {
        throw new Error('Appointment ID is required');
      }

      const updateData: any = {};
      if (status) updateData.status = status;
      if (sessionSummary) updateData.session_summary = sessionSummary;

      const { data: updatedAppointment, error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointmentId)
        .eq('psychologist_id', user.id) // Ensure psychologist can only update their own appointments
        .select()
        .single();

      if (error) {
        console.error('Error updating appointment:', error);
        throw error;
      }

      return new Response(
        JSON.stringify({
          success: true,
          appointment: updatedAppointment,
          message: 'Consulta atualizada com sucesso'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  } catch (error: any) {
    console.error('Error in psychologist-schedule function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
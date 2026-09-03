import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

type Block = { start_time: string; end_time: string };

const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

/** Subtracts `blocked` from each range in `ranges`, truncating/splitting as needed. */
const subtractRange = (ranges: Block[], blocked: Block): Block[] => {
  const result: Block[] = [];
  for (const r of ranges) {
    const noOverlap = blocked.end_time <= r.start_time || blocked.start_time >= r.end_time;
    if (noOverlap) {
      result.push(r);
      continue;
    }
    if (blocked.start_time > r.start_time) result.push({ start_time: r.start_time, end_time: blocked.start_time });
    if (blocked.end_time < r.end_time) result.push({ start_time: blocked.end_time, end_time: r.end_time });
  }
  return result;
};

/**
 * Server-side mirror of the same rule the patient-facing booking flow
 * already enforces (useAvailableTimeSlots / psychologistAvailability.ts):
 * a 50-minute slot is only real if it fits inside the psychologist's
 * base weekly schedule, combined with that exact date's overrides, and
 * the psychologist isn't on vacation that day. Needed here because the
 * reschedule-proposal endpoint used to accept any time the psychologist
 * (or a direct API call) sent, with no check against their own agenda.
 */
const isWithinPsychologistAvailability = async (
  supabase: ReturnType<typeof createClient>,
  psychologistId: string,
  scheduledAtISO: string
): Promise<boolean> => {
  const scheduledDate = new Date(scheduledAtISO);
  const brazilTime = new Date(scheduledDate.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const dateISO = `${brazilTime.getFullYear()}-${String(brazilTime.getMonth() + 1).padStart(2, '0')}-${String(brazilTime.getDate()).padStart(2, '0')}`;
  const dayOfWeek = brazilTime.getDay();
  const startMin = brazilTime.getHours() * 60 + brazilTime.getMinutes();
  const endMin = startMin + 50;

  const [{ data: vacation }, { data: baseRows }, { data: overrideRows }] = await Promise.all([
    supabase
      .from('psychologist_vacations')
      .select('start_date')
      .eq('psychologist_id', psychologistId)
      .lte('start_date', dateISO)
      .gte('end_date', dateISO)
      .maybeSingle(),
    supabase
      .from('psychologist_availability')
      .select('start_time, end_time')
      .eq('psychologist_id', psychologistId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_available', true),
    supabase
      .from('psychologist_availability_overrides')
      .select('start_time, end_time, type')
      .eq('psychologist_id', psychologistId)
      .eq('date', dateISO),
  ]);

  if (vacation) return false;

  let ranges: Block[] = (baseRows ?? []).map((r: any) => ({ start_time: r.start_time.slice(0, 5), end_time: r.end_time.slice(0, 5) }));
  const overrides = (overrideRows ?? []).map((r: any) => ({ start_time: r.start_time.slice(0, 5), end_time: r.end_time.slice(0, 5), type: r.type as string }));
  for (const o of overrides) {
    if (o.type === 'bloqueio') ranges = subtractRange(ranges, o);
  }
  for (const o of overrides) {
    if (o.type === 'abertura') ranges = [...ranges, { start_time: o.start_time, end_time: o.end_time }];
  }

  return ranges.some((r) => timeToMinutes(r.start_time) <= startMin && endMin <= timeToMinutes(r.end_time));
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

    // Get user profile to check user type
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('User profile not found.');
    }

    const userType = profile.user_type;

    // Only psychologists can access GET endpoints (view appointments)
    if (req.method === 'GET') {
      if (userType !== 'psychologist') {
        throw new Error('Access denied. Psychologist access required for viewing appointments.');
      }
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

  if (req.method === 'POST' || req.method === 'PUT') {
    // Handle both POST (for rescheduling) and PUT (for other updates)
    let requestBody;
    try {
      const rawBody = await req.text();
      if (!rawBody || rawBody.trim() === '') {
        // Return empty appointments array for GET-like requests without body
        console.log('Empty body received, treating as GET request');
        return new Response(
          JSON.stringify([]),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      requestBody = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('JSON parsing failed:', parseError);
      // Return empty array instead of error for parsing failures
      return new Response(
        JSON.stringify([]),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { 
      appointmentId, 
      status, 
      sessionSummary, 
      proposedScheduledAt, 
      proposalNotes,
      rescheduleResponse,
      action // New field to identify the action type
    } = requestBody;

    if (!appointmentId) {
      throw new Error('Appointment ID is required');
    }

    // Check permissions based on user type and action
    if (userType === 'patient') {
      // Patients can only respond to reschedule proposals
      if (action !== 'respond_reschedule') {
        throw new Error('Access denied. Patients can only respond to reschedule proposals.');
      }
      if (!['scheduled', 'declined'].includes(status)) {
        throw new Error('Invalid status for patient response. Must be "scheduled" or "declined".');
      }
    } else if (userType === 'psychologist') {
      // Psychologists can perform all actions, but a proposed time must
      // actually fall inside their own configured schedule.
      if (status === 'reschedule_proposed' && proposedScheduledAt) {
        const fitsSchedule = await isWithinPsychologistAvailability(supabase, user.id, proposedScheduledAt);
        if (!fitsSchedule) {
          throw new Error('O horário proposto está fora da sua agenda configurada.');
        }
      }
    } else {
      throw new Error('Access denied. Invalid user type.');
    }

    // Get appointment details for notifications
    let appointmentQuery = supabase
      .from('appointments')
      .select(`
        *,
        psychologists!inner(full_name)
      `)
      .eq('id', appointmentId);

    // Add user-specific filtering
    if (userType === 'psychologist') {
      appointmentQuery = appointmentQuery.eq('psychologist_id', user.id);
    } else if (userType === 'patient') {
      appointmentQuery = appointmentQuery.eq('patient_id', user.id);
    }

    const { data: appointment, error: appointmentError } = await appointmentQuery.single();

    if (appointmentError) {
      console.error('Error fetching appointment:', appointmentError);
      throw appointmentError;
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (sessionSummary) updateData.session_summary = sessionSummary;
    if (proposedScheduledAt) updateData.proposed_scheduled_at = proposedScheduledAt;
    if (proposalNotes) updateData.proposal_notes = proposalNotes;

    // When the patient accepts a reschedule proposal, the appointment's
    // actual scheduled_at must move to the proposed time — otherwise the
    // status flips to "scheduled" but every part of the app (call entry
    // window, "today"/"upcoming" lists, the psychologist's agenda) keeps
    // operating off the old, already-superseded time.
    if (userType === 'patient' && action === 'respond_reschedule' && status === 'scheduled' && appointment.proposed_scheduled_at) {
      updateData.scheduled_at = appointment.proposed_scheduled_at;
      updateData.proposed_scheduled_at = null;
      updateData.proposal_notes = null;
    }

    // Build update query with appropriate user filtering
    let updateQuery = supabase
      .from('appointments')
      .update(updateData)
      .eq('id', appointmentId);

    // Add user-specific filtering
    if (userType === 'psychologist') {
      updateQuery = updateQuery.eq('psychologist_id', user.id);
    } else if (userType === 'patient') {
      updateQuery = updateQuery.eq('patient_id', user.id);
    }

    const { data: updatedAppointment, error } = await updateQuery
      .select()
      .single();

    if (error) {
      console.error('Error updating appointment:', error);
      throw error;
    }

    // The appointment never happened — give the patient's monthly Premium
    // appointment slot back. It was marked used at booking time (in the
    // `appointments` function), before anyone confirmed the request; a
    // decline (by either side, direct or after a reschedule proposal)
    // must not permanently burn that slot.
    if (status === 'declined' && appointment.appointment_type === 'regular') {
      const { error: quotaError } = await supabase
        .from('subscribers')
        .update({ appointments_used_this_month: false })
        .eq('user_id', appointment.patient_id);
      if (quotaError) {
        console.error('Error releasing appointment quota:', quotaError);
        // Don't fail the request over this — the decline itself already succeeded.
      }
    }

    // Send notifications based on who made the change
    if (status && ['scheduled', 'declined', 'reschedule_proposed'].includes(status)) {
      try {
        let notificationData;
        
        if (userType === 'psychologist' && !rescheduleResponse) {
          // Psychologist action - notify patient
          notificationData = {
            patient_id: appointment.patient_id,
            appointment_id: appointmentId,
            status: status,
            psychologist_name: appointment.psychologists.full_name,
            appointment_date: new Date(appointment.scheduled_at).toLocaleString('pt-BR'),
            proposed_date: proposedScheduledAt ? new Date(proposedScheduledAt).toLocaleString('pt-BR') : null,
            proposal_notes: proposalNotes
          };
        } else if (userType === 'patient' && action === 'respond_reschedule') {
          // Patient response - notify psychologist
          notificationData = {
            psychologist_id: appointment.psychologist_id,
            appointment_id: appointmentId,
            status: status,
            patient_response: status === 'scheduled' ? 'accepted' : 'declined',
            appointment_date: new Date(appointment.scheduled_at).toLocaleString('pt-BR'),
            proposed_date: appointment.proposed_scheduled_at ? new Date(appointment.proposed_scheduled_at).toLocaleString('pt-BR') : null
          };
        }

        if (notificationData) {
          await supabase.functions.invoke('send-appointment-notification', {
            body: notificationData
          });
        }
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError);
        // Don't fail the request if notification fails
      }
    }

    // Generate appropriate success message
    let message = 'Consulta atualizada com sucesso';
    if (userType === 'psychologist') {
      if (status === 'reschedule_proposed') {
        message = 'Proposta de reagendamento enviada com sucesso';
      } else if (status === 'scheduled') {
        message = 'Consulta confirmada com sucesso';
      } else if (status === 'declined') {
        message = 'Consulta recusada com sucesso';
      }
    } else if (userType === 'patient' && action === 'respond_reschedule') {
      if (status === 'scheduled') {
        message = 'Reagendamento aceito com sucesso';
      } else if (status === 'declined') {
        message = 'Reagendamento recusado com sucesso';
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        appointment: updatedAppointment,
        message: message
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
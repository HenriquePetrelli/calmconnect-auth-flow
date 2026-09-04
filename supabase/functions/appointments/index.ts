import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
 * a 50-minute slot is only real if it fits inside the psychologist's base
 * weekly schedule, combined with that exact date's overrides, and the
 * psychologist isn't on vacation that day. Needed here because the old
 * check only validated a fixed 7h+ window (with a dead upper bound —
 * `hour >= 24` can never be true) against no one's actual agenda.
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

    // Verify user type from profile - only patients and psychologists can access appointments
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('user_id', user.id)
      .single();

    if (!profile || (profile.user_type !== 'patient' && profile.user_type !== 'psychologist')) {
      throw new Error('Access denied. Invalid user type.');
    }

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const action = url.searchParams.get('action');

      if (action === 'psychologists') {
        // Get available psychologists from psychologists table
        const { data: psychologists, error } = await supabase
          .from('psychologists')
          .select('user_id, full_name, specialization')
          .eq('approved', true)
          .eq('approval_status', 'approved');

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
            psychologists!psychologist_id(
              full_name, 
              specialization
            )
          `)
          .eq('patient_id', user.id)
          .order('scheduled_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) throw error;

        // Transform data to ensure psychologist is properly structured
        const transformedAppointments = appointments?.map(appointment => ({
          ...appointment,
          psychologist: appointment.psychologists 
            ? (Array.isArray(appointment.psychologists) 
                ? appointment.psychologists[0] 
                : appointment.psychologists)
            : null
        })) || [];

        return new Response(
          JSON.stringify(transformedAppointments),
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
          psychologists!psychologist_id(
            full_name, 
            specialization
          )
        `)
        .eq('patient_id', user.id)
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true });

      console.log('Appointments query result:', { appointments, error });
      console.log('Sample appointment:', appointments?.[0]);

      if (error) {
        console.error('Error fetching appointments:', error);
        throw error;
      }

      // Transform data to ensure psychologist is properly structured
      const transformedAppointments = appointments?.map(appointment => ({
        ...appointment,
        psychologist: appointment.psychologists 
          ? (Array.isArray(appointment.psychologists) 
              ? appointment.psychologists[0] 
              : appointment.psychologists)
          : null
      })) || [];

      console.log('Transformed appointments:', transformedAppointments);

      return new Response(
        JSON.stringify(transformedAppointments),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (req.method === 'POST') {
      // Create new appointment
      let requestBody = {};
      
      try {
        const text = await req.text();
        console.log('Request body text:', text);
        
        if (text && text.trim()) {
          requestBody = JSON.parse(text);
        } else {
          console.log('Empty request body');
        }
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        return new Response(
          JSON.stringify({ error: 'Invalid JSON format in request body' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      const { psychologist_id, scheduled_at, duration, appointment_type, notes } = requestBody;

      console.log('Received appointment data:', { psychologist_id, scheduled_at, duration, appointment_type, notes });

      // Cap how many booking attempts one patient can make in a short
      // window — nothing legitimate needs more than a handful per hour,
      // and the quota/conflict checks below still do real work per call.
      const { data: withinBookingLimit } = await supabase.rpc('check_rate_limit', {
        p_key: `appointments:${user.id}`,
        p_max_requests: 10,
        p_window_seconds: 3600,
      });
      if (withinBookingLimit === false) {
        throw new Error('Muitas tentativas de agendamento em pouco tempo. Aguarde um pouco antes de tentar novamente.');
      }

      if (!psychologist_id || !scheduled_at) {
        throw new Error('Psychologist ID and scheduled time are required');
      }

      // Validate appointment_type
      const validTypes = ['regular', 'emergency'];
      const finalAppointmentType = appointment_type && validTypes.includes(appointment_type) ? appointment_type : 'regular';

      console.log('Final appointment type:', finalAppointmentType);

      // Enforce the Premium-only, 1x/month scheduling quota server-side —
      // the client-side gate (subscriptionTier === 'Premium') can be
      // bypassed by calling this endpoint directly, so it must never be the
      // only check. Mirrors the same-month reset used for the SOS quota.
      let subscriberRow: { subscription_tier: string | null; appointments_used_this_month: boolean; appointments_last_used: string | null } | null = null;
      if (finalAppointmentType === 'regular') {
        const { data: subRow } = await supabase
          .from('subscribers')
          .select('subscription_tier, appointments_used_this_month, appointments_last_used')
          .eq('user_id', user.id)
          .maybeSingle();
        subscriberRow = subRow;

        if (subscriberRow?.subscription_tier !== 'Premium') {
          throw new Error('O agendamento de consultas está disponível apenas para o plano Premium.');
        }

        const lastUsed = subscriberRow.appointments_last_used ? new Date(subscriberRow.appointments_last_used) : null;
        const nowForQuota = new Date();
        const sameMonth = lastUsed
          ? lastUsed.getUTCFullYear() === nowForQuota.getUTCFullYear() && lastUsed.getUTCMonth() === nowForQuota.getUTCMonth()
          : false;

        if (subscriberRow.appointments_used_this_month && sameMonth) {
          throw new Error('Limite mensal de consultas agendadas já utilizado (PREMIUM: 1x/mês).');
        }
      }

      // Check for scheduling conflicts - prevent overlapping appointments
      // A 50-minute appointment starting at scheduled_at will end 50 minutes later
      const appointmentStart = new Date(scheduled_at);
      const appointmentEnd = new Date(appointmentStart.getTime() + 50 * 60 * 1000); // 50 minutes later
      
      // Check if there are any existing appointments that would overlap
      const { data: conflictingAppointments, error: conflictError } = await supabase
        .from('appointments')
        .select('id, scheduled_at, duration')
        .eq('psychologist_id', psychologist_id)
        .in('status', ['pending', 'scheduled'])
        .gte('scheduled_at', new Date(appointmentStart.getTime() - 50 * 60 * 1000).toISOString()) // Check 50 minutes before
        .lte('scheduled_at', appointmentEnd.toISOString()); // Check until our appointment ends

      if (conflictError) {
        console.error('Error checking conflicts:', conflictError);
        throw new Error('Erro ao verificar conflitos de horário');
      }

      // Check if any existing appointment would overlap with the new one
      if (conflictingAppointments && conflictingAppointments.length > 0) {
        for (const existingAppointment of conflictingAppointments) {
          const existingStart = new Date(existingAppointment.scheduled_at);
          const existingEnd = new Date(existingStart.getTime() + (existingAppointment.duration || 50) * 60 * 1000);
          
          // Check if there's any overlap
          if (
            (appointmentStart >= existingStart && appointmentStart < existingEnd) ||
            (appointmentEnd > existingStart && appointmentEnd <= existingEnd) ||
            (appointmentStart <= existingStart && appointmentEnd >= existingEnd)
          ) {
            throw new Error('Este horário já está ocupado. Escolha outro horário disponível.');
          }
        }
      }

      // Advance booking rule removed - allow immediate scheduling
      const scheduledDate = new Date(scheduled_at);

      // 10-minute interval check (Brazil timezone) — kept separate from the
      // agenda check below since it's a pure formatting rule, not tied to
      // any one psychologist.
      const brazilTime = new Date(scheduledDate.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
      const minutes = brazilTime.getMinutes();

      if (minutes % 10 !== 0) {
        throw new Error('Consultas só podem ser agendadas em intervalos de 10 minutos (ex: 08:00, 08:10, 08:20, etc.).');
      }

      // Real agenda check — the old rule only validated a fixed 7h+ window
      // (with a dead upper bound: hour >= 24 can never be true), accepting
      // any time on any day for any psychologist regardless of what they
      // actually configured. The client (useAvailableTimeSlots) already
      // only shows real slots, but this endpoint is callable directly.
      const fitsSchedule = await isWithinPsychologistAvailability(supabase, psychologist_id, scheduled_at);
      if (!fitsSchedule) {
        throw new Error('Esse horário não está disponível na agenda do psicólogo selecionado.');
      }

      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert({
          patient_id: user.id,
          psychologist_id,
          scheduled_at,
          duration: 50, // Fixed 50-minute duration
          appointment_type: finalAppointmentType,
          notes,
          status: 'pending' // Start as pending, waiting for psychologist confirmation
        })
        .select(`
          *,
          psychologists!psychologist_id(
            full_name, 
            specialization
          )
        `)
        .single();

      if (error) throw error;

      if (finalAppointmentType === 'regular') {
        await supabase
          .from('subscribers')
          .update({ appointments_used_this_month: true, appointments_last_used: new Date().toISOString() })
          .eq('user_id', user.id);
      }

      // Transform appointment to ensure psychologist is properly structured
      const transformedAppointment = {
        ...appointment,
        psychologist: appointment.psychologists 
          ? (Array.isArray(appointment.psychologists) 
              ? appointment.psychologists[0] 
              : appointment.psychologists)
          : null
      };

      // TODO: Send confirmation email/SMS
      // Removed sensitive logging for security

      return new Response(
        JSON.stringify({
          success: true,
          appointment: transformedAppointment,
          message: 'Consulta solicitada com sucesso! Aguardando confirmação do psicólogo.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  } catch (error: any) {
    console.error('Error in appointments function:', error.message);
    const msg = error?.message || 'Erro interno';
    // Validation/business errors → 400/409 (not 500)
    const isConflict = /ocupado/i.test(msg);
    const isValidation = /obrigat|inválid|intervalo|entre 07h|10 minutos|required/i.test(msg);
    const status = isConflict ? 409 : isValidation ? 400 : 500;
    return new Response(
      JSON.stringify({ error: msg }),
      {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
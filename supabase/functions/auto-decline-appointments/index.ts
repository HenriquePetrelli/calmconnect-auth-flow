import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Pedidos sem resposta: pendentes há mais de 24h OU cujo horário já
    // chegou (com 2h de antecedência mínima, um pedido pode vencer antes das
    // 24h e ficava "Aguardando confirmação" depois do horário). Propostas de
    // novo horário sem resposta do paciente vencem quando o horário proposto
    // chega.
    const nowISO = new Date().toISOString();
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const [pendingResult, proposalResult] = await Promise.all([
      supabase
        .from('appointments')
        .select('id, patient_id, scheduled_at, psychologist_id, appointment_type')
        .eq('status', 'pending')
        .or(`created_at.lt.${twentyFourHoursAgo.toISOString()},scheduled_at.lte.${nowISO}`),
      supabase
        .from('appointments')
        .select('id, patient_id, scheduled_at, psychologist_id, appointment_type, proposed_scheduled_at')
        .eq('status', 'reschedule_proposed')
        .or(`proposed_scheduled_at.lte.${nowISO},and(proposed_scheduled_at.is.null,scheduled_at.lte.${nowISO})`),
    ]);

    const selectError = pendingResult.error ?? proposalResult.error;
    if (selectError) {
      console.error('Error selecting expired appointments:', selectError);
      throw selectError;
    }
    const expiredAppointments = [...(pendingResult.data ?? []), ...(proposalResult.data ?? [])];

    if (expiredAppointments && expiredAppointments.length > 0) {
      console.log(`Found ${expiredAppointments.length} expired pending appointments`);

      // Atualizar status para declined
      const { data: updatedAppointments, error: updateError } = await supabase
        .from('appointments')
        .update({ status: 'declined' })
        .in('id', expiredAppointments.map(a => a.id))
        .select();

      if (updateError) {
        console.error('Error updating expired appointments:', updateError);
        throw updateError;
      }

      // These requests expired unanswered — nobody ever confirmed them, so
      // the patient's monthly Premium appointment slot (marked used at
      // booking time) must come back, same as an explicit decline.
      const patientIdsToRelease = [
        ...new Set(
          expiredAppointments
            .filter((a) => a.appointment_type === 'regular')
            .map((a) => a.patient_id)
        ),
      ];
      if (patientIdsToRelease.length > 0) {
        const { error: quotaError } = await supabase
          .from('subscribers')
          .update({ appointments_used_this_month: false })
          .in('user_id', patientIdsToRelease);
        if (quotaError) {
          console.error('Error releasing appointment quota for expired appointments:', quotaError);
        }
      }

      console.log(`Updated ${updatedAppointments?.length || 0} appointments to declined`);

      // A manual decline already notifies the patient (in-app + email) via
      // send-appointment-notification. An appointment that just times out
      // unanswered deserves the exact same courtesy — otherwise the patient
      // only finds out by checking the app themselves.
      try {
        const psychologistIds = [...new Set(expiredAppointments.map((a) => a.psychologist_id))];
        const { data: psychologists } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', psychologistIds);

        const nameByPsychologistId = new Map(
          (psychologists ?? []).map((p) => [p.user_id, p.full_name])
        );

        for (const appointment of expiredAppointments) {
          try {
            await supabase.functions.invoke('send-appointment-notification', {
              body: {
                patient_id: appointment.patient_id,
                appointment_id: appointment.id,
                status: 'declined',
                psychologist_name: nameByPsychologistId.get(appointment.psychologist_id) || 'o psicólogo',
                appointment_date: new Date(appointment.scheduled_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
              },
            });
          } catch (notificationError) {
            console.error(`Error notifying patient for appointment ${appointment.id}:`, notificationError);
          }
        }
      } catch (notificationBatchError) {
        console.error('Error notifying patients of auto-declined appointments:', notificationBatchError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          processed: updatedAppointments?.length || 0,
          appointments: updatedAppointments
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      console.log('No expired pending appointments found');
      
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          message: 'No expired pending appointments found'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

  } catch (error: any) {
    console.error('Error in auto-decline-appointments function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
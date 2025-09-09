import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      patient_id, 
      appointment_id, 
      status, 
      psychologist_name,
      appointment_date,
      proposed_date = null,
      proposal_notes = null 
    } = await req.json();

    console.log('Sending notification for appointment:', appointment_id, 'status:', status);

    // Get patient data from profiles
    const { data: patient, error: patientError } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .eq('user_id', patient_id)
      .maybeSingle();

    if (patientError) {
      console.error('Error fetching patient:', patientError);
      throw patientError;
    }

    // Get user email from auth.users
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(patient_id);
    
    if (userError) {
      console.error('Error fetching user:', userError);
      throw userError;
    }

    let title, message, emailSubject, emailContent;

    switch (status) {
      case 'scheduled':
        title = 'Consulta Confirmada';
        message = `Sua consulta com ${psychologist_name} foi confirmada para ${appointment_date}.`;
        emailSubject = 'Consulta confirmada - Soliv';
        emailContent = `
          <h2>Consulta Confirmada</h2>
           <p>Olá ${patient?.full_name || 'Paciente'},</p>
          <p>Sua consulta foi confirmada!</p>
          <ul>
            <li><strong>Psicólogo:</strong> ${psychologist_name}</li>
            <li><strong>Data:</strong> ${appointment_date}</li>
          </ul>
          <p>Prepare-se para sua sessão e lembre-se de estar em um ambiente tranquilo.</p>
          <p>Atenciosamente,<br>Equipe Soliv</p>
        `;
        break;
      
      case 'declined':
        title = 'Consulta Recusada';
        message = `Sua consulta com ${psychologist_name} foi recusada. Você pode agendar com outro profissional.`;
        emailSubject = 'Consulta recusada - Soliv';
        emailContent = `
          <h2>Consulta Recusada</h2>
           <p>Olá ${patient?.full_name || 'Paciente'},</p>
          <p>Infelizmente sua consulta agendada para ${appointment_date} com ${psychologist_name} foi recusada.</p>
          <p>Não se preocupe! Você pode agendar uma nova consulta com outro psicólogo disponível em nossa plataforma.</p>
          <p>Atenciosamente,<br>Equipe Soliv</p>
        `;
        break;
      
      case 'reschedule_proposed':
        title = 'Nova Proposta de Horário';
        message = `${psychologist_name} sugeriu um novo horário: ${proposed_date}. ${proposal_notes || ''}`;
        emailSubject = 'Nova proposta de horário - Soliv';
        emailContent = `
          <h2>Nova Proposta de Horário</h2>
          <p>Olá ${patient?.full_name || 'Paciente'},</p>
          <p>O psicólogo ${psychologist_name} não pôde confirmar sua consulta para ${appointment_date}, mas sugeriu um novo horário:</p>
          <ul>
            <li><strong>Novo horário proposto:</strong> ${proposed_date}</li>
            ${proposal_notes ? `<li><strong>Observações:</strong> ${proposal_notes}</li>` : ''}
          </ul>
          <p>Acesse o aplicativo para aceitar ou recusar esta proposta.</p>
          <p>Atenciosamente,<br>Equipe Soliv</p>
        `;
        break;
      
      default:
        throw new Error('Invalid status for notification');
    }

    // Create in-app notification
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        patient_id,
        appointment_id,
        title,
        message,
        status: 'unread'
      });

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
      throw notificationError;
    }

    // Send email notification
    const { error: emailError } = await resend.emails.send({
      from: 'Soliv <notifications@soliv.app>',
      to: [user.user.email],
      subject: emailSubject,
      html: emailContent,
    });

    if (emailError) {
      console.error('Error sending email:', emailError);
      // Don't throw error - notification was created successfully
    }

    console.log('Notification sent successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification sent successfully' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in send-appointment-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
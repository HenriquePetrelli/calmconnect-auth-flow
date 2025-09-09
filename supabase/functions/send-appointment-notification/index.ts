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
    psychologist_id, 
    appointment_id, 
    status, 
    psychologist_name,
    appointment_date,
    proposed_date = null,
    proposal_notes = null,
    patient_response = null
  } = await req.json();

  console.log('Sending notification for appointment:', appointment_id, 'status:', status);

  let recipientId, recipientProfile, recipientEmail;

  // Determine who should receive the notification
  if (psychologist_id) {
    // Notification for psychologist
    recipientId = psychologist_id;
    
    // Get psychologist data from profiles
    const { data: psychologist, error: psychologistError } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .eq('user_id', psychologist_id)
      .maybeSingle();

    if (psychologistError) {
      console.error('Error fetching psychologist:', psychologistError);
      throw psychologistError;
    }
    
    recipientProfile = psychologist;
  } else {
    // Notification for patient
    recipientId = patient_id;
    
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
    
    recipientProfile = patient;
  }

  // Get user email from auth.users
  const { data: user, error: userError } = await supabase.auth.admin.getUserById(recipientId);
  
  if (userError) {
    console.error('Error fetching user:', userError);
    throw userError;
  }

  recipientEmail = user.user.email;

  let title, message, emailSubject, emailContent;

  if (psychologist_id) {
    // Notifications for psychologist
    switch (status) {
      case 'scheduled':
        title = 'Reagendamento Aceito';
        message = `O paciente aceitou sua proposta de reagendamento para ${proposed_date}.`;
        emailSubject = 'Reagendamento aceito - Soliv';
        emailContent = `
          <h2>Reagendamento Aceito</h2>
          <p>Olá ${recipientProfile?.full_name || 'Doutor(a)'},</p>
          <p>O paciente aceitou sua proposta de reagendamento.</p>
          <ul>
            <li><strong>Nova data confirmada:</strong> ${proposed_date}</li>
          </ul>
          <p>A consulta está confirmada para o novo horário.</p>
          <p>Atenciosamente,<br>Equipe Soliv</p>
        `;
        break;
      
      case 'declined':
        title = 'Reagendamento Recusado';
        message = `O paciente recusou sua proposta de reagendamento.`;
        emailSubject = 'Reagendamento recusado - Soliv';
        emailContent = `
          <h2>Reagendamento Recusado</h2>
          <p>Olá ${recipientProfile?.full_name || 'Doutor(a)'},</p>
          <p>Infelizmente o paciente recusou sua proposta de reagendamento para ${proposed_date}.</p>
          <p>A consulta foi cancelada definitivamente.</p>
          <p>Atenciosamente,<br>Equipe Soliv</p>
        `;
        break;
      
      default:
        throw new Error('Invalid status for psychologist notification');
    }
  } else {
    // Notifications for patient
    switch (status) {
      case 'scheduled':
        title = 'Consulta Confirmada';
        message = `Sua consulta com ${psychologist_name} foi confirmada para ${appointment_date}.`;
        emailSubject = 'Consulta confirmada - Soliv';
        emailContent = `
          <h2>Consulta Confirmada</h2>
           <p>Olá ${recipientProfile?.full_name || 'Paciente'},</p>
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
           <p>Olá ${recipientProfile?.full_name || 'Paciente'},</p>
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
          <p>Olá ${recipientProfile?.full_name || 'Paciente'},</p>
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
        throw new Error('Invalid status for patient notification');
    }
  }

  // Create in-app notification
  const notificationData: any = {
    appointment_id,
    title,
    message,
    status: 'unread'
  };

  // Add recipient based on who should receive the notification
  if (psychologist_id) {
    // For psychologists, we need to add psychologist_id field or use a different table
    // Since notifications table is for patients, we'll skip in-app notification for psychologists for now
    // and just send email
  } else {
    notificationData.patient_id = patient_id;
    
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert(notificationData);

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
      throw notificationError;
    }
  }

  // Send email notification
  const { error: emailError } = await resend.emails.send({
    from: 'Soliv <notifications@soliv.app>',
    to: [recipientEmail],
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
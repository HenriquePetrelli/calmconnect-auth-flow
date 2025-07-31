import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize clients
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

interface ApproveRequest {
  userId: string;
}

interface RejectRequest {
  userId: string;
  reason: string;
}

// Email templates
const generateApprovalEmailTemplate = (fullName: string) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #10b981;">✅ Cadastro Aprovado - CalmConnect</h2>
    <p>Olá <strong>${fullName}</strong>,</p>
    <p>Temos o prazer de informar que seu cadastro como psicólogo(a) na plataforma CalmConnect foi <strong>aprovado</strong>!</p>
    <p>Agora você pode fazer login e começar a atender pacientes através da nossa plataforma.</p>
    <div style="margin: 20px 0; padding: 15px; background-color: #f0fdf4; border-left: 4px solid #10b981;">
      <p><strong>Próximos passos:</strong></p>
      <ol>
        <li>Faça login na plataforma</li>
        <li>Complete seu perfil profissional</li>
        <li>Configure sua agenda de atendimentos</li>
        <li>Comece a receber pacientes</li>
      </ol>
    </div>
    <p>Bem-vindo(a) à nossa equipe!</p>
    <p>Atenciosamente,<br>Equipe CalmConnect</p>
  </div>
`;

const generateRejectionEmailTemplate = (fullName: string, reason: string) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #ef4444;">❌ Cadastro Não Aprovado - CalmConnect</h2>
    <p>Olá <strong>${fullName}</strong>,</p>
    <p>Infelizmente, não foi possível aprovar seu cadastro como psicólogo(a) na plataforma CalmConnect.</p>
    <div style="margin: 20px 0; padding: 15px; background-color: #fef2f2; border-left: 4px solid #ef4444;">
      <p><strong>Motivo:</strong></p>
      <p>${reason}</p>
    </div>
    <p>Caso tenha dúvidas ou deseje esclarecer informações, entre em contato conosco.</p>
    <p>Atenciosamente,<br>Equipe CalmConnect</p>
  </div>
`;

// Validation functions
const validateInput = (data: any, requiredFields: string[]) => {
  for (const field of requiredFields) {
    if (!data[field]) {
      throw new Error(`Campo obrigatório: ${field}`);
    }
  }
};

const validateUUID = (uuid: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Check if user is super admin
const checkSuperAdminPermission = async (authHeader: string) => {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Token de autorização inválido');
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) {
    throw new Error('Usuário não autenticado');
  }

  const isSuperAdmin = user.user_metadata?.is_super_admin === true;
  if (!isSuperAdmin) {
    throw new Error('Acesso negado. Privilégios de super admin requeridos.');
  }

  return user;
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    const adminUser = await checkSuperAdminPermission(authHeader);
    
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const userId = url.searchParams.get('userId');

    // List pending registrations
    if (req.method === 'GET' && action === 'pending') {
      const { data: registrations, error } = await supabaseAdmin
        .from('psychologist_registrations')
        .select(`
          *,
          profiles!psychologist_registrations_user_id_fkey(
            full_name,
            professional_email,
            cpf,
            crp,
            specialty
          )
        `)
        .eq('status', 'pending')
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify({ 
        success: true, 
        data: registrations 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Get specific registration details
    if (req.method === 'GET' && userId) {
      if (!validateUUID(userId)) {
        throw new Error('ID de usuário inválido');
      }

      const { data: registration, error } = await supabaseAdmin
        .from('psychologist_registrations')
        .select(`
          *,
          profiles!psychologist_registrations_user_id_fkey(
            full_name,
            professional_email,
            cpf,
            crp,
            specialty
          )
        `)
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        data: registration
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Approve psychologist
    if (req.method === 'POST' && action === 'approve') {
      const requestData: ApproveRequest = await req.json();
      validateInput(requestData, ['userId']);

      if (!validateUUID(requestData.userId)) {
        throw new Error('ID de usuário inválido');
      }

      // Get psychologist data
      const { data: registration, error: getError } = await supabaseAdmin
        .from('psychologist_registrations')
        .select(`
          *,
          profiles!psychologist_registrations_user_id_fkey(
            full_name,
            professional_email
          )
        `)
        .eq('user_id', requestData.userId)
        .eq('status', 'pending')
        .single();

      if (getError || !registration) {
        throw new Error('Cadastro não encontrado ou já processado');
      }

      // Update registration status
      const { error: updateRegError } = await supabaseAdmin
        .from('psychologist_registrations')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminUser.id
        })
        .eq('user_id', requestData.userId);

      if (updateRegError) throw updateRegError;

      // Update user metadata to mark as approved
      const { error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(
        requestData.userId,
        {
          user_metadata: {
            account_status: 'approved',
            approved_at: new Date().toISOString(),
            approved_by: adminUser.id
          }
        }
      );

      if (updateUserError) throw updateUserError;

      // Send approval email
      try {
        await resend.emails.send({
          from: 'CalmConnect <onboarding@resend.dev>',
          to: [registration.profiles.professional_email],
          subject: '✅ Cadastro Aprovado - CalmConnect',
          html: generateApprovalEmailTemplate(registration.profiles.full_name),
        });
      } catch (emailError) {
        console.error('Erro ao enviar email de aprovação:', emailError);
        // Don't fail the approval if email fails
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Psicólogo aprovado com sucesso'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Reject psychologist
    if (req.method === 'POST' && action === 'reject') {
      const requestData: RejectRequest = await req.json();
      validateInput(requestData, ['userId', 'reason']);

      if (!validateUUID(requestData.userId)) {
        throw new Error('ID de usuário inválido');
      }

      // Get psychologist data
      const { data: registration, error: getError } = await supabaseAdmin
        .from('psychologist_registrations')
        .select(`
          *,
          profiles!psychologist_registrations_user_id_fkey(
            full_name,
            professional_email
          )
        `)
        .eq('user_id', requestData.userId)
        .eq('status', 'pending')
        .single();

      if (getError || !registration) {
        throw new Error('Cadastro não encontrado ou já processado');
      }

      // Send rejection email before deletion
      try {
        await resend.emails.send({
          from: 'CalmConnect <onboarding@resend.dev>',
          to: [registration.profiles.professional_email],
          subject: '❌ Cadastro Não Aprovado - CalmConnect',
          html: generateRejectionEmailTemplate(registration.profiles.full_name, requestData.reason),
        });
      } catch (emailError) {
        console.error('Erro ao enviar email de rejeição:', emailError);
        // Continue with rejection even if email fails
      }

      // Delete registration record
      const { error: deleteRegError } = await supabaseAdmin
        .from('psychologist_registrations')
        .delete()
        .eq('user_id', requestData.userId);

      if (deleteRegError) throw deleteRegError;

      // Delete user completely
      const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(
        requestData.userId
      );

      if (deleteUserError) throw deleteUserError;

      return new Response(JSON.stringify({
        success: true,
        message: 'Psicólogo rejeitado e dados removidos com sucesso'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Invalid request
    return new Response(JSON.stringify({
      success: false,
      error: 'Ação não reconhecida'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Erro na função:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Erro interno do servidor'
    }), {
      status: error.message?.includes('Acesso negado') ? 403 : 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

serve(handler);
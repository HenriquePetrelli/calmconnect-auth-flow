import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const resendKey = Deno.env.get('RESEND_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseKey);
const resend = new Resend(resendKey);

interface PsychologistRegistration {
  user_id: string;
  full_name: string;
  cpf?: string;
  email: string;
  crp_number: string;
  specialization?: string;
  bio?: string;
  state?: string;
  city?: string;
  address?: string;
  document_url?: string;
  documents?: string[];
}

interface ApprovalRequest {
  psychologist_id: string;
  admin_user_id: string;
}

interface RejectionRequest extends ApprovalRequest {
  rejection_reason?: string;
}

const generateApprovalEmail = (name: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Cadastro Aprovado - Soliv</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #4CAF50;">Parabéns! Seu cadastro foi aprovado!</h1>
    
    <p>Olá, ${name}!</p>
    
    <p>Temos o prazer de informar que seu cadastro como psicólogo na plataforma Soliv foi <strong>aprovado</strong>!</p>
    
    <p>Agora você pode:</p>
    <ul>
      <li>Acessar o painel do psicólogo</li>
      <li>Configurar sua disponibilidade</li>
      <li>Atender consultas de emergência</li>
      <li>Agendar consultas com pacientes</li>
    </ul>
    
    <p>Seja bem-vindo à nossa equipe!</p>
    
    <p>Atenciosamente,<br>Equipe Soliv</p>
  </div>
</body>
</html>
`;

const generateRejectionEmail = (name: string, reason?: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Cadastro não aprovado - Soliv</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #f44336;">Cadastro não aprovado</h1>
    
    <p>Olá, ${name}!</p>
    
    <p>Infelizmente, seu cadastro como psicólogo na plataforma Soliv não foi aprovado neste momento.</p>
    
    ${reason ? `<p><strong>Motivo:</strong> ${reason}</p>` : ''}
    
    <p>Você pode tentar se cadastrar novamente após verificar e corrigir as informações necessárias.</p>
    
    <p>Se tiver dúvidas, entre em contato conosco.</p>
    
    <p>Atenciosamente,<br>Equipe Soliv</p>
  </div>
</body>
</html>
`;

const generatePendingEmail = (name: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Cadastro recebido - Soliv</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #2196F3;">Cadastro recebido com sucesso!</h1>
    
    <p>Olá, ${name}!</p>
    
    <p>Recebemos seu cadastro como psicólogo na plataforma Soliv.</p>
    
    <p>Seus dados estão sendo analisados por nossa equipe. Você receberá uma resposta em até 48 horas.</p>
    
    <p>Obrigado por seu interesse em fazer parte da nossa plataforma!</p>
    
    <p>Atenciosamente,<br>Equipe Soliv</p>
  </div>
</body>
</html>
`;

const validateInput = (data: any, requiredFields: string[]) => {
  for (const field of requiredFields) {
    if (!data[field]) {
      throw new Error(`Campo obrigatório ausente: ${field}`);
    }
  }
};

const checkSuperAdminPermission = async (userId: string) => {
  const { data, error } = await supabase.rpc('is_super_admin', { user_id_param: userId });
  if (error) throw new Error('Erro ao verificar permissões');
  return data === true;
};

const handler = async (req: Request): Promise<Response> => {
  console.log('Recebida requisição:', req.method, new URL(req.url).pathname);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Token de autorização ausente');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Token inválido');
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // Registrar novo psicólogo
    if (req.method === 'POST' && action === 'register') {
      const registrationData: PsychologistRegistration = await req.json();
      
      validateInput(registrationData, ['user_id', 'full_name', 'email', 'crp_number']);
      
      // Verificar se usuário já está cadastrado
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('user_id', registrationData.user_id)
        .single();
      
      if (existingProfile?.user_type === 'patient') {
        throw new Error('Usuários já cadastrados como pacientes não podem se registrar como psicólogos');
      }
      
      // Verificar duplicidade de CRP
      const { data: existingCrp } = await supabase
        .from('psychologists')
        .select('id')
        .eq('crp_number', registrationData.crp_number)
        .single();
      
      if (existingCrp) {
        throw new Error('CRP já cadastrado no sistema');
      }
      
      // Verificar duplicidade de email
      const { data: existingEmail } = await supabase
        .from('psychologists')
        .select('id')
        .eq('email', registrationData.email)
        .single();
      
      if (existingEmail) {
        throw new Error('Email já cadastrado no sistema');
      }

      // Verificar duplicidade de CPF se fornecido
      if (registrationData.cpf) {
        const { data: existingCpf } = await supabase
          .from('psychologists')
          .select('id')
          .eq('cpf', registrationData.cpf)
          .single();
        
        if (existingCpf) {
          throw new Error('CPF já cadastrado no sistema');
        }
      }
      
      // Inserir registro
      const { professional_email, ...insertData } = registrationData as any;
      const { data, error } = await supabase
        .from('psychologists')
        .insert([insertData])
        .select()
        .single();
      
      if (error) throw error;

      // Criar entrada na tabela psychologist_registrations
      const { error: regError } = await supabase
        .from('psychologist_registrations')
        .insert({
          user_id: registrationData.user_id,
          status: 'pending',
          submitted_at: new Date().toISOString()
        });

      if (regError) {
        console.error('Erro ao criar registro de aprovação:', regError);
        // Não vamos falhar a operação por isso, apenas logar
      }
      
      // Enviar email de confirmação
      await resend.emails.send({
        from: 'Soliv <onboarding@resend.dev>',
        to: [registrationData.email],
        subject: 'Cadastro recebido - Soliv',
        html: generatePendingEmail(registrationData.full_name),
      });
      
      console.log('Psicólogo registrado com sucesso:', data.id);
      
      return new Response(JSON.stringify({ 
        success: true, 
        data: data,
        message: 'Cadastro realizado com sucesso! Você receberá um email com atualizações.' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      });
    }

    // Verificar permissões de admin para outras operações
    const isAdmin = await checkSuperAdminPermission(user.id);
    if (!isAdmin) {
      throw new Error('Acesso negado. Apenas administradores podem realizar esta operação.');
    }

    // Buscar psicólogos pendentes
    if (req.method === 'GET' && action === 'pending') {
      const { data, error } = await supabase
        .from('psychologists')
        .select(`
          id,
          full_name,
          email,
          crp_number,
          specialization,
          bio,
          submitted_at,
          documents,
          approval_status
        `)
        .eq('approval_status', 'pending')
        .order('submitted_at', { ascending: true });
      
      if (error) throw error;
      
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar todos os psicólogos
    if (req.method === 'GET' && action === 'all') {
      const { data, error } = await supabase
        .from('psychologists')
        .select(`
          id,
          full_name,
          email,
          cpf,
          crp_number,
          specialization,
          bio,
          state,
          document_url,
          submitted_at,
          documents,
          approval_status
        `)
        .order('submitted_at', { ascending: false });
      
      if (error) throw error;
      
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar psicólogo específico
    if (req.method === 'GET' && url.searchParams.get('id')) {
      const psychologistId = url.searchParams.get('id');
      
      const { data, error } = await supabase
        .from('psychologists')
        .select('*')
        .eq('id', psychologistId)
        .single();
      
      if (error) throw error;
      
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Aprovar psicólogo
    if (req.method === 'POST' && action === 'approve') {
      const { psychologist_id, admin_user_id }: ApprovalRequest = await req.json();
      
      validateInput({ psychologist_id, admin_user_id }, ['psychologist_id', 'admin_user_id']);
      
      // Buscar dados do psicólogo antes da aprovação
      const { data: psychologist, error: fetchError } = await supabase
        .from('psychologists')
        .select('*')
        .eq('id', psychologist_id)
        .single();
      
      if (fetchError || !psychologist) {
        throw new Error('Psicólogo não encontrado');
      }
      
      // Usar função RPC para aprovação
      const { error: approvalError } = await supabase.rpc('handle_psychologist_approval', {
        psychologist_id: psychologist_id,
        admin_id: admin_user_id
      });
      
      if (approvalError) throw approvalError;
      
      // Enviar email de aprovação
      await resend.emails.send({
        from: 'Soliv <onboarding@resend.dev>',
        to: [psychologist.email],
        subject: 'Cadastro aprovado - Soliv',
        html: generateApprovalEmail(psychologist.full_name),
      });
      
      console.log('Psicólogo aprovado com sucesso:', psychologist_id);
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Psicólogo aprovado com sucesso!' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rejeitar psicólogo
    if (req.method === 'POST' && action === 'reject') {
      const { psychologist_id, admin_user_id, rejection_reason }: RejectionRequest = await req.json();
      
      validateInput({ psychologist_id, admin_user_id }, ['psychologist_id', 'admin_user_id']);
      
      // Buscar dados do psicólogo antes da rejeição
      const { data: psychologist, error: fetchError } = await supabase
        .from('psychologists')
        .select('*')
        .eq('id', psychologist_id)
        .single();
      
      if (fetchError || !psychologist) {
        throw new Error('Psicólogo não encontrado');
      }
      
      // Usar função RPC para rejeição
      const { error: rejectionError } = await supabase.rpc('handle_psychologist_rejection', {
        psychologist_id: psychologist_id,
        admin_id: admin_user_id,
        rejection_reason: rejection_reason || null
      });
      
      if (rejectionError) throw rejectionError;
      
      // Enviar email de rejeição
      await resend.emails.send({
        from: 'Soliv <onboarding@resend.dev>',
        to: [psychologist.email],
        subject: 'Cadastro não aprovado - Soliv',
        html: generateRejectionEmail(psychologist.full_name, rejection_reason),
      });
      
      console.log('Psicólogo rejeitado:', psychologist_id);
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Psicólogo rejeitado com sucesso!' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      error: 'Ação não encontrada' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });

  } catch (error: any) {
    console.error('Erro na função:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Erro interno do servidor' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
};

serve(handler);
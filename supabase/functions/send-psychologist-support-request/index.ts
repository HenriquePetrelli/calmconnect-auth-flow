import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PsychologistSupportRequest {
  email_retorno: string;
  telefone_retorno?: string;
  descricao: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email_retorno, telefone_retorno, descricao }: PsychologistSupportRequest = await req.json();

    if (!email_retorno || !descricao) {
      return new Response(
        JSON.stringify({ error: "Email e descrição são obrigatórios" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header missing" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Each send costs a real email via Resend and creates a ticket for a
    // human to read — cap how many a session can fire off.
    const { data: withinLimit } = await supabase.rpc('check_rate_limit', {
      p_key: `support-request:${user.id}`,
      p_max_requests: 3,
      p_window_seconds: 3600,
    });
    if (withinLimit === false) {
      return new Response(
        JSON.stringify({ error: "Muitas solicitações em pouco tempo. Aguarde antes de enviar outra." }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Save support ticket to database
    const { data: ticket, error: dbError } = await supabase
      .from('suporte_psicologo')
      .insert({
        psicologo_id: user.id,
        email_retorno: email_retorno,
        telefone_retorno: telefone_retorno || null,
        descricao: descricao
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(
        JSON.stringify({ error: "Erro ao salvar solicitação" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get psychologist info for better identification
    const { data: psychologist } = await supabase
      .from('psychologists')
      .select('full_name, crp_number')
      .eq('user_id', user.id)
      .single();

    // Send email to support team
    const emailResponse = await resend.emails.send({
      from: "Soliv Support <noreply@soliv.app>",
      to: ["soliv.suporte@gmail.com"],
      subject: "Nova Solicitação de Suporte - Psicólogo - Ticket #" + ticket.id.substring(0, 8),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
            Nova Solicitação de Suporte - Psicólogo
          </h2>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #495057;">Informações do Psicólogo:</h3>
            <p><strong>ID do Ticket:</strong> ${ticket.id}</p>
            <p><strong>ID do Usuário:</strong> ${user.id}</p>
            <p><strong>Nome:</strong> ${psychologist?.full_name || 'Não informado'}</p>
            <p><strong>CRP:</strong> ${psychologist?.crp_number || 'Não informado'}</p>
            <p><strong>Email:</strong> ${email_retorno}</p>
            ${telefone_retorno ? `<p><strong>Telefone:</strong> ${telefone_retorno}</p>` : ''}
            <p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
          </div>
          
          <div style="background-color: #fff; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px;">
            <h3 style="margin-top: 0; color: #495057;">Descrição do Problema:</h3>
            <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #007bff; font-style: italic;">
              ${descricao.replace(/\n/g, '<br>')}
            </div>
          </div>
          
          <div style="margin-top: 20px; padding: 15px; background-color: #fff3cd; border-radius: 8px; border: 1px solid #ffeaa7;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              <strong>⚠️ Solicitação de Psicólogo:</strong> Esta solicitação é de um profissional da plataforma. Priorize o atendimento.
            </p>
          </div>
          
          <div style="margin-top: 20px; padding: 15px; background-color: #e7f3ff; border-radius: 8px;">
            <p style="margin: 0; color: #0066cc; font-size: 14px;">
              <strong>Ação necessária:</strong> Entre em contato com o psicólogo através do email fornecido para resolver a solicitação.
            </p>
          </div>
        </div>
      `,
    });

    console.log("Psychologist support request email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      ticket_id: ticket.id,
      message: "Solicitação de suporte enviada com sucesso" 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-psychologist-support-request function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
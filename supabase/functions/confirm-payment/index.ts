import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if user is super admin
    const { data: isAdmin, error: adminError } = await supabase.rpc('is_super_admin', {
      user_id_param: user.id,
    });

    if (adminError || !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { psychologist_id, expected_amount, pix_e2e_id, receipt_path } = await req.json();
    if (!psychologist_id) {
      return new Response(
        JSON.stringify({ error: 'psychologist_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Reconciliation: a payout is only marked as paid with the PIX end-to-end
    // id (32 chars, starts with "E") — the identifier both banks' statements
    // show — so it can be checked later against the bank statement.
    const e2e = typeof pix_e2e_id === 'string' ? pix_e2e_id.trim().toUpperCase() : '';
    if (!/^E[0-9A-Z]{31}$/.test(e2e)) {
      return new Response(
        JSON.stringify({ error: 'Informe o código E2E do PIX (32 caracteres, começa com E), que aparece no comprovante.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (receipt_path !== undefined && receipt_path !== null &&
        (typeof receipt_path !== 'string' || !receipt_path.startsWith(`${psychologist_id}/`))) {
      return new Response(
        JSON.stringify({ error: 'Comprovante inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: duplicate } = await supabase
      .from('payment_logs')
      .select('id')
      .eq('action', 'payment_confirmed')
      .contains('details', { pix_e2e_id: e2e })
      .limit(1);
    if (duplicate && duplicate.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Esse código E2E já foi usado em outro repasse.' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current payment record
    const { data: payment, error: fetchError } = await supabase
      .from('psychologist_payments')
      .select('*')
      .eq('psychologist_id', psychologist_id)
      .single();

    if (fetchError || !payment) {
      return new Response(
        JSON.stringify({ error: 'Payment record not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pending = Number(payment.total_pending_amount ?? 0);
    if (pending <= 0) {
      return new Response(
        JSON.stringify({ error: 'Não há valor pendente para este psicólogo.' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // The amount the admin saw (and transferred) must still be the pending
    // amount — otherwise new consultations were added in between, or it was
    // already confirmed in another tab.
    if (typeof expected_amount !== 'number' || Math.abs(expected_amount - pending) > 0.009) {
      return new Response(
        JSON.stringify({ error: 'O valor pendente mudou desde que a tela foi aberta. Recarregue e confira antes de confirmar.' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Conditional on the pending amount being unchanged, so two concurrent
    // confirmations can't both succeed.
    const { data: updated, error: updateError } = await supabase
      .from('psychologist_payments')
      .update({
        total_paid_amount: (payment.total_paid_amount ?? 0) + pending,
        scheduled_paid_count: (payment.scheduled_paid_count ?? 0) + (payment.scheduled_pending_count ?? 0),
        emergency_paid_count: (payment.emergency_paid_count ?? 0) + (payment.emergency_pending_count ?? 0),
        scheduled_pending_count: 0,
        emergency_pending_count: 0,
        total_pending_amount: 0,
        updated_at: new Date().toISOString()
      })
      .eq('psychologist_id', psychologist_id)
      .eq('total_pending_amount', payment.total_pending_amount)
      .select('id');

    if (updateError) {
      console.error('Error updating payment:', updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!updated || updated.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Este repasse foi alterado ao mesmo tempo por outra ação. Recarregue a tela.' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the payment confirmation
    const { error: logError } = await supabase
      .from('payment_logs')
      .insert({
        psychologist_id: psychologist_id,
        admin_id: user.id,
        action: 'payment_confirmed',
        amount_paid: payment.total_pending_amount,
        scheduled_count: payment.scheduled_pending_count,
        emergency_count: payment.emergency_pending_count,
        details: {
          confirmed_at: new Date().toISOString(),
          admin_email: user.email,
          pix_e2e_id: e2e,
          receipt_path: receipt_path ?? null,
        }
      });

    if (logError) {
      console.error('Error logging payment:', logError);
    }

    console.log(`Payment confirmed for psychologist ${psychologist_id} by admin ${user.id}`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Payment confirmed successfully',
        amount_paid: payment.total_pending_amount
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Payment confirmation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
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

    const { psychologist_id } = await req.json();

    if (!psychologist_id) {
      return new Response(
        JSON.stringify({ error: 'psychologist_id is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
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
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Update payment record - confirm payment
    const { error: updateError } = await supabase
      .from('psychologist_payments')
      .update({
        total_paid_amount: payment.total_paid_amount + payment.total_pending_amount,
        scheduled_paid_count: payment.scheduled_paid_count + payment.scheduled_pending_count,
        emergency_paid_count: payment.emergency_paid_count + payment.emergency_pending_count,
        scheduled_pending_count: 0,
        emergency_pending_count: 0,
        total_pending_amount: 0,
        updated_at: new Date().toISOString()
      })
      .eq('psychologist_id', psychologist_id);

    if (updateError) {
      console.error('Error updating payment:', updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
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
          admin_email: user.email
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
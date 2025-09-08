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

    // Encontrar consultas pending que passaram de 24h sem resposta
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { data: expiredAppointments, error: selectError } = await supabase
      .from('appointments')
      .select('id, patient_id, scheduled_at, psychologist_id')
      .eq('status', 'pending')
      .lt('created_at', twentyFourHoursAgo.toISOString());

    if (selectError) {
      console.error('Error selecting expired appointments:', selectError);
      throw selectError;
    }

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

      console.log(`Updated ${updatedAppointments?.length || 0} appointments to declined`);

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
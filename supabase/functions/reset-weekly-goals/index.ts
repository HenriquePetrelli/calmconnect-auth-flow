import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // This endpoint is only meant to be hit by the Monday pg_cron job, but
    // it has to run with verify_jwt=false (pg_cron's net.http_post sends
    // only the public anon key, not a real user session), which means
    // Supabase's gateway lets ANY unauthenticated caller reach it. Unlike
    // the other public cron endpoints in this project, this one had no
    // guard of its own: every single call unconditionally wiped every
    // patient's current weekly goal progress, any day, any number of
    // times. Two layers of defense, neither requiring the cron job itself
    // to change: (1) an optional shared secret — if CRON_SECRET is set as
    // an edge function secret, a request missing/mismatching the
    // x-cron-secret header is rejected; skipped entirely while the secret
    // isn't configured, so this doesn't break the existing cron job; (2) a
    // hard requirement that it only runs on Monday in Brazil's calendar,
    // which holds regardless of whether the secret is configured yet.
    const cronSecret = Deno.env.get('CRON_SECRET');
    if (cronSecret && req.headers.get('x-cron-secret') !== cronSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const brazilNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    if (brazilNow.getDay() !== 1) { // 0 = Sunday, 1 = Monday
      console.log('[RESET-WEEKLY-GOALS] Skipped: not Monday in America/Sao_Paulo', { brazilNow: brazilNow.toISOString() });
      return new Response(
        JSON.stringify({ success: false, skipped: true, reason: 'Only runs on Monday (America/Sao_Paulo)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[RESET-WEEKLY-GOALS] Starting weekly goals reset - Monday 01:00 AM BRT');

    // Job 1: Update show_weekly_goal_modal to true for all patients
    console.log('[RESET-WEEKLY-GOALS] Job 1: Updating show_weekly_goal_modal flag');
    const { error: updateModalError } = await supabase
      .from('patients')
      .update({ show_weekly_goal_modal: true })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all rows

    if (updateModalError) {
      console.error('[RESET-WEEKLY-GOALS] Error updating modal flag:', updateModalError);
      throw updateModalError;
    }
    console.log('[RESET-WEEKLY-GOALS] Job 1 completed: Modal flags updated');

    // Job 2: Reset weekly_goals to empty array for all patients
    console.log('[RESET-WEEKLY-GOALS] Job 2: Resetting weekly_goals arrays');
    const { error: resetGoalsError } = await supabase
      .from('patients')
      .update({ weekly_goals: [] })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all rows

    if (resetGoalsError) {
      console.error('[RESET-WEEKLY-GOALS] Error resetting weekly_goals:', resetGoalsError);
      throw resetGoalsError;
    }
    console.log('[RESET-WEEKLY-GOALS] Job 2 completed: Weekly goals arrays reset');

    // Job 3: Delete all records from patient_weekly_goals table
    console.log('[RESET-WEEKLY-GOALS] Job 3: Deleting patient_weekly_goals records');
    const { error: deleteError } = await supabase
      .from('patient_weekly_goals')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

    if (deleteError) {
      console.error('[RESET-WEEKLY-GOALS] Error deleting weekly goals:', deleteError);
      throw deleteError;
    }
    console.log('[RESET-WEEKLY-GOALS] Job 3 completed: All weekly goals deleted');

    console.log('[RESET-WEEKLY-GOALS] All jobs completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Weekly goals reset completed successfully',
        jobs_completed: [
          'show_weekly_goal_modal set to true',
          'weekly_goals arrays reset to empty',
          'patient_weekly_goals table cleared'
        ]
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('[RESET-WEEKLY-GOALS] Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
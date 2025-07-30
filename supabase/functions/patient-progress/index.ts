import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    // Verify user is a patient - only patients can access progress tracking
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.user_type !== 'patient') {
      throw new Error('Access denied. Patient access required.');
    }

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const period = url.searchParams.get('period') || '30'; // days

      // Get progress data for the specified period
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period));

      const { data: progress, error } = await supabase
        .from('patient_progress')
        .select('*')
        .eq('patient_id', user.id)
        .gte('session_date', startDate.toISOString().split('T')[0])
        .order('session_date', { ascending: true });

      if (error) throw error;

      // Calculate statistics
      const stats = {
        totalSessions: progress.length,
        averageAnxiety: progress.length > 0 
          ? progress.reduce((sum, p) => sum + (p.anxiety_level || 0), 0) / progress.length 
          : 0,
        averageStress: progress.length > 0 
          ? progress.reduce((sum, p) => sum + (p.stress_level || 0), 0) / progress.length 
          : 0,
        averageMood: progress.length > 0 
          ? progress.reduce((sum, p) => sum + (p.mood_rating || 0), 0) / progress.length 
          : 0,
        totalDuration: progress.reduce((sum, p) => sum + (p.session_duration || 0), 0),
        techniquesUsed: [...new Set(progress.map(p => p.technique_used).filter(Boolean))]
      };

      return new Response(
        JSON.stringify({
          progress,
          stats
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (req.method === 'POST') {
      // Record new progress entry
      const { 
        anxiety_level, 
        stress_level, 
        mood_rating, 
        technique_used, 
        session_duration, 
        notes 
      } = await req.json();

      const { data: progress, error } = await supabase
        .from('patient_progress')
        .insert({
          patient_id: user.id,
          anxiety_level,
          stress_level,
          mood_rating,
          technique_used,
          session_duration,
          notes
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({
          success: true,
          progress,
          message: 'Progresso registrado com sucesso!'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  } catch (error: any) {
    console.error('Error in patient-progress function:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
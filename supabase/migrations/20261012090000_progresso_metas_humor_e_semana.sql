-- Meu progresso: metas da semana e humor pelo servidor, semana certa e
-- histórico que não some.
--
-- A semana do app é de domingo a sábado (o desafio de 7 dias pede para
-- começar no domingo). Antes a rotina de SEGUNDA-feira apagava TODAS as metas
-- de todos os pacientes (inclusive o histórico das semanas passadas) e a
-- escolha: o que foi feito no domingo sumia e o desafio de 7 dias ficava
-- impossível de completar. O progresso era calculado e gravado pelo app
-- (lendo, somando e regravando): dois aparelhos ao mesmo tempo perdiam
-- passos, e a pessoa podia gravar qualquer número.

-- 1. Uma linha por meta por semana (antes um toque duplo criava em dobro).
WITH ranked AS (
  SELECT id, row_number() OVER (
    PARTITION BY user_id, goal_id, week_start_date
    ORDER BY completed DESC, progress DESC, created_at
  ) AS rn
  FROM public.patient_weekly_goals
)
DELETE FROM public.patient_weekly_goals p USING ranked r WHERE p.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS patient_weekly_goals_one_per_week
  ON public.patient_weekly_goals (user_id, goal_id, week_start_date);

-- Dia do último passo contado (metas "todo dia" e desafios: um por dia).
ALTER TABLE public.patient_weekly_goals
  ADD COLUMN IF NOT EXISTS last_progress_date date;

-- 2. Só o servidor grava metas, progresso, estatísticas e o histórico do humor.
DROP POLICY IF EXISTS "Users can insert their own weekly goals" ON public.patient_weekly_goals;
DROP POLICY IF EXISTS "Users can update their own weekly goals" ON public.patient_weekly_goals;
DROP POLICY IF EXISTS "Users can delete their own weekly goals" ON public.patient_weekly_goals;
DROP POLICY IF EXISTS "Patients can insert their own statistics" ON public.patient_statistics;
DROP POLICY IF EXISTS "Patients can update their own statistics" ON public.patient_statistics;
DROP POLICY IF EXISTS "Patients can insert their own mood logs" ON public.patient_mood_logs;
DROP POLICY IF EXISTS "Patients can update their own mood logs" ON public.patient_mood_logs;

-- Data do aparelho: aceita só hoje, ontem ou amanhã (fusos), nunca outra.
CREATE OR REPLACE FUNCTION public.progress_local_date(p_local_date date)
RETURNS date
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN p_local_date BETWEEN (now() AT TIME ZONE 'UTC')::date - 1 AND (now() AT TIME ZONE 'UTC')::date + 1
      THEN p_local_date
    ELSE (now() AT TIME ZONE 'America/Sao_Paulo')::date
  END;
$function$;

-- 3. Garante as metas da semana: as escolhidas continuam valendo na semana
--    seguinte sozinhas (antes a pessoa tinha de escolher tudo de novo).
CREATE OR REPLACE FUNCTION public.ensure_week_goals(p_local_date date)
RETURNS date
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_day date := public.progress_local_date(p_local_date);
  v_start date := v_day - extract(dow FROM v_day)::int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.patient_weekly_goals (user_id, goal_id, target, progress, completed, week_start_date, week_end_date)
  SELECT v_uid, g.id, g.target, 0, false, v_start, v_start + 6
  FROM public.patients p
  CROSS JOIN LATERAL unnest(COALESCE(p.weekly_goals, '{}'::text[])) AS sel(goal_id)
  JOIN public.weekly_goals g ON g.id::text = sel.goal_id AND g.active
  WHERE p.user_id = v_uid
  ON CONFLICT (user_id, goal_id, week_start_date) DO NOTHING;
  RETURN v_start;
END;
$function$;

-- 4. Escolher as metas da semana: grava a escolha, cria as que faltam e para
--    de acompanhar as desmarcadas (só na semana atual; semanas passadas ficam).
CREATE OR REPLACE FUNCTION public.set_week_goals(p_goal_ids uuid[], p_local_date date)
RETURNS date
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_day date := public.progress_local_date(p_local_date);
  v_start date := v_day - extract(dow FROM v_day)::int;
  v_ids text[];
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;
  SELECT COALESCE(array_agg(g.id::text ORDER BY g.category), '{}')
  INTO v_ids
  FROM public.weekly_goals g
  WHERE g.active AND g.id = ANY (COALESCE(p_goal_ids, '{}'::uuid[]));

  UPDATE public.patients SET weekly_goals = v_ids, show_weekly_goal_modal = false WHERE user_id = v_uid;

  DELETE FROM public.patient_weekly_goals
  WHERE user_id = v_uid AND week_start_date = v_start AND NOT (goal_id::text = ANY (v_ids));

  PERFORM public.ensure_week_goals(v_day);
  RETURN v_start;
END;
$function$;

-- 5. Conta um passo nas metas da semana daquela categoria, numa operação só.
--    Metas "todo dia" e desafios: um passo por dia. Devolve as que acabaram
--    de ser concluídas (para a comemoração).
CREATE OR REPLACE FUNCTION public.record_goal_progress(p_category text, p_local_date date)
RETURNS TABLE (goal_id uuid, title text, completed_now boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_uid uuid := auth.uid();
  v_day date := public.progress_local_date(p_local_date);
  v_start date;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;
  v_start := public.ensure_week_goals(v_day);
  RETURN QUERY
  UPDATE public.patient_weekly_goals pwg
  SET progress = LEAST(pwg.progress + 1, pwg.target),
      completed = pwg.progress + 1 >= pwg.target,
      last_progress_date = v_day
  FROM public.weekly_goals g
  WHERE pwg.goal_id = g.id
    AND pwg.user_id = v_uid
    AND pwg.week_start_date = v_start
    AND g.category = p_category
    AND NOT pwg.completed
    -- Metas antigas (sem o dia do último passo): vale o dia da última alteração.
    AND NOT (g.type IN ('daily', 'challenge')
             AND COALESCE(pwg.last_progress_date,
                          CASE WHEN pwg.progress > 0 THEN (pwg.updated_at AT TIME ZONE 'America/Sao_Paulo')::date END)
                 IS NOT DISTINCT FROM v_day)
  RETURNING pwg.goal_id, g.title, pwg.completed;
END;
$function$;

REVOKE ALL ON FUNCTION public.ensure_week_goals(date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_week_goals(uuid[], date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_goal_progress(text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_week_goals(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_week_goals(uuid[], date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_goal_progress(text, date) TO authenticated;

-- 6. Humor do dia numa operação só (antes o app lia, somava e regravava a
--    média; dois aparelhos ao mesmo tempo bagunçavam a conta, e uma falha no
--    meio deixava a média e o gráfico diferentes). Mudar o humor no mesmo dia
--    troca o valor, não soma outro.
CREATE OR REPLACE FUNCTION public.log_mood(p_value integer, p_local_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_day date := public.progress_local_date(p_local_date);
  v_previous integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;
  IF p_value IS NULL OR p_value < 1 OR p_value > 5 THEN
    RAISE EXCEPTION 'Humor inválido' USING ERRCODE = '22023';
  END IF;

  SELECT mood_value INTO v_previous
  FROM public.patient_mood_logs
  WHERE patient_id = v_uid AND logged_date = v_day
  FOR UPDATE;

  INSERT INTO public.patient_mood_logs (patient_id, mood_value, logged_date)
  VALUES (v_uid, p_value, v_day)
  ON CONFLICT (patient_id, logged_date) DO UPDATE SET mood_value = EXCLUDED.mood_value;

  UPDATE public.patients
  SET daily_mood_count = COALESCE(daily_mood_count, 0) + CASE WHEN v_previous IS NULL THEN 1 ELSE 0 END,
      daily_mood_sum = COALESCE(daily_mood_sum, 0) + p_value - COALESCE(v_previous, 0),
      last_mood_date = GREATEST(COALESCE(last_mood_date, v_day), v_day),
      last_mood_value = CASE WHEN last_mood_date IS NULL OR v_day >= last_mood_date THEN p_value ELSE last_mood_value END
  WHERE user_id = v_uid;

  RETURN jsonb_build_object('first_today', v_previous IS NULL, 'logged_date', v_day);
END;
$function$;

REVOKE ALL ON FUNCTION public.log_mood(integer, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_mood(integer, date) TO authenticated;

-- 7. Virada da semana sem apagar nada: no domingo de madrugada (horário de
--    Brasília) só convida a revisar as metas; as escolhidas continuam (item 3).
--    Semanas com mais de 6 meses saem do banco.
CREATE OR REPLACE FUNCTION public.reset_weekly_goals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.patients
  SET show_weekly_goal_modal = true
  WHERE show_goal_modal IS NOT FALSE AND show_weekly_goal_modal IS DISTINCT FROM true;

  DELETE FROM public.patient_weekly_goals
  WHERE week_end_date < (now() AT TIME ZONE 'America/Sao_Paulo')::date - 182;
END;
$function$;

REVOKE ALL ON FUNCTION public.reset_weekly_goals() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname IN ('reset-weekly-goals-monday', 'reset-weekly-goals-sunday');
  -- 3h05 UTC = 0h05 de domingo em Brasília.
  PERFORM cron.schedule('reset-weekly-goals-sunday', '5 3 * * 0', 'SELECT public.reset_weekly_goals();');
END;
$$;

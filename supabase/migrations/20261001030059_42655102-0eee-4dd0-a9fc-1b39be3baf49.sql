-- lovable-cron-fallback-reviewed: lembretes de hábitos precisam respeitar janelas de horário escolhidas pelo paciente (a cada 15 min garante atraso máximo de 15 min); 96 execuções/dia, idempotente via claim_due_habit_reminders
-- Meus hábitos: hábitos do dia (água, sono, movimento) e largar hábitos
-- (cigarro, álcool ou outro), com lembretes por push.
--
-- user_habits guarda cada hábito do paciente e a configuração dele (meta
-- diária, data em que parou, quanto gastava, horários de lembrete).
-- habit_events guarda o que acontece: cada copo de água, as horas de sono,
-- os minutos de movimento, cada vontade registrada e cada recaída.
-- Os dados são só do paciente: nem psicólogos nem a equipe têm acesso.

CREATE TABLE IF NOT EXISTS public.user_habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('water', 'sleep', 'movement', 'quit_smoking', 'quit_alcohol', 'quit_custom')),
  title text CHECK (title IS NULL OR length(btrim(title)) BETWEEN 1 AND 60),
  -- Meta diária: mililitros (água), horas (sono) ou minutos (movimento).
  daily_goal numeric CHECK (daily_goal IS NULL OR (daily_goal > 0 AND daily_goal <= 20000)),
  -- Quando parou (largar hábitos). Volta para a hora da recaída, se houver.
  quit_started_at timestamptz,
  best_streak_seconds bigint NOT NULL DEFAULT 0 CHECK (best_streak_seconds >= 0),
  -- Gasto e consumo de antes (para o dinheiro economizado), tamanhos de copo,
  -- motivo para parar etc. O app valida o formato.
  settings jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(settings) = 'object' AND pg_column_size(settings) <= 4000),
  reminders_enabled boolean NOT NULL DEFAULT false,
  reminder_start time NOT NULL DEFAULT '09:00',
  reminder_end time NOT NULL DEFAULT '21:00',
  -- NULL: um lembrete por dia, no horário de início. Senão, a cada N minutos.
  reminder_interval_minutes integer CHECK (reminder_interval_minutes IS NULL OR reminder_interval_minutes IN (60, 90, 120, 180)),
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo' CHECK (length(timezone) <= 64),
  last_reminder_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (reminder_end > reminder_start),
  CHECK ((kind LIKE 'quit_%') = (quit_started_at IS NOT NULL)),
  CHECK (kind <> 'quit_custom' OR title IS NOT NULL),
  CHECK ((kind IN ('water', 'sleep', 'movement')) = (daily_goal IS NOT NULL))
);

-- Um de cada tipo por vez (exceto "outro hábito", que pode ter vários).
CREATE UNIQUE INDEX IF NOT EXISTS user_habits_one_active_per_kind
  ON public.user_habits (user_id, kind)
  WHERE archived_at IS NULL AND kind <> 'quit_custom';
CREATE INDEX IF NOT EXISTS idx_user_habits_user ON public.user_habits (user_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_habits_reminders ON public.user_habits (reminders_enabled) WHERE archived_at IS NULL AND reminders_enabled;

DROP TRIGGER IF EXISTS update_user_habits_updated_at ON public.user_habits;
CREATE TRIGGER update_user_habits_updated_at
  BEFORE UPDATE ON public.user_habits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- No máximo 10 hábitos ativos por pessoa.
CREATE OR REPLACE FUNCTION public.enforce_user_habit_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.archived_at IS NULL AND (
    SELECT count(*) FROM public.user_habits
    WHERE user_id = NEW.user_id AND archived_at IS NULL AND id <> NEW.id
  ) >= 10 THEN
    RAISE EXCEPTION 'Limite de 10 hábitos ativos atingido' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_user_habit_limit ON public.user_habits;
CREATE TRIGGER enforce_user_habit_limit
  BEFORE INSERT OR UPDATE OF archived_at ON public.user_habits
  FOR EACH ROW EXECUTE FUNCTION public.enforce_user_habit_limit();

CREATE TABLE IF NOT EXISTS public.habit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid NOT NULL REFERENCES public.user_habits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('intake', 'relapse', 'craving')),
  -- intake: ml, horas ou minutos. craving: intensidade de 1 a 5.
  amount numeric CHECK (amount IS NULL OR (amount > 0 AND amount <= 20000)),
  -- Dia no calendário do aparelho, para os totais do dia baterem com o que a pessoa vê.
  local_date date NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(details) = 'object' AND pg_column_size(details) <= 2000)
);

CREATE INDEX IF NOT EXISTS idx_habit_events_habit_date ON public.habit_events (habit_id, local_date);
CREATE INDEX IF NOT EXISTS idx_habit_events_user ON public.habit_events (user_id);

ALTER TABLE public.user_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_habits, public.habit_events TO authenticated;
GRANT ALL ON public.user_habits, public.habit_events TO service_role;

DROP POLICY IF EXISTS "Users manage their own habits" ON public.user_habits;
CREATE POLICY "Users manage their own habits"
  ON public.user_habits FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage their own habit events" ON public.habit_events;
CREATE POLICY "Users manage their own habit events"
  ON public.habit_events FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.user_habits h WHERE h.id = habit_id AND h.user_id = auth.uid())
  );

-- Recaída: guarda a sequência que terminou (e o recorde) e recomeça a
-- contagem agora. O histórico não é apagado.
CREATE OR REPLACE FUNCTION public.register_habit_relapse(p_habit_id uuid, p_local_date date, p_note text DEFAULT NULL)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_habit public.user_habits%ROWTYPE;
  v_streak bigint;
  v_now timestamptz := now();
BEGIN
  SELECT * INTO v_habit FROM public.user_habits
  WHERE id = p_habit_id AND user_id = auth.uid() AND archived_at IS NULL
  FOR UPDATE;
  IF NOT FOUND OR v_habit.kind NOT LIKE 'quit_%' THEN
    RAISE EXCEPTION 'Hábito não encontrado' USING ERRCODE = 'no_data_found';
  END IF;

  v_streak := greatest(0, extract(epoch FROM v_now - v_habit.quit_started_at))::bigint;

  INSERT INTO public.habit_events (habit_id, user_id, kind, local_date, occurred_at, details)
  VALUES (
    p_habit_id, v_habit.user_id, 'relapse', p_local_date, v_now,
    jsonb_strip_nulls(jsonb_build_object('streak_seconds', v_streak, 'note', left(p_note, 500)))
  );

  UPDATE public.user_habits
  SET quit_started_at = v_now,
      best_streak_seconds = greatest(best_streak_seconds, v_streak)
  WHERE id = p_habit_id;

  RETURN v_now;
END;
$$;

REVOKE ALL ON FUNCTION public.register_habit_relapse(uuid, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_habit_relapse(uuid, date, text) TO authenticated;

-- Lembretes devidos agora. Marca cada um como enviado na mesma operação, então
-- chamar de novo antes do próximo horário não repete lembrete nenhum. Só para
-- quem tem aparelho com notificação ativa. Chamada pela edge function
-- habit-reminders (service role).
CREATE OR REPLACE FUNCTION public.claim_due_habit_reminders()
RETURNS TABLE (
  habit_id uuid,
  user_id uuid,
  kind text,
  title text,
  daily_goal numeric,
  today_total numeric,
  quit_started_at timestamptz,
  settings jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT h.*,
           (now() AT TIME ZONE h.timezone) AS local_now
    FROM public.user_habits h
    WHERE h.archived_at IS NULL
      AND h.reminders_enabled
      AND EXISTS (SELECT 1 FROM public.fcm_tokens t WHERE t.user_id = h.user_id AND t.is_active IS NOT FALSE)
  ),
  totals AS (
    SELECT c.id,
           c.local_now,
           COALESCE((
             SELECT sum(e.amount) FROM public.habit_events e
             WHERE e.habit_id = c.id AND e.kind = 'intake' AND e.local_date = c.local_now::date
           ), 0) AS total
    FROM candidates c
  ),
  due AS (
    SELECT c.id, c.last_reminder_at
    FROM candidates c
    JOIN totals t ON t.id = c.id
    WHERE c.local_now::time >= c.reminder_start
      AND (
        -- Um por dia, até 3 horas depois do horário escolhido.
        (c.reminder_interval_minutes IS NULL
          AND c.local_now::time - c.reminder_start < interval '3 hours'
          AND (c.last_reminder_at IS NULL OR (c.last_reminder_at AT TIME ZONE c.timezone)::date < c.local_now::date))
        OR
        -- A cada N minutos dentro da janela, enquanto a meta do dia não foi batida.
        (c.reminder_interval_minutes IS NOT NULL
          AND c.local_now::time <= c.reminder_end
          AND (c.daily_goal IS NULL OR t.total < c.daily_goal)
          AND (c.last_reminder_at IS NULL
               OR now() - c.last_reminder_at >= make_interval(mins => c.reminder_interval_minutes - 5)))
      )
  ),
  claimed AS (
    UPDATE public.user_habits h
    SET last_reminder_at = now()
    FROM due
    WHERE h.id = due.id
      -- Se outra execução já marcou este lembrete, não envia de novo.
      AND h.last_reminder_at IS NOT DISTINCT FROM due.last_reminder_at
    RETURNING h.*
  )
  SELECT cl.id, cl.user_id, cl.kind, cl.title, cl.daily_goal, t.total, cl.quit_started_at, cl.settings
  FROM claimed cl
  JOIN totals t ON t.id = cl.id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_due_habit_reminders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_habit_reminders() TO service_role;

-- A cada 15 minutos. A função é segura para chamadas repetidas (o lembrete
-- fica marcado como enviado), então não depende do CRON_SECRET.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.unschedule('habit-reminders')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'habit-reminders');

SELECT cron.schedule(
  'habit-reminders',
  '*/15 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://ihrrgmmsfuvlasmzdmwf.supabase.co/functions/v1/habit-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlocnJnbW1zZnV2bGFzbXpkbXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1NDMzMDcsImV4cCI6MjA2OTExOTMwN30.6hRDCL5alu-Bs4kT4jKYJW3G3zmeBJDZB5udruQzOFU"}'::jsonb,
    body := '{}'::jsonb
  );
  $cron$
);
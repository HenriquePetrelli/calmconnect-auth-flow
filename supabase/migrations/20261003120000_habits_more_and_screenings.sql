-- Meus hábitos, segunda parte, e questionários de acompanhamento.
--
-- 1. Novos hábitos do dia:
--    - caffeine: cafeína em mg, com limite diário (menos é melhor);
--    - meals: refeições do dia (café da manhã, almoço, jantar, lanche), sem calorias;
--    - medication: remédio com até 6 horários, lembrete em cada um;
--    - screen_time: tempo de tela em minutos, com limite diário;
--    - joy: "algo que me faz bem" (ativação comportamental).
--    Os registros continuam em habit_events (kind 'intake'); o detalhe de cada
--    um (bebida, refeição, horário do remédio, atividade) vai em details.
--    'check' marca algo feito sem quantidade (ex.: sem tela antes de dormir).
-- 2. mental_health_screenings: GAD-7 (ansiedade) e PHQ-9 (depressão). Só o
--    paciente vê; ele pode escolher mostrar a um psicólogo com quem tem
--    consulta.

-- ------------------------------------------------------------ hábitos

DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.user_habits'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ~ '\mkind\M'
  LOOP
    EXECUTE format('ALTER TABLE public.user_habits DROP CONSTRAINT %I', c.conname);
  END LOOP;
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.habit_events'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ~ '\mkind\M'
  LOOP
    EXECUTE format('ALTER TABLE public.habit_events DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.user_habits
  ADD CONSTRAINT user_habits_kind_check CHECK (kind IN (
    'water', 'sleep', 'movement', 'caffeine', 'meals', 'medication', 'screen_time', 'joy',
    'quit_smoking', 'quit_alcohol', 'quit_custom'
  )),
  ADD CONSTRAINT user_habits_quit_start_check CHECK ((kind LIKE 'quit_%') = (quit_started_at IS NOT NULL)),
  ADD CONSTRAINT user_habits_title_required CHECK (kind NOT IN ('quit_custom', 'medication') OR title IS NOT NULL),
  ADD CONSTRAINT user_habits_daily_goal_by_kind CHECK ((kind NOT LIKE 'quit_%') = (daily_goal IS NOT NULL));

ALTER TABLE public.habit_events
  ADD CONSTRAINT habit_events_kind_check CHECK (kind IN ('intake', 'relapse', 'craving', 'check'));

-- Um de cada tipo por vez; "outro hábito" e remédios podem ter vários.
DROP INDEX IF EXISTS public.user_habits_one_active_per_kind;
CREATE UNIQUE INDEX IF NOT EXISTS user_habits_one_active_per_kind
  ON public.user_habits (user_id, kind)
  WHERE archived_at IS NULL AND kind NOT IN ('quit_custom', 'medication');

-- Lembretes: o remédio avisa em cada horário escolhido (settings.times), até
-- 2 horas depois, se a dose daquele horário ainda não foi marcada. Os outros
-- seguem como antes. due_slot diz qual horário do remédio está sendo lembrado.
DROP FUNCTION IF EXISTS public.claim_due_habit_reminders();
CREATE FUNCTION public.claim_due_habit_reminders()
RETURNS TABLE (
  habit_id uuid,
  user_id uuid,
  kind text,
  title text,
  daily_goal numeric,
  today_total numeric,
  quit_started_at timestamptz,
  settings jsonb,
  due_slot text
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
  -- Horários do remédio que estão valendo agora e ainda não foram tomados.
  med_slots AS (
    SELECT c.id, s.t AS slot
    FROM candidates c
    CROSS JOIN LATERAL jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(c.settings -> 'times') = 'array' THEN c.settings -> 'times' ELSE '[]'::jsonb END
    ) AS s(t)
    WHERE c.kind = 'medication'
      AND s.t ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      AND c.local_now::time >= s.t::time
      AND c.local_now::time - s.t::time < interval '2 hours'
      AND (c.last_reminder_at IS NULL
           OR (c.last_reminder_at AT TIME ZONE c.timezone) < (c.local_now::date + s.t::time))
      AND NOT EXISTS (
        SELECT 1 FROM public.habit_events e
        WHERE e.habit_id = c.id AND e.kind = 'intake'
          AND e.local_date = c.local_now::date AND e.details ->> 'slot' = s.t
      )
  ),
  due AS (
    SELECT c.id, c.last_reminder_at
    FROM candidates c
    JOIN totals t ON t.id = c.id
    WHERE (
        c.kind = 'medication'
        AND EXISTS (SELECT 1 FROM med_slots m WHERE m.id = c.id)
      )
      OR (
        c.kind <> 'medication'
        AND c.local_now::time >= c.reminder_start
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
  SELECT cl.id, cl.user_id, cl.kind, cl.title, cl.daily_goal, t.total, cl.quit_started_at, cl.settings,
         (SELECT max(m.slot) FROM med_slots m WHERE m.id = cl.id)
  FROM claimed cl
  JOIN totals t ON t.id = cl.id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_due_habit_reminders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_habit_reminders() TO service_role;

-- ------------------------------------------------------- questionários

CREATE TABLE IF NOT EXISTS public.mental_health_screenings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instrument text NOT NULL CHECK (instrument IN ('gad7', 'phq9')),
  -- Uma resposta de 0 a 3 por pergunta (7 no GAD-7, 9 no PHQ-9).
  answers smallint[] NOT NULL,
  -- Calculados no banco (trigger), para o resultado não depender do app.
  score smallint NOT NULL DEFAULT 0,
  severity text NOT NULL DEFAULT 'minimal' CHECK (severity IN ('minimal', 'mild', 'moderate', 'moderately_severe', 'severe')),
  -- PHQ-9, pergunta 9 (pensamentos de se ferir) diferente de "nenhuma vez".
  self_harm_flag boolean NOT NULL DEFAULT false,
  -- O paciente escolhe mostrar aos psicólogos com quem tem consulta.
  shared_with_psychologist boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (array_length(answers, 1) = CASE instrument WHEN 'gad7' THEN 7 ELSE 9 END),
  CHECK (0 <= ALL (answers) AND 3 >= ALL (answers))
);

CREATE INDEX IF NOT EXISTS idx_screenings_user_created ON public.mental_health_screenings (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.score_mental_health_screening()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_score integer;
BEGIN
  SELECT COALESCE(sum(a), 0) INTO v_score FROM unnest(NEW.answers) AS a;
  NEW.score := v_score;
  IF NEW.instrument = 'gad7' THEN
    -- Spitzer et al., 2006: 5, 10 e 15 são os pontos de corte.
    NEW.severity := CASE WHEN v_score >= 15 THEN 'severe' WHEN v_score >= 10 THEN 'moderate' WHEN v_score >= 5 THEN 'mild' ELSE 'minimal' END;
    NEW.self_harm_flag := false;
  ELSE
    -- Kroenke et al., 2001: 5, 10, 15 e 20.
    NEW.severity := CASE WHEN v_score >= 20 THEN 'severe' WHEN v_score >= 15 THEN 'moderately_severe' WHEN v_score >= 10 THEN 'moderate' WHEN v_score >= 5 THEN 'mild' ELSE 'minimal' END;
    NEW.self_harm_flag := NEW.answers[9] > 0;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS score_mental_health_screening ON public.mental_health_screenings;
CREATE TRIGGER score_mental_health_screening
  BEFORE INSERT OR UPDATE OF answers, instrument ON public.mental_health_screenings
  FOR EACH ROW EXECUTE FUNCTION public.score_mental_health_screening();

ALTER TABLE public.mental_health_screenings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mental_health_screenings TO authenticated;
GRANT ALL ON public.mental_health_screenings TO service_role;

DROP POLICY IF EXISTS "Patients manage their own screenings" ON public.mental_health_screenings;
CREATE POLICY "Patients manage their own screenings"
  ON public.mental_health_screenings FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Psicólogo vê só o que o paciente compartilhou, e só se tem (ou teve)
-- consulta com ele.
DROP POLICY IF EXISTS "Psychologists view shared screenings of their patients" ON public.mental_health_screenings;
CREATE POLICY "Psychologists view shared screenings of their patients"
  ON public.mental_health_screenings FOR SELECT
  TO authenticated
  USING (
    shared_with_psychologist
    AND EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.patient_id = mental_health_screenings.user_id
        AND a.psychologist_id = auth.uid()
    )
  );

-- ------------------------------------------------- desafios de 7 dias
-- Entram como metas da semana (type 'challenge', 7 passos, um por dia). O
-- texto de cada dia fica no app (src/lib/challenges.ts).
INSERT INTO public.weekly_goals (category, title, description, target, type)
SELECT v.category, v.title, v.description, 7, 'challenge'
FROM (VALUES
  ('challenge_sleep', 'Desafio: 7 dias para dormir melhor', 'Um passo por dia para uma rotina de sono mais tranquila'),
  ('challenge_breathing', 'Desafio: 7 dias de respiração', 'Uma prática curta de respiração por dia'),
  ('challenge_gratitude', 'Desafio: 7 dias de gratidão', 'Anotar, todo dia, algo bom que aconteceu'),
  ('challenge_anxiety', 'Desafio: 7 dias para acalmar a ansiedade', 'Uma técnica diferente por dia para os momentos de ansiedade'),
  ('challenge_screen', 'Desafio: 7 dias com menos tela', 'Um passo por dia para usar menos o celular')
) AS v(category, title, description)
WHERE NOT EXISTS (SELECT 1 FROM public.weekly_goals w WHERE w.category = v.category);

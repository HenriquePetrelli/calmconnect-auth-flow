-- Meus hábitos: regras do servidor e lembretes.

-- 1. Campos que só o servidor decide. Pelo app a pessoa escolhia o próprio
--    recorde, a hora do último lembrete e um fuso qualquer. Um fuso que o
--    banco não conhece fazia a rotina de lembretes dar erro para TODOS os
--    pacientes (uma linha ruim travava a consulta inteira). Data de início
--    no futuro deixava o contador do "largar" negativo/zerado.
CREATE OR REPLACE FUNCTION public.guard_user_habit_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.timezone IS NULL OR NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = NEW.timezone) THEN
    NEW.timezone := COALESCE(
      CASE WHEN TG_OP = 'UPDATE' AND EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = OLD.timezone) THEN OLD.timezone END,
      'America/Sao_Paulo');
  END IF;
  IF NEW.quit_started_at IS NOT NULL AND NEW.quit_started_at > now() THEN
    NEW.quit_started_at := now();
  END IF;

  IF current_user = 'authenticated' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.best_streak_seconds := 0;
      NEW.last_reminder_at := NULL;
    ELSE
      NEW.user_id := OLD.user_id;
      NEW.kind := OLD.kind;
      NEW.best_streak_seconds := OLD.best_streak_seconds;
      -- Mudou o horário do lembrete: libera o próximo. Senão, quem decide é a rotina.
      IF NEW.reminder_start IS DISTINCT FROM OLD.reminder_start
         OR NEW.reminder_interval_minutes IS DISTINCT FROM OLD.reminder_interval_minutes
         OR NEW.settings -> 'times' IS DISTINCT FROM OLD.settings -> 'times'
         OR NEW.settings -> 'meal_times' IS DISTINCT FROM OLD.settings -> 'meal_times'
         OR (NEW.reminders_enabled AND NOT OLD.reminders_enabled) THEN
        NEW.last_reminder_at := NULL;
      ELSE
        NEW.last_reminder_at := OLD.last_reminder_at;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE TRIGGER a_guard_user_habit_fields
  BEFORE INSERT OR UPDATE ON public.user_habits
  FOR EACH ROW EXECUTE FUNCTION public.guard_user_habit_fields();

-- Fusos inválidos que já estejam gravados.
UPDATE public.user_habits h SET timezone = 'America/Sao_Paulo'
WHERE NOT EXISTS (SELECT 1 FROM pg_timezone_names z WHERE z.name = h.timezone);

-- 2. No máximo 10 hábitos ativos, sem brecha para dois toques em "Começar"
--    ao mesmo tempo (os dois contavam 9 e passavam). Um ativo de cada tipo
--    já é garantido pelo índice user_habits_one_active_per_kind.
CREATE OR REPLACE FUNCTION public.enforce_user_habit_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.archived_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('user_habits:' || NEW.user_id::text, 0));
  IF (
    SELECT count(*) FROM public.user_habits
    WHERE user_id = NEW.user_id AND archived_at IS NULL AND id <> NEW.id
  ) >= 10 THEN
    RAISE EXCEPTION 'Você já tem 10 hábitos na lista. Tire um da lista para adicionar outro.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$function$;

-- 3. Recaída: o recorde é gravado pelo servidor (o app não pode mais mexer
--    nele) e dois toques seguidos contam uma vez só.
CREATE OR REPLACE FUNCTION public.register_habit_relapse(p_habit_id uuid, p_local_date date, p_note text DEFAULT NULL::text)
RETURNS timestamp with time zone
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- Já recomeçou agora há pouco (toque duplo, nova tentativa): nada a fazer.
  IF v_habit.quit_started_at > v_now - interval '1 minute' THEN
    RETURN v_habit.quit_started_at;
  END IF;

  v_streak := greatest(0, extract(epoch FROM v_now - v_habit.quit_started_at))::bigint;

  INSERT INTO public.habit_events (habit_id, user_id, kind, local_date, occurred_at, details)
  VALUES (
    p_habit_id, v_habit.user_id, 'relapse',
    -- Data do aparelho, mas nunca longe do dia de hoje.
    CASE WHEN p_local_date BETWEEN (v_now AT TIME ZONE v_habit.timezone)::date - 1
                               AND (v_now AT TIME ZONE v_habit.timezone)::date + 1
         THEN p_local_date ELSE (v_now AT TIME ZONE v_habit.timezone)::date END,
    v_now,
    jsonb_strip_nulls(jsonb_build_object('streak_seconds', v_streak, 'note', left(p_note, 500)))
  );

  UPDATE public.user_habits
  SET quit_started_at = v_now,
      best_streak_seconds = greatest(best_streak_seconds, v_streak)
  WHERE id = p_habit_id;

  RETURN v_now;
END;
$function$;

REVOKE ALL ON FUNCTION public.register_habit_relapse(uuid, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_habit_relapse(uuid, date, text) TO authenticated;

-- 4. Registros: limite de 120 por minuto por pessoa (tocar copos rápido cabe
--    folgado; um script em loop, não).
DROP TRIGGER IF EXISTS rate_limit_habit_events ON public.habit_events;
CREATE TRIGGER rate_limit_habit_events
  BEFORE INSERT ON public.habit_events
  FOR EACH ROW EXECUTE FUNCTION public.enforce_write_rate_limit('habitos', '120', '60');

-- 5. Lembretes: não lembrar do que já foi feito hoje. Antes "Como você
--    dormiu?" chegava mesmo com o sono já anotado, e o lembrete diário de
--    movimento/água chegava com a meta batida.
CREATE OR REPLACE FUNCTION public.claim_due_habit_reminders()
RETURNS TABLE(habit_id uuid, user_id uuid, kind text, title text, daily_goal numeric, today_total numeric, quit_started_at timestamp with time zone, settings jsonb, due_slot text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT h.*,
           (now() AT TIME ZONE h.timezone) AS local_now
    FROM public.user_habits h
    WHERE h.archived_at IS NULL
      AND h.reminders_enabled
      AND EXISTS (SELECT 1 FROM pg_timezone_names z WHERE z.name = h.timezone)
      AND EXISTS (SELECT 1 FROM public.fcm_tokens t WHERE t.user_id = h.user_id AND t.is_active IS NOT FALSE)
  ),
  totals AS (
    SELECT c.id,
           c.local_now,
           COALESCE((
             SELECT sum(e.amount) FROM public.habit_events e
              WHERE e.habit_id = c.id AND e.kind = 'intake' AND e.local_date = c.local_now::date
           ), 0) AS total,
           EXISTS (
             SELECT 1 FROM public.habit_events e
             WHERE e.habit_id = c.id AND e.kind IN ('intake', 'check') AND e.local_date = c.local_now::date
           ) AS logged_today
    FROM candidates c
  ),
  -- Horários com lembrete próprio que estão valendo agora (até 2 h depois) e
  -- ainda não foram marcados: doses do remédio (settings.times, marcadas em
  -- details.slot) e refeições (settings.meal_times, marcadas em details.meal).
  slots AS (
    SELECT c.id, s.t AS slot, s.t AS at_time
    FROM candidates c
    CROSS JOIN LATERAL jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(c.settings -> 'times') = 'array' THEN c.settings -> 'times' ELSE '[]'::jsonb END
    ) AS s(t)
    WHERE c.kind = 'medication'
      AND s.t ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      AND NOT EXISTS (
        SELECT 1 FROM public.habit_events e
        WHERE e.habit_id = c.id AND e.kind = 'intake'
          AND e.local_date = c.local_now::date AND e.details ->> 'slot' = s.t
      )
    UNION ALL
    SELECT c.id, m.key, m.value
    FROM candidates c
    CROSS JOIN LATERAL jsonb_each_text(
      CASE WHEN jsonb_typeof(c.settings -> 'meal_times') = 'object' THEN c.settings -> 'meal_times' ELSE '{}'::jsonb END
    ) AS m(key, value)
    WHERE c.kind = 'meals'
      AND m.value ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      AND NOT EXISTS (
        SELECT 1 FROM public.habit_events e
        WHERE e.habit_id = c.id AND e.kind = 'intake'
          AND e.local_date = c.local_now::date AND e.details ->> 'meal' = m.key
      )
  ),
  med_slots AS (
    SELECT s.id, s.slot, s.at_time
    FROM slots s
    JOIN candidates c ON c.id = s.id
    WHERE c.local_now::time >= s.at_time::time
      AND c.local_now::time - s.at_time::time < interval '2 hours'
      AND (c.last_reminder_at IS NULL
           OR (c.last_reminder_at AT TIME ZONE c.timezone) < (c.local_now::date + s.at_time::time))
  ),
  -- Hábitos que avisam por horário (remédio; refeições com horários).
  slotted AS (
    SELECT c.id FROM candidates c
    WHERE c.kind = 'medication'
       OR (c.kind = 'meals' AND jsonb_typeof(c.settings -> 'meal_times') = 'object')
  ),
  due AS (
    SELECT c.id, c.last_reminder_at
    FROM candidates c
    JOIN totals t ON t.id = c.id
    WHERE (
        c.id IN (SELECT id FROM slotted)
        AND EXISTS (SELECT 1 FROM med_slots m WHERE m.id = c.id)
      )
      OR (
        c.id NOT IN (SELECT id FROM slotted)
        AND c.local_now::time >= c.reminder_start
        -- Já feito hoje: sono/algo que me faz bem anotados, meta batida.
        AND NOT (c.kind IN ('sleep', 'joy') AND t.logged_today)
        AND NOT (c.kind IN ('water', 'movement', 'meals') AND c.daily_goal IS NOT NULL AND t.total >= c.daily_goal)
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
         (SELECT m.slot FROM med_slots m WHERE m.id = cl.id ORDER BY m.at_time DESC LIMIT 1)
  FROM claimed cl
  JOIN totals t ON t.id = cl.id;
END;
$function$;

-- 6. Lembrete que não saiu (Firebase fora do ar): volta a valer na próxima
--    rodada, em vez de se perder (antes a dose do remédio ficava sem aviso).
CREATE OR REPLACE FUNCTION public.release_habit_reminders(p_habit_ids uuid[])
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  UPDATE public.user_habits SET last_reminder_at = NULL
  WHERE id = ANY (COALESCE(p_habit_ids, '{}'::uuid[]))
    AND last_reminder_at > now() - interval '30 minutes';
$function$;

REVOKE ALL ON FUNCTION public.release_habit_reminders(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_habit_reminders(uuid[]) TO service_role;
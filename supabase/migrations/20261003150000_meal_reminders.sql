-- Comer nos horários: um lembrete na hora de cada refeição (como o remédio),
-- até 2 horas depois, só se aquela refeição ainda não foi marcada. Os horários
-- ficam em settings.meal_times ({"breakfast":"08:00","lunch":"12:30",...}).
-- Quem criou o hábito antes disto (sem meal_times) continua com o lembrete
-- único do dia. due_slot traz o horário do remédio ou a refeição ("lunch").

CREATE OR REPLACE FUNCTION public.claim_due_habit_reminders()
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
$$;

REVOKE ALL ON FUNCTION public.claim_due_habit_reminders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_habit_reminders() TO service_role;

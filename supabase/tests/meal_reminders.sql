-- Teste da migration 20261003150000_meal_reminders (depois da de hábitos e de
-- 20261003000704). Cada checagem imprime "ok"; falha aborta.
\set ON_ERROR_STOP 1
SET client_min_messages = warning;

INSERT INTO auth.users (id, email) VALUES ('00000000-0000-0000-0000-0000000000d1', 'refeicoes@x.com');
INSERT INTO public.fcm_tokens (user_id, token) VALUES ('00000000-0000-0000-0000-0000000000d1', 'tok');

CREATE FUNCTION pg_temp.check(cond boolean, label text) RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  IF NOT cond THEN RAISE EXCEPTION 'FALHOU: %', label; END IF;
  RETURN 'ok - ' || label;
END $$;
CREATE FUNCTION pg_temp.local_hhmm(delta interval) RETURNS text LANGUAGE sql AS $$
  SELECT to_char((now() AT TIME ZONE 'America/Sao_Paulo') + delta, 'HH24:MI')
$$;

-- Almoço há 40 min (devido), jantar daqui a 3 h (ainda não).
INSERT INTO public.user_habits (id, user_id, kind, daily_goal, settings, reminders_enabled) VALUES
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d1', 'meals', 3,
   jsonb_build_object('meal_times', jsonb_build_object('lunch', pg_temp.local_hhmm('-40 minutes'), 'dinner', pg_temp.local_hhmm('3 hours'))), true);

CREATE TEMP TABLE r1 AS SELECT * FROM public.claim_due_habit_reminders() WHERE kind = 'meals';
SELECT pg_temp.check((SELECT count(*) FROM r1) = 1, 'lembra a refeição cujo horário passou');
SELECT pg_temp.check((SELECT due_slot FROM r1) = 'lunch', 'due_slot diz qual refeição');
CREATE TEMP TABLE r2 AS SELECT * FROM public.claim_due_habit_reminders() WHERE kind = 'meals';
SELECT pg_temp.check((SELECT count(*) FROM r2) = 0, 'não repete o mesmo horário');

UPDATE public.user_habits SET last_reminder_at = NULL WHERE id = '30000000-0000-0000-0000-000000000001';
INSERT INTO public.habit_events (habit_id, user_id, kind, amount, local_date, details)
VALUES ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d1', 'intake', 1,
        (now() AT TIME ZONE 'America/Sao_Paulo')::date, '{"meal":"lunch"}');
CREATE TEMP TABLE r3 AS SELECT * FROM public.claim_due_habit_reminders() WHERE kind = 'meals';
SELECT pg_temp.check((SELECT count(*) FROM r3) = 0, 'refeição já marcada não gera lembrete');

-- Hábito antigo, sem horários de refeição: segue o lembrete único do dia.
UPDATE public.user_habits SET archived_at = now() WHERE id = '30000000-0000-0000-0000-000000000001';
INSERT INTO public.user_habits (id, user_id, kind, daily_goal, settings, reminders_enabled, reminder_start) VALUES
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000d1', 'meals', 3, '{}', true,
   pg_temp.local_hhmm('-30 minutes')::time);
CREATE TEMP TABLE r4 AS SELECT * FROM public.claim_due_habit_reminders() WHERE kind = 'meals';
SELECT pg_temp.check((SELECT count(*) FROM r4) = 1 AND (SELECT due_slot FROM r4) IS NULL, 'sem horários: lembrete único do dia');

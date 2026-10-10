-- Repasses: regras no servidor (varredura de funcionamento).
--
-- 1. Cada item do repasse sabe se já foi pago (paid_at, payment_log_id). Antes
--    o livro não guardava isso: o pendente era um contador somado à parte.
-- 2. O pendente passa a ser a soma dos itens ainda não pagos (recalculado a
--    cada sincronização e a cada ajuste), em vez de um contador que só subia.
-- 3. "Consulta interrompida" depois da sincronização semanal: antes era
--    recusada assim que a consulta entrava no livro, mesmo sem ter sido paga
--    ("fale com o suporte"). Agora sai do repasse se ainda não foi paga.
-- 4. Confirmar o pagamento numa operação só no banco: valor conferido, itens
--    marcados como pagos, contadores e registro com o E2E juntos. Antes eram
--    passos separados na função: se o registro falhasse, o repasse ficava pago
--    sem o E2E (e o mesmo E2E podia ser usado de novo). O E2E é único.

ALTER TABLE public.payout_items ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE public.payout_items ADD COLUMN IF NOT EXISTS payment_log_id uuid;
CREATE INDEX IF NOT EXISTS payout_items_unpaid_idx
  ON public.payout_items (psychologist_user_id) WHERE paid_at IS NULL AND NOT backfilled;

-- Itens já pagos: tudo o que entrou antes da última confirmação de cada
-- psicólogo (cada confirmação zerava todo o pendente).
UPDATE public.payout_items pi
SET paid_at = last_paid.created_at, payment_log_id = last_paid.id
FROM (
  SELECT DISTINCT ON (l.psychologist_id) l.psychologist_id, l.id, l.created_at, p.user_id
  FROM public.payment_logs l
  JOIN public.psychologists p ON p.id = l.psychologist_id
  WHERE l.action = 'payment_confirmed'
  ORDER BY l.psychologist_id, l.created_at DESC
) last_paid
WHERE pi.psychologist_user_id = last_paid.user_id
  AND pi.paid_at IS NULL
  AND NOT pi.backfilled
  AND pi.counted_at <= last_paid.created_at;

-- E2E único entre os pagamentos confirmados (só cria se não houver repetido antigo).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.payment_logs
    WHERE action = 'payment_confirmed' AND details ? 'pix_e2e_id'
    GROUP BY details->>'pix_e2e_id' HAVING count(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS payment_logs_e2e_unique
      ON public.payment_logs ((details->>'pix_e2e_id'))
      WHERE action = 'payment_confirmed' AND details ? 'pix_e2e_id';
  END IF;
END $$;

-- Pendente de um psicólogo a partir do livro.
CREATE OR REPLACE FUNCTION public.recompute_psychologist_pending(p_psychologist_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  p public.psychologists%ROWTYPE;
  v_sched integer;
  v_sos integer;
  v_total numeric;
BEGIN
  SELECT * INTO p FROM public.psychologists WHERE user_id = p_psychologist_user_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;
  SELECT count(*) FILTER (WHERE source_type = 'appointment')::int,
         count(*) FILTER (WHERE source_type = 'sos')::int,
         COALESCE(sum(amount), 0)
    INTO v_sched, v_sos, v_total
  FROM public.payout_items
  WHERE psychologist_user_id = p_psychologist_user_id AND paid_at IS NULL AND NOT backfilled;

  INSERT INTO public.psychologist_payments (
    psychologist_id, name, cpf, crp, email, pix_key, pix_type,
    scheduled_pending_count, emergency_pending_count, total_pending_amount
  ) VALUES (
    p.id, p.full_name, p.cpf, p.crp_number, p.email, p.pix_key, p.pix_type, v_sched, v_sos, v_total
  )
  ON CONFLICT (psychologist_id) DO UPDATE SET
    name = EXCLUDED.name,
    cpf = EXCLUDED.cpf,
    crp = EXCLUDED.crp,
    email = EXCLUDED.email,
    pix_key = EXCLUDED.pix_key,
    pix_type = EXCLUDED.pix_type,
    scheduled_pending_count = EXCLUDED.scheduled_pending_count,
    emergency_pending_count = EXCLUDED.emergency_pending_count,
    total_pending_amount = EXCLUDED.total_pending_amount,
    updated_at = now();
END;
$function$;
REVOKE ALL ON FUNCTION public.recompute_psychologist_pending(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.sync_psychologist_payments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  -- Semanas fechadas (até a última segunda-feira, no horário de Brasília); o
  -- que ficou de fora de sincronizações anteriores também entra.
  v_cutoff timestamptz := (date_trunc('week', now() AT TIME ZONE 'America/Sao_Paulo')) AT TIME ZONE 'America/Sao_Paulo';
  r record;
BEGIN
  CREATE TEMP TABLE IF NOT EXISTS _new_payout_items (
    source_type text, psychologist_user_id uuid, amount numeric
  ) ON COMMIT DROP;
  TRUNCATE _new_payout_items;

  WITH inserted AS (
    INSERT INTO public.payout_items (source_type, source_id, psychologist_user_id, amount, occurred_at)
    SELECT 'appointment', a.id, a.psychologist_id, 90.00, a.scheduled_at
    FROM public.appointments a
    WHERE a.status = 'completed'
      AND a.appointment_type = 'regular'
      AND a.scheduled_at < v_cutoff
      AND public.appointment_call_connected(a.video_room_id)
    UNION ALL
    SELECT 'sos', e.id, e.accepted_by, 50.00, e.started_at
    FROM public.emergency_requests e
    WHERE e.status = 'completed'
      AND e.accepted_by IS NOT NULL
      AND e.started_at IS NOT NULL
      AND e.started_at < v_cutoff
      AND public.sos_call_connected(e.id)
    ON CONFLICT DO NOTHING
    RETURNING source_type, psychologist_user_id, amount
  )
  INSERT INTO _new_payout_items SELECT * FROM inserted;

  -- Pendente sempre a partir do livro (também corrige diferenças antigas).
  FOR r IN
    SELECT DISTINCT psychologist_user_id FROM public.payout_items WHERE paid_at IS NULL AND NOT backfilled
    UNION
    SELECT p.user_id FROM public.psychologist_payments pp JOIN public.psychologists p ON p.id = pp.psychologist_id
    WHERE COALESCE(pp.total_pending_amount, 0) <> 0
  LOOP
    PERFORM public.recompute_psychologist_pending(r.psychologist_user_id);
  END LOOP;

  FOR r IN
    SELECT p.id AS psychologist_id,
           count(*) FILTER (WHERE n.source_type = 'appointment')::int AS scheduled_count,
           count(*) FILTER (WHERE n.source_type = 'sos')::int AS emergency_count,
           sum(n.amount) AS total
    FROM _new_payout_items n
    JOIN public.psychologists p ON p.user_id = n.psychologist_user_id
    GROUP BY p.id
  LOOP
    INSERT INTO public.payment_logs (psychologist_id, admin_id, action, scheduled_count, emergency_count, details)
    VALUES (
      r.psychologist_id,
      '00000000-0000-0000-0000-000000000000',
      'sync_update',
      r.scheduled_count,
      r.emergency_count,
      jsonb_build_object(
        'week_end', v_cutoff,
        'scheduled_amount', r.scheduled_count * 90.00,
        'emergency_amount', r.emergency_count * 50.00,
        'total_amount', r.total
      )
    );
  END LOOP;
END;
$function$;

-- Confirmar o pagamento de um psicólogo, numa operação só.
CREATE OR REPLACE FUNCTION public.confirm_psychologist_payout(
  p_psychologist_id uuid,
  p_expected_amount numeric,
  p_pix_e2e_id text,
  p_receipt_path text,
  p_admin_id uuid,
  p_admin_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  pay public.psychologist_payments%ROWTYPE;
  v_sched integer;
  v_sos integer;
  v_total numeric;
  v_log_id uuid;
BEGIN
  SELECT user_id INTO v_user_id FROM public.psychologists WHERE id = p_psychologist_id;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Psicólogo não encontrado' USING ERRCODE = 'P0002';
  END IF;

  -- Uma confirmação de cada vez por psicólogo.
  PERFORM 1 FROM public.psychologist_payments WHERE psychologist_id = p_psychologist_id FOR UPDATE;
  PERFORM public.recompute_psychologist_pending(v_user_id);
  SELECT * INTO pay FROM public.psychologist_payments WHERE psychologist_id = p_psychologist_id;

  SELECT count(*) FILTER (WHERE source_type = 'appointment')::int,
         count(*) FILTER (WHERE source_type = 'sos')::int,
         COALESCE(sum(amount), 0)
    INTO v_sched, v_sos, v_total
  FROM public.payout_items
  WHERE psychologist_user_id = v_user_id AND paid_at IS NULL AND NOT backfilled;

  IF v_total <= 0 THEN
    RAISE EXCEPTION 'Não há valor pendente para este psicólogo.' USING ERRCODE = 'P0001';
  END IF;
  IF p_expected_amount IS NULL OR abs(p_expected_amount - v_total) > 0.009 THEN
    RAISE EXCEPTION 'O valor pendente mudou desde que a tela foi aberta. Recarregue e confira antes de confirmar.' USING ERRCODE = '40001';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.payment_logs
    WHERE action = 'payment_confirmed' AND details->>'pix_e2e_id' = p_pix_e2e_id
  ) THEN
    RAISE EXCEPTION 'Esse código E2E já foi usado em outro repasse.' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.payment_logs (psychologist_id, admin_id, action, amount_paid, scheduled_count, emergency_count, details)
  VALUES (
    p_psychologist_id, p_admin_id, 'payment_confirmed', v_total, v_sched, v_sos,
    jsonb_build_object(
      'confirmed_at', now(),
      'admin_email', p_admin_email,
      'pix_e2e_id', p_pix_e2e_id,
      'receipt_path', p_receipt_path
    )
  )
  RETURNING id INTO v_log_id;

  UPDATE public.payout_items
  SET paid_at = now(), payment_log_id = v_log_id
  WHERE psychologist_user_id = v_user_id AND paid_at IS NULL AND NOT backfilled;

  UPDATE public.psychologist_payments
  SET total_paid_amount = COALESCE(total_paid_amount, 0) + v_total,
      scheduled_paid_count = COALESCE(scheduled_paid_count, 0) + v_sched,
      emergency_paid_count = COALESCE(emergency_paid_count, 0) + v_sos,
      scheduled_pending_count = 0,
      emergency_pending_count = 0,
      total_pending_amount = 0,
      updated_at = now()
  WHERE psychologist_id = p_psychologist_id;

  RETURN jsonb_build_object('amount_paid', v_total, 'payment_log_id', v_log_id);
END;
$function$;
REVOKE ALL ON FUNCTION public.confirm_psychologist_payout(uuid, numeric, text, text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_psychologist_payout(uuid, numeric, text, text, uuid, text) TO service_role;

-- "Consulta interrompida": sai do repasse se ainda não foi paga.
CREATE OR REPLACE FUNCTION public.report_consultation_problem(p_appointment_id uuid, p_details text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  a public.appointments%ROWTYPE;
  v_is_patient boolean;
  v_details text := NULLIF(left(btrim(COALESCE(p_details, '')), 1000), '');
  v_name text;
BEGIN
  SELECT * INTO a FROM public.appointments WHERE id = p_appointment_id FOR UPDATE;
  IF NOT FOUND OR auth.uid() NOT IN (a.patient_id, a.psychologist_id) THEN
    RAISE EXCEPTION 'Consulta não encontrada' USING ERRCODE = '42501';
  END IF;
  IF now() < a.scheduled_at OR now() > a.scheduled_at + interval '48 hours' THEN
    RAISE EXCEPTION 'Dá para relatar problema só até 48h depois do horário da consulta' USING ERRCODE = 'P0001';
  END IF;
  IF a.status NOT IN ('scheduled', 'confirmed', 'in_progress', 'completed') THEN
    RAISE EXCEPTION 'Esta consulta já foi encerrada de outra forma' USING ERRCODE = 'P0001';
  END IF;

  v_is_patient := auth.uid() = a.patient_id;
  SELECT full_name INTO v_name FROM public.profiles WHERE user_id = auth.uid();

  IF v_is_patient THEN
    INSERT INTO public.appointment_problem_reports (appointment_id, reported_by, reporter_type, details)
    VALUES (a.id, auth.uid(), 'patient', v_details);
    INSERT INTO public.notifications (patient_id, appointment_id, title, message, status, push, link)
    VALUES (
      a.psychologist_id, a.id, 'Problema na consulta',
      COALESCE(v_name, 'O paciente') || ' relatou um problema técnico na consulta de ' || public.format_br_datetime(a.scheduled_at)
        || '. Se a consulta foi interrompida, devolva a consulta do mês dele no seu histórico de consultas.',
      'unread', true, '/psychologist-dashboard'
    );
    RETURN jsonb_build_object('ok', true, 'refunded', false);
  END IF;

  -- Psicólogo confirmou: a consulta não conta (nem para o paciente, nem no
  -- repasse). Já paga, só pelo suporte; ainda não paga, sai do repasse.
  IF EXISTS (
    SELECT 1 FROM public.payout_items
    WHERE source_type = 'appointment' AND source_id = a.id AND paid_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Esta consulta já foi paga no repasse. Fale com o suporte para ajustar.' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM public.payout_items WHERE source_type = 'appointment' AND source_id = a.id) THEN
    DELETE FROM public.payout_items WHERE source_type = 'appointment' AND source_id = a.id;
    PERFORM public.recompute_psychologist_pending(a.psychologist_id);
  END IF;

  UPDATE public.appointments
  SET status = 'cancelled',
      cancelled_at = now(),
      cancelled_by = auth.uid(),
      cancellation_reason = 'Interrompida por problema técnico' || CASE WHEN v_details IS NOT NULL THEN ': ' || v_details ELSE '' END
  WHERE id = a.id;

  IF a.appointment_type = 'regular' THEN
    PERFORM public.release_appointment_quota(a.id);
  END IF;

  INSERT INTO public.appointment_problem_reports (appointment_id, reported_by, reporter_type, details, refunded)
  VALUES (a.id, auth.uid(), 'psychologist', v_details, true);

  INSERT INTO public.notifications (patient_id, appointment_id, title, message, status, push, link)
  VALUES (
    a.patient_id, a.id, 'Consulta interrompida',
    'A consulta de ' || public.format_br_datetime(a.scheduled_at)
      || ' foi interrompida por um problema técnico. Sua consulta do mês foi devolvida: você pode agendar um novo horário.',
    'unread', true, '/appointments'
  );
  RETURN jsonb_build_object('ok', true, 'refunded', true);
END;
$function$;
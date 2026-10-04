-- Consultas, cotas e repasse dos psicólogos.
--
-- 1. "A chamada conectou" passa a ficar registrado (webrtc_sessions.connected_at).
--    Antes o app só olhava `answer`, que é apagado a cada reconexão: uma
--    consulta que aconteceu e terminou numa queda podia virar "não realizada".
-- 2. Psicólogo sozinho na sala não conclui mais a consulta pelo app: a
--    consulta fica "em andamento" até a outra pessoa entrar ou até a rotina
--    fechar (e aí vira "não realizada", com a consulta do mês devolvida).
-- 3. Devolver a consulta do mês só quando a cota marcada é a desta consulta
--    (release_appointment_quota). Antes, recusar ou cancelar em outubro uma
--    consulta pedida em setembro liberava a consulta de outubro já usada.
-- 4. Repasse conta só consultas e SOS em que a chamada conectou os dois lados.
--    Antes o psicólogo recebia por uma consulta ou SOS em que entrou sozinho.
-- 5. SOS encerrado sem a chamada conectar devolve o SOS do mês.
-- 6. Trocou a chave Pix: o repasse pendente passa a mostrar a chave nova.
--    Antes o admin via (e pagava) a chave da última sincronização.

-- ===========================================================================
-- 1. Chamada conectada
-- ===========================================================================
ALTER TABLE public.webrtc_sessions
  ADD COLUMN IF NOT EXISTS connected_at timestamptz;

UPDATE public.webrtc_sessions
SET connected_at = COALESCE(updated_at, created_at)
WHERE answer IS NOT NULL AND connected_at IS NULL;

CREATE OR REPLACE FUNCTION public.track_call_connected()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Depois de conectada, fica conectada (nem o app nem uma reconexão apagam).
  IF TG_OP = 'UPDATE' AND OLD.connected_at IS NOT NULL THEN
    NEW.connected_at := OLD.connected_at;
  ELSIF NEW.answer IS NOT NULL THEN
    NEW.connected_at := COALESCE(NEW.connected_at, now());
  ELSIF current_user = 'authenticated' THEN
    NEW.connected_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.track_call_connected() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS track_call_connected ON public.webrtc_sessions;
CREATE TRIGGER track_call_connected
  BEFORE INSERT OR UPDATE ON public.webrtc_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.track_call_connected();

CREATE OR REPLACE FUNCTION public.appointment_call_connected(p_video_room_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p_video_room_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.webrtc_sessions s
    WHERE s.id::text = p_video_room_id
      AND (s.connected_at IS NOT NULL OR s.answer IS NOT NULL)
  );
$$;

-- authenticated: usada pelo gatilho que confere o encerramento feito pelo app
-- (só diz se a sala com aquele id conectou; o id é um uuid da própria consulta).
REVOKE ALL ON FUNCTION public.appointment_call_connected(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.appointment_call_connected(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.sos_call_connected(p_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.webrtc_sessions s
    WHERE s.emergency_request_id = p_request_id
      AND (s.connected_at IS NOT NULL OR s.answer IS NOT NULL)
  );
$$;

REVOKE ALL ON FUNCTION public.sos_call_connected(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sos_call_connected(uuid) TO service_role;

-- ===========================================================================
-- 2. Concluir pelo app só com a chamada conectada
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.guard_appointment_client_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_duration integer := COALESCE(NEW.duration, 50);
BEGIN
  -- Edge functions (service_role), cron e funções SECURITY DEFINER (dono
  -- postgres) seguem livres; a regra vale só para chamadas diretas do app.
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  IF NEW.patient_id IS DISTINCT FROM OLD.patient_id
     OR NEW.psychologist_id IS DISTINCT FROM OLD.psychologist_id
     OR NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at
     OR NEW.duration IS DISTINCT FROM OLD.duration
     OR NEW.appointment_type IS DISTINCT FROM OLD.appointment_type
     OR NEW.notes IS DISTINCT FROM OLD.notes
     OR NEW.session_summary IS DISTINCT FROM OLD.session_summary
     OR NEW.proposed_scheduled_at IS DISTINCT FROM OLD.proposed_scheduled_at
     OR NEW.proposal_notes IS DISTINCT FROM OLD.proposal_notes
     OR NEW.video_room_id IS DISTINCT FROM OLD.video_room_id
     OR NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at
     OR NEW.cancelled_by IS DISTINCT FROM OLD.cancelled_by
     OR NEW.cancellation_reason IS DISTINCT FROM OLD.cancellation_reason
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Alteração não permitida nesta consulta' USING ERRCODE = '42501';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- Entrar na chamada: só de consulta confirmada e dentro da janela
    -- (10 min antes do início até 15 min depois do fim).
    IF OLD.status IN ('scheduled', 'confirmed') AND NEW.status = 'in_progress' THEN
      IF now() < OLD.scheduled_at - interval '10 minutes'
         OR now() > OLD.scheduled_at + make_interval(mins => v_duration + 15) THEN
        RAISE EXCEPTION 'A sala da consulta ainda não está aberta' USING ERRCODE = '42501';
      END IF;
    -- Encerrar a chamada. Se a outra pessoa nunca entrou, a consulta continua
    -- "em andamento" (ela ainda pode entrar); a rotina fecha depois como
    -- "não realizada" e devolve a consulta do mês ao paciente.
    ELSIF OLD.status = 'in_progress' AND NEW.status = 'completed' THEN
      IF NOT public.appointment_call_connected(OLD.video_room_id) THEN
        NEW.status := OLD.status;
      END IF;
    ELSE
      RAISE EXCEPTION 'Mudança de status não permitida (% → %)', OLD.status, NEW.status USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_appointment_client_update() FROM PUBLIC, anon, authenticated;

-- ===========================================================================
-- 3. Devolver a consulta do mês
-- ===========================================================================
-- A cota é uma marca só (usada/não usada + quando). Só devolve se a marca é
-- do mesmo mês (horário de Brasília) em que esta consulta foi pedida.
CREATE OR REPLACE FUNCTION public.release_appointment_quota(p_appointment_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  a public.appointments%ROWTYPE;
  v_rows integer;
BEGIN
  SELECT * INTO a FROM public.appointments WHERE id = p_appointment_id;
  IF NOT FOUND OR a.appointment_type IS DISTINCT FROM 'regular' THEN
    RETURN false;
  END IF;

  UPDATE public.subscribers
  SET appointments_used_this_month = false, updated_at = now()
  WHERE user_id = a.patient_id
    AND appointments_used_this_month = true
    AND appointments_last_used IS NOT NULL
    AND date_trunc('month', appointments_last_used AT TIME ZONE 'America/Sao_Paulo')
        = date_trunc('month', a.created_at AT TIME ZONE 'America/Sao_Paulo');
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.release_appointment_quota(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_appointment_quota(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.cancel_appointment(p_appointment_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  a public.appointments%ROWTYPE;
  v_by_patient boolean;
  v_refund boolean;
  v_other uuid;
  v_name text;
  v_reason text := NULLIF(left(btrim(COALESCE(p_reason, '')), 500), '');
BEGIN
  SELECT * INTO a FROM public.appointments WHERE id = p_appointment_id FOR UPDATE;
  IF NOT FOUND OR v_uid IS NULL OR (a.patient_id <> v_uid AND a.psychologist_id <> v_uid) THEN
    RAISE EXCEPTION 'Consulta não encontrada' USING ERRCODE = '42501';
  END IF;

  IF a.status NOT IN ('pending', 'scheduled', 'confirmed', 'reschedule_proposed') THEN
    RAISE EXCEPTION 'Esta consulta não pode mais ser cancelada' USING ERRCODE = 'P0001';
  END IF;
  IF a.scheduled_at <= now() THEN
    RAISE EXCEPTION 'A consulta já começou e não pode mais ser cancelada' USING ERRCODE = 'P0001';
  END IF;

  v_by_patient := a.patient_id = v_uid;
  v_refund := NOT v_by_patient
    OR a.status IN ('pending', 'reschedule_proposed')
    OR a.scheduled_at - now() >= interval '24 hours';

  UPDATE public.appointments
  SET status = 'cancelled',
      cancelled_at = now(),
      cancelled_by = v_uid,
      cancellation_reason = v_reason
  WHERE id = a.id;

  IF v_refund AND a.appointment_type = 'regular' THEN
    PERFORM public.release_appointment_quota(a.id);
  END IF;

  v_other := CASE WHEN v_by_patient THEN a.psychologist_id ELSE a.patient_id END;
  SELECT full_name INTO v_name FROM public.profiles WHERE user_id = v_uid;
  INSERT INTO public.notifications (patient_id, appointment_id, title, message, status, push, link)
  VALUES (
    v_other,
    a.id,
    'Consulta cancelada',
    COALESCE(v_name, CASE WHEN v_by_patient THEN 'O paciente' ELSE 'O psicólogo' END)
      || ' cancelou a consulta de ' || public.format_br_datetime(a.scheduled_at) || '.'
      || CASE WHEN v_reason IS NOT NULL THEN ' Motivo: ' || rtrim(v_reason, '.') || '.' ELSE '' END
      || CASE WHEN NOT v_by_patient AND a.appointment_type = 'regular' THEN ' Sua consulta do mês foi devolvida: você pode agendar outro horário.' ELSE '' END,
    'unread',
    true,
    CASE WHEN v_by_patient THEN '/psychologist-dashboard' ELSE '/appointments' END
  );

  RETURN jsonb_build_object('cancelled', true, 'refunded', v_refund AND a.appointment_type = 'regular');
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_appointment(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_appointment(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.finalize_stale_appointments()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r record;
  v_count integer := 0;
BEGIN
  FOR r IN
    SELECT a.*
    FROM public.appointments a
    WHERE a.status IN ('scheduled', 'confirmed', 'in_progress')
      AND a.scheduled_at + make_interval(mins => COALESCE(a.duration, 50) + 30) < now()
    FOR UPDATE SKIP LOCKED
  LOOP
    IF public.appointment_call_connected(r.video_room_id) THEN
      UPDATE public.appointments SET status = 'completed' WHERE id = r.id;
    ELSE
      UPDATE public.appointments SET status = 'no_show' WHERE id = r.id;
      IF r.appointment_type = 'regular' THEN
        PERFORM public.release_appointment_quota(r.id);
      END IF;
      INSERT INTO public.notifications (patient_id, appointment_id, title, message, status, push, link)
      VALUES
        (r.patient_id, r.id, 'Consulta não realizada',
         'A consulta de ' || public.format_br_datetime(r.scheduled_at) || ' não aconteceu (a chamada não chegou a conectar). Sua consulta do mês foi devolvida: você pode agendar outro horário.',
         'unread', true, '/appointments'),
        (r.psychologist_id, r.id, 'Consulta não realizada',
         'A consulta de ' || public.format_br_datetime(r.scheduled_at) || ' não aconteceu (a chamada não chegou a conectar).',
         'unread', true, '/psychologist-dashboard');
    END IF;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_stale_appointments() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.report_consultation_problem(p_appointment_id uuid, p_details text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  -- Psicólogo confirmou: a consulta não conta (nem para o paciente, nem no repasse).
  IF EXISTS (SELECT 1 FROM public.payout_items WHERE source_type = 'appointment' AND source_id = a.id) THEN
    RAISE EXCEPTION 'Esta consulta já entrou no repasse. Fale com o suporte para ajustar.' USING ERRCODE = 'P0001';
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
$$;

REVOKE ALL ON FUNCTION public.report_consultation_problem(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_consultation_problem(uuid, text) TO authenticated;

-- ===========================================================================
-- 4. Repasse só de chamadas que conectaram
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.sync_psychologist_payments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  -- Semanas fechadas (até a última segunda-feira), como antes; o que ficou de
  -- fora de sincronizações anteriores também entra.
  v_cutoff timestamptz := date_trunc('week', now());
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

  FOR r IN
    SELECT p.id AS psychologist_id, p.full_name, p.cpf, p.crp_number, p.email, p.pix_key, p.pix_type,
           count(*) FILTER (WHERE n.source_type = 'appointment')::int AS scheduled_count,
           count(*) FILTER (WHERE n.source_type = 'sos')::int AS emergency_count,
           sum(n.amount) AS total
    FROM _new_payout_items n
    JOIN public.psychologists p ON p.user_id = n.psychologist_user_id
    GROUP BY p.id, p.full_name, p.cpf, p.crp_number, p.email, p.pix_key, p.pix_type
  LOOP
    INSERT INTO public.psychologist_payments (
      psychologist_id, name, cpf, crp, email, pix_key, pix_type,
      scheduled_pending_count, emergency_pending_count, total_pending_amount
    ) VALUES (
      r.psychologist_id, r.full_name, r.cpf, r.crp_number, r.email, r.pix_key, r.pix_type,
      r.scheduled_count, r.emergency_count, r.total
    )
    ON CONFLICT (psychologist_id) DO UPDATE SET
      name = EXCLUDED.name,
      cpf = EXCLUDED.cpf,
      crp = EXCLUDED.crp,
      email = EXCLUDED.email,
      pix_key = EXCLUDED.pix_key,
      pix_type = EXCLUDED.pix_type,
      scheduled_pending_count = COALESCE(psychologist_payments.scheduled_pending_count, 0) + EXCLUDED.scheduled_pending_count,
      emergency_pending_count = COALESCE(psychologist_payments.emergency_pending_count, 0) + EXCLUDED.emergency_pending_count,
      total_pending_amount = COALESCE(psychologist_payments.total_pending_amount, 0) + EXCLUDED.total_pending_amount,
      updated_at = now();

    INSERT INTO public.payment_logs (psychologist_id, admin_id, action, scheduled_count, emergency_count, details)
    VALUES (
      r.psychologist_id,
      '00000000-0000-0000-0000-000000000000',
      'sync_update',
      r.scheduled_count,
      r.emergency_count,
      jsonb_build_object(
        'week_start', date_trunc('week', now() - interval '1 week'),
        'week_end', v_cutoff,
        'scheduled_amount', r.scheduled_count * 90.00,
        'emergency_amount', r.emergency_count * 50.00,
        'total_amount', r.total
      )
    );
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_psychologist_payments() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_psychologist_payments() TO service_role;

-- ===========================================================================
-- 5. SOS sem chamada conectada devolve o SOS do mês
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.refund_sos_on_failed_call()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.started_at IS NOT NULL AND (
    (NEW.status = 'cancelled'
     AND OLD.status IS DISTINCT FROM 'cancelled'
     AND NEW.end_reason IN ('abandoned', 'psychologist_unavailable'))
    OR
    -- Encerrado sem os dois lados chegarem a se ver/ouvir.
    (NEW.status = 'completed'
     AND OLD.status IS DISTINCT FROM 'completed'
     AND NOT public.sos_call_connected(NEW.id))
  ) THEN
    UPDATE public.subscribers
    SET sos_used_this_month = false, updated_at = now()
    WHERE user_id = NEW.patient_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.refund_sos_on_failed_call() FROM PUBLIC, anon, authenticated;

-- ===========================================================================
-- 6. Chave Pix sempre atual no repasse pendente
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.sync_payment_pix_key()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.psychologist_payments
  SET pix_key = NEW.pix_key, pix_type = NEW.pix_type, updated_at = now()
  WHERE psychologist_id = NEW.id;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_payment_pix_key() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sync_payment_pix_key ON public.psychologists;
CREATE TRIGGER sync_payment_pix_key
  AFTER UPDATE OF pix_key, pix_type ON public.psychologists
  FOR EACH ROW
  WHEN (NEW.pix_key IS DISTINCT FROM OLD.pix_key OR NEW.pix_type IS DISTINCT FROM OLD.pix_type)
  EXECUTE FUNCTION public.sync_payment_pix_key();

UPDATE public.psychologist_payments pp
SET pix_key = p.pix_key, pix_type = p.pix_type, updated_at = now()
FROM public.psychologists p
WHERE p.id = pp.psychologist_id
  AND (pp.pix_key IS DISTINCT FROM p.pix_key OR pp.pix_type IS DISTINCT FROM p.pix_type);
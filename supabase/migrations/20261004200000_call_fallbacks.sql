-- Fluxos alternativos para falhas nas chamadas: ninguém perde o SOS ou a
-- consulta por problema técnico.
--
-- SOS
-- 1. Chamado encerrado por queda (os dois sem sinal: "abandoned") ou porque o
--    psicólogo sumiu ("psychologist_unavailable") devolve a cota do SOS do mês.
--    Antes a cota ficava gasta.
-- 2. Psicólogo sumiu (ou aceitou e não entrou) há mais de 90s: o paciente pode
--    chamar outro psicólogo na hora, sem gastar outro SOS. Antes ficava sozinho
--    na sala até o fim do tempo (e o chamado ainda contava como concluído).
--
-- Consultas
-- 3. "Avisar" o outro participante que você está na sala esperando (push),
--    para o caso de esquecimento/atraso.
-- 4. Consulta interrompida por problema técnico: o psicólogo confirma e a
--    consulta do mês volta para o paciente (e a consulta não entra no
--    repasse); o paciente pode relatar o problema, e o psicólogo é avisado.
--
-- SOS e consultas
-- 5. A sala de um atendimento já encerrado não reabre.

-- ===========================================================================
-- 1. Devolver a cota do SOS quando a chamada cai
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.refund_sos_on_failed_call()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'cancelled'
     AND OLD.status IS DISTINCT FROM 'cancelled'
     AND NEW.started_at IS NOT NULL
     AND NEW.end_reason IN ('abandoned', 'psychologist_unavailable') THEN
    UPDATE public.subscribers
    SET sos_used_this_month = false, updated_at = now()
    WHERE user_id = NEW.patient_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.refund_sos_on_failed_call() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS refund_sos_on_failed_call ON public.emergency_requests;
CREATE TRIGGER refund_sos_on_failed_call
  AFTER UPDATE OF status ON public.emergency_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.refund_sos_on_failed_call();

-- ===========================================================================
-- 2. Chamar outro psicólogo quando o atual some
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.sos_request_other_psychologist(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r public.emergency_requests%ROWTYPE;
  v_session_id uuid;
  v_last_seen timestamptz;
BEGIN
  SELECT * INTO r FROM public.emergency_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND OR r.patient_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Atendimento não encontrado' USING ERRCODE = '42501';
  END IF;
  IF r.status NOT IN ('accepted', 'in_progress') THEN
    RAISE EXCEPTION 'Este atendimento já foi encerrado' USING ERRCODE = 'P0001';
  END IF;

  SELECT ws.id INTO v_session_id FROM public.webrtc_sessions ws WHERE ws.emergency_request_id = r.id LIMIT 1;
  SELECT max(pp.last_seen) INTO v_last_seen
  FROM public.participant_presence pp
  WHERE pp.session_id = v_session_id AND pp.user_id = r.accepted_by;

  -- Só se o psicólogo está mesmo ausente: sem sinal há 90s (ou nunca entrou e
  -- aceitou há mais de 90s). Evita trocar no meio de uma conversa normal.
  IF COALESCE(v_last_seen, r.accepted_at, r.created_at) > now() - interval '90 seconds' THEN
    RAISE EXCEPTION 'O psicólogo ainda está conectado. Aguarde um pouco mais.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.emergency_requests
  SET status = 'cancelled',
      ended_at = now(),
      ended_by = auth.uid(),
      ended_by_type = 'system',
      end_reason = 'psychologist_unavailable',
      updated_at = now()
  WHERE id = r.id;

  UPDATE public.webrtc_sessions
  SET status = 'completed', ended_at = COALESCE(ended_at, now()), ended_by_type = 'system',
      end_reason = 'psychologist_unavailable', updated_at = now()
  WHERE emergency_request_id = r.id AND status <> 'completed';

  INSERT INTO public.sos_trace_events (trace_id, emergency_request_id, event_type, actor_type, message)
  VALUES ('req:' || r.id::text, r.id, 'call_finalized_by_system', 'patient', 'psychologist_unavailable');

  IF r.accepted_by IS NOT NULL THEN
    INSERT INTO public.notifications (patient_id, title, message, status, push, link)
    VALUES (
      r.accepted_by,
      'Atendimento de SOS redirecionado',
      'Você ficou sem conexão durante um atendimento de SOS e o paciente foi encaminhado para outro profissional.',
      'unread', true, '/psychologist-dashboard'
    );
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.sos_request_other_psychologist(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sos_request_other_psychologist(uuid) TO authenticated;

-- ===========================================================================
-- 3. Avisar o outro participante da consulta
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.notify_consultation_waiting(p_appointment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  a public.appointments%ROWTYPE;
  v_other uuid;
  v_name text;
  v_is_patient boolean;
BEGIN
  SELECT * INTO a FROM public.appointments WHERE id = p_appointment_id;
  IF NOT FOUND OR auth.uid() NOT IN (a.patient_id, a.psychologist_id) THEN
    RAISE EXCEPTION 'Consulta não encontrada' USING ERRCODE = '42501';
  END IF;
  IF a.status NOT IN ('scheduled', 'confirmed', 'in_progress')
     OR now() < a.scheduled_at - interval '10 minutes'
     OR now() > a.scheduled_at + make_interval(mins => COALESCE(a.duration, 50) + 15) THEN
    RAISE EXCEPTION 'A consulta não está no horário' USING ERRCODE = 'P0001';
  END IF;

  v_is_patient := auth.uid() = a.patient_id;
  v_other := CASE WHEN v_is_patient THEN a.psychologist_id ELSE a.patient_id END;

  -- No máximo um aviso a cada 3 minutos.
  IF EXISTS (
    SELECT 1 FROM public.notifications
    WHERE patient_id = v_other AND appointment_id = a.id
      AND title = 'Estão esperando você na consulta'
      AND created_at > now() - interval '3 minutes'
  ) THEN
    RETURN jsonb_build_object('ok', true, 'already_sent', true);
  END IF;

  SELECT full_name INTO v_name FROM public.profiles WHERE user_id = auth.uid();
  INSERT INTO public.notifications (patient_id, appointment_id, title, message, status, push, link)
  VALUES (
    v_other, a.id,
    'Estão esperando você na consulta',
    COALESCE(v_name, CASE WHEN v_is_patient THEN 'O paciente' ELSE 'O psicólogo' END)
      || ' já está na sala da consulta de ' || public.format_br_datetime(a.scheduled_at) || '. Toque para entrar.',
    'unread', true,
    CASE WHEN v_is_patient THEN '/psychologist-dashboard' ELSE '/appointments' END
  );
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.notify_consultation_waiting(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notify_consultation_waiting(uuid) TO authenticated;

-- ===========================================================================
-- 4. Consulta interrompida por problema técnico
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.appointment_problem_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  reported_by uuid NOT NULL,
  reporter_type text NOT NULL CHECK (reporter_type IN ('patient', 'psychologist')),
  details text,
  refunded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.appointment_problem_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participantes veem os relatos da consulta" ON public.appointment_problem_reports;
CREATE POLICY "Participantes veem os relatos da consulta" ON public.appointment_problem_reports
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = appointment_id AND auth.uid() IN (a.patient_id, a.psychologist_id)
  ) OR public.is_super_admin());

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
    UPDATE public.subscribers SET appointments_used_this_month = false WHERE user_id = a.patient_id;
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

-- 5. Sala de um atendimento já encerrado não reabre. O app reabre a sala
--    quando encontra um "completed" de uma queda anterior (para os dois
--    voltarem à mesma chamada); mas se o SOS ou a consulta já terminou (ex.: o
--    paciente chamou outro psicólogo), quem entrasse pelo link antigo
--    reabria a sala e ficava esperando alguém que não vem.
CREATE OR REPLACE FUNCTION public.prevent_reopen_finished_call()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'completed' AND NEW.status IS DISTINCT FROM 'completed' AND (
    EXISTS (
      SELECT 1 FROM public.emergency_requests er
      WHERE er.id = OLD.emergency_request_id
        AND er.status IN ('completed', 'cancelled', 'expired', 'abandoned')
    )
    OR EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.video_room_id = OLD.id::text
        AND a.status IN ('completed', 'cancelled', 'no_show', 'declined')
    )
  ) THEN
    RAISE EXCEPTION 'Este atendimento já foi encerrado' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_reopen_finished_call ON public.webrtc_sessions;
CREATE TRIGGER prevent_reopen_finished_call
  BEFORE UPDATE OF status ON public.webrtc_sessions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_reopen_finished_call();

-- lovable-cron-fallback-reviewed: avisos de ausência/demora no SOS por mensagem precisam chegar em ~1 min para o paciente em crise não ficar sem resposta; não há evento de banco que dispare na hora certa (a condição é passagem de tempo), então a varredura por minuto é a implementação correta.
-- ============================================================================
-- SOS por mensagem.
--
-- O paciente escolhe, na confirmação do SOS, "Por vídeo" (padrão) ou "Por
-- mensagem". O pedido segue a mesma fila, o mesmo aceite e a mesma sala
-- (webrtc_sessions só como identificador da sala e da presença). Muda:
--   - o atendimento começa (e o SOS do mês é usado) na 1ª resposta do psicólogo;
--   - 25 minutos a partir dessa resposta;
--   - presença = tela da conversa aberta e visível (sinal a cada 15 s);
--   - psicólogo longe da tela há mais de 60 s, ou mensagem do paciente sem
--     resposta há 2 min: o paciente pode chamar outro psicólogo (SOS devolvido)
--     e o psicólogo recebe um push urgente;
--   - repasse: 5 min entre a 1ª resposta e o fim, com pelo menos 3 respostas;
--   - mensagens guardadas por 3 meses, como o chat.
-- ============================================================================

-- 1. Canal do pedido ------------------------------------------------------------
ALTER TABLE public.emergency_requests
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'video';

DO $c$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'emergency_requests_channel_check') THEN
    ALTER TABLE public.emergency_requests
      ADD CONSTRAINT emergency_requests_channel_check CHECK (channel IN ('video', 'text'));
  END IF;
END
$c$;

-- O app não troca o canal nem marca o início de um SOS por mensagem (quem marca
-- é a 1ª resposta do psicólogo, pelo banco).
CREATE OR REPLACE FUNCTION public.guard_emergency_request_client_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Edge functions, cron e funções do banco seguem livres.
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  IF NEW.patient_id IS DISTINCT FROM OLD.patient_id
     OR NEW.time_limit_seconds IS DISTINCT FROM OLD.time_limit_seconds
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.video_room_id IS DISTINCT FROM OLD.video_room_id
     OR NEW.channel IS DISTINCT FROM OLD.channel THEN
    RAISE EXCEPTION 'Alteração não permitida neste atendimento' USING ERRCODE = '42501';
  END IF;

  -- Psicólogo só pode assumir um chamado livre para si mesmo.
  IF NEW.accepted_by IS DISTINCT FROM OLD.accepted_by
     AND NOT (OLD.accepted_by IS NULL AND NEW.accepted_by = auth.uid()) THEN
    RAISE EXCEPTION 'Alteração não permitida neste atendimento' USING ERRCODE = '42501';
  END IF;

  -- O início da chamada não pode ser apagado nem trocado.
  IF OLD.started_at IS NOT NULL AND NEW.started_at IS DISTINCT FROM OLD.started_at THEN
    RAISE EXCEPTION 'Alteração não permitida neste atendimento' USING ERRCODE = '42501';
  END IF;

  -- Por mensagem, o início é a 1ª resposta do psicólogo (send_sos_message).
  IF OLD.channel = 'text' AND NEW.started_at IS DISTINCT FROM OLD.started_at THEN
    RAISE EXCEPTION 'Alteração não permitida neste atendimento' USING ERRCODE = '42501';
  END IF;

  -- Chamado encerrado não volta a ficar ativo.
  IF OLD.status IN ('completed', 'cancelled', 'expired', 'abandoned')
     AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Este atendimento já foi encerrado' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

-- 2. Mensagens e estado da conversa ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.sos_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.emergency_requests(id) ON DELETE CASCADE,
  sender_id uuid,
  sender_type text NOT NULL CHECK (sender_type IN ('patient', 'psychologist')),
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
  -- Gerado no aparelho: reenviar depois de uma falha não duplica.
  client_id uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sos_messages_request_idx ON public.sos_messages (request_id, created_at);
CREATE INDEX IF NOT EXISTS sos_messages_created_idx ON public.sos_messages (created_at);

-- Uma linha por atendimento. Separada de emergency_requests para o sinal de
-- presença e o "visto" não encherem a auditoria do pedido.
CREATE TABLE IF NOT EXISTS public.sos_chat_state (
  request_id uuid PRIMARY KEY REFERENCES public.emergency_requests(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL,
  psychologist_id uuid,
  first_reply_at timestamptz,
  psychologist_replies integer NOT NULL DEFAULT 0,
  patient_messages integer NOT NULL DEFAULT 0,
  last_patient_message_at timestamptz,
  last_psychologist_message_at timestamptz,
  patient_seen_at timestamptz,
  psychologist_seen_at timestamptz,
  patient_read_at timestamptz,
  psychologist_read_at timestamptz,
  away_nudged_at timestamptz,
  wait_nudged_for timestamptz,
  patient_nudged_for timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sos_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sos_chat_state ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_sos_participant(p_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.emergency_requests er
    WHERE er.id = p_request_id
      AND auth.uid() IS NOT NULL
      AND auth.uid() IN (er.patient_id, er.accepted_by)
  );
$function$;

REVOKE EXECUTE ON FUNCTION public.is_sos_participant(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_sos_participant(uuid) TO authenticated;

-- Só os dois do atendimento leem. Escrever, só pelas funções abaixo.
DROP POLICY IF EXISTS "Participants read SOS messages" ON public.sos_messages;
CREATE POLICY "Participants read SOS messages" ON public.sos_messages
  FOR SELECT TO authenticated USING (public.is_sos_participant(request_id));

DROP POLICY IF EXISTS "Participants read SOS chat state" ON public.sos_chat_state;
CREATE POLICY "Participants read SOS chat state" ON public.sos_chat_state
  FOR SELECT TO authenticated USING (auth.uid() IN (patient_id, psychologist_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sos_messages TO authenticated;
GRANT ALL ON public.sos_messages TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sos_chat_state TO authenticated;
GRANT ALL ON public.sos_chat_state TO service_role;

DO $pub$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'sos_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'sos_chat_state') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_chat_state;
  END IF;
END
$pub$;

-- 3. Enviar mensagem --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.send_sos_message(p_request_id uuid, p_body text, p_client_id uuid)
RETURNS public.sos_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  r public.emergency_requests%ROWTYPE;
  v_type text;
  v_body text := btrim(COALESCE(p_body, ''));
  m public.sos_messages;
  v_recent integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  IF p_client_id IS NULL THEN
    RAISE EXCEPTION 'Mensagem inválida';
  END IF;

  -- Reenvio da mesma mensagem: devolve a que já chegou.
  SELECT * INTO m FROM public.sos_messages WHERE client_id = p_client_id;
  IF FOUND THEN
    IF m.sender_id IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'Mensagem inválida';
    END IF;
    RETURN m;
  END IF;

  IF char_length(v_body) = 0 THEN
    RAISE EXCEPTION 'Escreva uma mensagem';
  END IF;
  IF char_length(v_body) > 2000 THEN
    RAISE EXCEPTION 'Mensagem longa demais (até 2000 caracteres)';
  END IF;

  SELECT * INTO r FROM public.emergency_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND OR v_uid NOT IN (r.patient_id, COALESCE(r.accepted_by, '00000000-0000-0000-0000-000000000000'::uuid)) THEN
    RAISE EXCEPTION 'Atendimento não encontrado' USING ERRCODE = '42501';
  END IF;
  IF r.channel <> 'text' THEN
    RAISE EXCEPTION 'Este atendimento é por vídeo';
  END IF;
  IF r.status NOT IN ('accepted', 'in_progress') THEN
    RAISE EXCEPTION 'Este atendimento já foi encerrado';
  END IF;
  v_type := CASE WHEN v_uid = r.accepted_by THEN 'psychologist' ELSE 'patient' END;

  -- Limite contra envio em massa (o paciente em crise escreve rápido: folgado).
  SELECT count(*) INTO v_recent FROM public.sos_messages
  WHERE request_id = p_request_id AND sender_id = v_uid AND created_at > now() - interval '1 minute';
  IF v_recent >= 30 THEN
    RAISE EXCEPTION 'Muitas mensagens em pouco tempo. Aguarde alguns segundos.';
  END IF;

  INSERT INTO public.sos_messages (request_id, sender_id, sender_type, body, client_id)
  VALUES (p_request_id, v_uid, v_type, v_body, p_client_id)
  RETURNING * INTO m;

  INSERT INTO public.sos_chat_state AS s (request_id, patient_id, psychologist_id)
  VALUES (r.id, r.patient_id, r.accepted_by)
  ON CONFLICT (request_id) DO NOTHING;

  IF v_type = 'psychologist' THEN
    UPDATE public.sos_chat_state
    SET first_reply_at = COALESCE(first_reply_at, m.created_at),
        psychologist_replies = psychologist_replies + 1,
        last_psychologist_message_at = m.created_at,
        psychologist_seen_at = now(),
        updated_at = now()
    WHERE request_id = r.id;
    -- 1ª resposta: começa o atendimento (cronômetro e SOS do mês).
    IF r.started_at IS NULL THEN
      UPDATE public.emergency_requests
      SET started_at = m.created_at, status = 'in_progress', updated_at = now()
      WHERE id = r.id;
    END IF;
  ELSE
    UPDATE public.sos_chat_state
    SET patient_messages = patient_messages + 1,
        last_patient_message_at = m.created_at,
        patient_seen_at = now(),
        updated_at = now()
    WHERE request_id = r.id;
  END IF;

  RETURN m;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.send_sos_message(uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_sos_message(uuid, text, uuid) TO authenticated;

-- 4. Presença e "visto" (a cada 15 s com a conversa aberta e visível) ---------------
CREATE OR REPLACE FUNCTION public.sos_chat_heartbeat(p_request_id uuid, p_read boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  r public.emergency_requests%ROWTYPE;
  v_type text;
  v_session uuid;
  s public.sos_chat_state;
BEGIN
  SELECT * INTO r FROM public.emergency_requests WHERE id = p_request_id;
  IF NOT FOUND OR v_uid IS NULL
     OR v_uid NOT IN (r.patient_id, COALESCE(r.accepted_by, '00000000-0000-0000-0000-000000000000'::uuid)) THEN
    RAISE EXCEPTION 'Atendimento não encontrado' USING ERRCODE = '42501';
  END IF;
  v_type := CASE WHEN v_uid = r.accepted_by THEN 'psychologist' ELSE 'patient' END;

  IF r.status IN ('accepted', 'in_progress') AND r.channel = 'text' THEN
    INSERT INTO public.sos_chat_state (request_id, patient_id, psychologist_id)
    VALUES (r.id, r.patient_id, r.accepted_by)
    ON CONFLICT (request_id) DO NOTHING;

    UPDATE public.sos_chat_state
    SET patient_seen_at = CASE WHEN v_type = 'patient' THEN now() ELSE patient_seen_at END,
        psychologist_seen_at = CASE WHEN v_type = 'psychologist' THEN now() ELSE psychologist_seen_at END,
        patient_read_at = CASE WHEN v_type = 'patient' AND p_read THEN now() ELSE patient_read_at END,
        psychologist_read_at = CASE WHEN v_type = 'psychologist' AND p_read THEN now() ELSE psychologist_read_at END,
        psychologist_id = COALESCE(psychologist_id, r.accepted_by),
        updated_at = now()
    WHERE request_id = r.id;

    -- A mesma presença da sala de vídeo: a rotina de abandono e "chamar outro
    -- psicólogo" leem daqui.
    SELECT id INTO v_session FROM public.webrtc_sessions WHERE emergency_request_id = r.id
    ORDER BY created_at DESC LIMIT 1;
    IF v_session IS NOT NULL THEN
      INSERT INTO public.participant_presence (session_id, user_id, user_type, last_seen)
      VALUES (v_session, v_uid, v_type, now())
      ON CONFLICT (session_id, user_id) DO UPDATE SET last_seen = now();
    END IF;
  END IF;

  SELECT * INTO s FROM public.sos_chat_state WHERE request_id = r.id;
  RETURN jsonb_build_object(
    'server_now', now(),
    'status', r.status,
    'end_reason', r.end_reason,
    'ended_by_type', r.ended_by_type,
    'accepted_at', r.accepted_at,
    'started_at', r.started_at,
    'time_limit_seconds', r.time_limit_seconds,
    'patient_seen_at', s.patient_seen_at,
    'psychologist_seen_at', s.psychologist_seen_at,
    'patient_read_at', s.patient_read_at,
    'psychologist_read_at', s.psychologist_read_at,
    'last_patient_message_at', s.last_patient_message_at,
    'last_psychologist_message_at', s.last_psychologist_message_at,
    'first_reply_at', s.first_reply_at
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.sos_chat_heartbeat(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sos_chat_heartbeat(uuid, boolean) TO authenticated;

-- Psicólogo "longe" (sem a conversa visível há mais de 60 s) ou mensagem do
-- paciente sem resposta há 2 min. Usado pela tela do paciente e pela troca.
CREATE OR REPLACE FUNCTION public.sos_text_psychologist_unresponsive(p_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE((
    SELECT
      COALESCE(s.psychologist_seen_at, er.accepted_at, er.created_at) < now() - interval '60 seconds'
      OR (s.last_patient_message_at IS NOT NULL
          AND s.last_patient_message_at > COALESCE(s.last_psychologist_message_at, '-infinity'::timestamptz)
          AND s.last_patient_message_at < now() - interval '2 minutes')
    FROM public.emergency_requests er
    LEFT JOIN public.sos_chat_state s ON s.request_id = er.id
    WHERE er.id = p_request_id AND er.channel = 'text'
  ), false);
$function$;

REVOKE EXECUTE ON FUNCTION public.sos_text_psychologist_unresponsive(uuid) FROM PUBLIC, anon, authenticated;

-- 5. Chamar outro psicólogo: por mensagem, a regra é ausência ou demora -----------
CREATE OR REPLACE FUNCTION public.sos_request_other_psychologist(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r public.emergency_requests%ROWTYPE;
  v_session_id uuid;
  v_last_seen timestamptz;
  v_media_down boolean;
BEGIN
  SELECT * INTO r FROM public.emergency_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND OR r.patient_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Atendimento não encontrado' USING ERRCODE = '42501';
  END IF;
  IF r.status NOT IN ('accepted', 'in_progress') THEN
    RAISE EXCEPTION 'Este atendimento já foi encerrado' USING ERRCODE = 'P0001';
  END IF;

  IF r.channel = 'text' THEN
    -- Sem áudio/vídeo: só com o psicólogo longe da conversa ou sem responder.
    IF NOT public.sos_text_psychologist_unresponsive(r.id) THEN
      RAISE EXCEPTION 'O psicólogo está na conversa. Aguarde a resposta dele.' USING ERRCODE = 'P0001';
    END IF;
  ELSE
    SELECT ws.id INTO v_session_id FROM public.webrtc_sessions ws WHERE ws.emergency_request_id = r.id LIMIT 1;
    SELECT max(pp.last_seen) INTO v_last_seen
    FROM public.participant_presence pp
    WHERE pp.session_id = v_session_id AND pp.user_id = r.accepted_by;

    -- Áudio/vídeo sem passar há pelo menos 30s do lado do paciente.
    SELECT EXISTS (
      SELECT 1 FROM public.participant_presence pp
      WHERE pp.session_id = v_session_id
        AND pp.user_id = r.patient_id
        AND pp.media_connected = false
        AND pp.media_changed_at <= now() - interval '30 seconds'
    ) INTO v_media_down;

    -- Só se o psicólogo está mesmo ausente (sem sinal há 90s, ou nunca entrou e
    -- aceitou há mais de 90s) ou se a chamada não está passando áudio/vídeo.
    IF COALESCE(v_last_seen, r.accepted_at, r.created_at) > now() - interval '90 seconds'
       AND NOT v_media_down THEN
      RAISE EXCEPTION 'O psicólogo ainda está conectado. Aguarde um pouco mais.' USING ERRCODE = 'P0001';
    END IF;
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
      CASE WHEN r.channel = 'text'
        THEN 'O paciente ficou sem resposta na conversa do SOS e foi encaminhado para outro profissional.'
        ELSE 'A chamada do atendimento de SOS não conseguiu se manter e o paciente foi encaminhado para outro profissional.'
      END,
      'unread', true, '/psychologist-dashboard'
    );
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$function$;

-- 6. Conectado e pago: as mesmas regras, contadas pela conversa --------------------
-- Conectado: o psicólogo respondeu e o paciente escreveu.
CREATE OR REPLACE FUNCTION public.sos_call_connected(p_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.webrtc_sessions s
    WHERE s.emergency_request_id = p_request_id
      AND s.connected_at IS NOT NULL
  ) OR EXISTS (
    SELECT 1 FROM public.emergency_requests er
    JOIN public.sos_chat_state cs ON cs.request_id = er.id
    WHERE er.id = p_request_id AND er.channel = 'text'
      AND cs.first_reply_at IS NOT NULL AND cs.patient_messages > 0
  );
$function$;

-- Pago: 5 min entre a 1ª resposta e o fim, com pelo menos 3 respostas.
CREATE OR REPLACE FUNCTION public.sos_call_payable(p_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.webrtc_sessions s
    JOIN public.emergency_requests er ON er.id = s.emergency_request_id
    WHERE s.emergency_request_id = p_request_id
      AND er.channel = 'video'
      AND s.connected_at IS NOT NULL
      -- Salas antigas, sem contagem de tempo: vale a regra de antes.
      AND (NOT s.media_tracked OR s.media_seconds >= 300)
  ) OR EXISTS (
    SELECT 1 FROM public.emergency_requests er
    JOIN public.sos_chat_state cs ON cs.request_id = er.id
    WHERE er.id = p_request_id AND er.channel = 'text'
      AND cs.first_reply_at IS NOT NULL AND cs.patient_messages > 0
      AND cs.psychologist_replies >= 3
      AND COALESCE(er.ended_at, now()) >= cs.first_reply_at + interval '5 minutes'
  );
$function$;

REVOKE EXECUTE ON FUNCTION public.sos_call_payable(uuid) FROM PUBLIC, anon, authenticated;

-- 7. Avisos ao psicólogo (a cada minuto) -----------------------------------------
CREATE OR REPLACE FUNCTION public.sos_text_nudges()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  c record;
  n integer := 0;
  v_link text;
BEGIN
  FOR c IN
    SELECT er.id, er.patient_id, er.accepted_by, er.accepted_at, er.created_at, er.video_room_id,
           s.psychologist_seen_at, s.last_patient_message_at, s.last_psychologist_message_at,
           s.away_nudged_at, s.wait_nudged_for, s.patient_seen_at, s.patient_read_at, s.patient_nudged_for
    FROM public.emergency_requests er
    LEFT JOIN public.sos_chat_state s ON s.request_id = er.id
    WHERE er.channel = 'text'
      AND er.status IN ('accepted', 'in_progress')
      AND er.accepted_by IS NOT NULL
  LOOP
    v_link := '/emergency-call/' || COALESCE(c.video_room_id, '') || '?requestId=' || c.id || '&userType=psychologist';

    -- Mensagem do paciente sem resposta há 2 min (um aviso por mensagem).
    IF c.last_patient_message_at IS NOT NULL
       AND c.last_patient_message_at > COALESCE(c.last_psychologist_message_at, '-infinity'::timestamptz)
       AND c.last_patient_message_at < now() - interval '2 minutes'
       AND c.wait_nudged_for IS DISTINCT FROM c.last_patient_message_at THEN
      INSERT INTO public.notifications (patient_id, title, message, status, push, link)
      VALUES (c.accepted_by, 'O paciente está esperando sua resposta',
              'Há 2 minutos sem resposta na conversa do SOS. Se não puder continuar, encerre para ele chamar outro psicólogo.',
              'unread', true, v_link);
      UPDATE public.sos_chat_state SET wait_nudged_for = c.last_patient_message_at, away_nudged_at = now()
      WHERE request_id = c.id;
      n := n + 1;
    -- Longe da conversa há mais de 60 s (no máximo um aviso a cada 3 min).
    ELSIF COALESCE(c.psychologist_seen_at, c.accepted_at, c.created_at) < now() - interval '60 seconds'
       AND (c.away_nudged_at IS NULL OR c.away_nudged_at < now() - interval '3 minutes') THEN
      INSERT INTO public.sos_chat_state (request_id, patient_id, psychologist_id)
      SELECT er.id, er.patient_id, er.accepted_by FROM public.emergency_requests er WHERE er.id = c.id
      ON CONFLICT (request_id) DO NOTHING;
      INSERT INTO public.notifications (patient_id, title, message, status, push, link)
      VALUES (c.accepted_by, 'Volte ao atendimento',
              'Você saiu da conversa do SOS e o paciente está esperando. Mantenha a conversa aberta até encerrar.',
              'unread', true, v_link);
      UPDATE public.sos_chat_state SET away_nudged_at = now() WHERE request_id = c.id;
      n := n + 1;
    END IF;

    -- Paciente fora da conversa com resposta do psicólogo sem ler há 1 min.
    -- Texto discreto: o aviso pode aparecer na tela bloqueada.
    IF c.last_psychologist_message_at IS NOT NULL
       AND c.last_psychologist_message_at > COALESCE(c.patient_read_at, '-infinity'::timestamptz)
       AND c.last_psychologist_message_at < now() - interval '1 minute'
       AND COALESCE(c.patient_seen_at, '-infinity'::timestamptz) < now() - interval '60 seconds'
       AND c.patient_nudged_for IS DISTINCT FROM c.last_psychologist_message_at THEN
      INSERT INTO public.notifications (patient_id, title, message, status, push, link, push_text)
      VALUES (c.patient_id, 'Você tem uma nova mensagem',
              'O psicólogo respondeu na conversa do seu atendimento.',
              'unread', true,
              '/emergency-call/' || COALESCE(c.video_room_id, '') || '?requestId=' || c.id || '&userType=patient',
              'Toque para abrir.');
      UPDATE public.sos_chat_state SET patient_nudged_for = c.last_psychologist_message_at WHERE request_id = c.id;
      n := n + 1;
    END IF;
  END LOOP;
  RETURN n;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.sos_text_nudges() FROM PUBLIC, anon, authenticated;

-- 8. Fim por tempo e abandono: por mensagem, contam a partir da conversa ----------
-- Sem cronômetro gravado na sala, o fim é started_at + limite (regra de antes);
-- o abandono olha participant_presence, que o sinal da conversa também grava.

-- 9. Guardar 3 meses, como o chat --------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_old_sos_messages()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH d AS (
    DELETE FROM public.sos_messages WHERE created_at < now() - interval '3 months' RETURNING 1
  )
  SELECT count(*)::integer FROM d;
$function$;

REVOKE EXECUTE ON FUNCTION public.purge_old_sos_messages() FROM PUBLIC, anon, authenticated;

DO $cron$
BEGIN
  PERFORM cron.unschedule('sos-text-nudges')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sos-text-nudges');
  PERFORM cron.schedule('sos-text-nudges', '* * * * *', 'SELECT public.sos_text_nudges();');

  PERFORM cron.unschedule('purge-old-sos-messages')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-old-sos-messages');
  PERFORM cron.schedule('purge-old-sos-messages', '35 5 * * *', 'SELECT public.purge_old_sos_messages();');
END
$cron$;
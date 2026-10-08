-- Chamada de vídeo (SOS e consulta): um cronômetro só para os dois lados.
--
-- Antes cada lado contava o tempo no próprio aparelho, cada um começando
-- quando achava que estava conectado, e só o psicólogo gravava o tempo no
-- banco. Os dois relógios andavam diferentes (segundos ou até minutos).
--
-- Agora o banco é a única fonte: o tempo de chamada é o que ele já soma com os
-- DOIS lados conectados (media_seconds, a mesma conta que decide se a consulta
-- aconteceu). O cronômetro começa quando o segundo lado confirma áudio/vídeo,
-- pausa quando um dos dois cai e os dois aparelhos mostram o valor do banco.

-- 1. Limite de tempo da sala: SOS pelo pedido (hoje 25 min), consulta 50 min.
CREATE OR REPLACE FUNCTION public.call_time_limit_seconds(p_session_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN s.emergency_request_id IS NOT NULL THEN
      COALESCE((SELECT er.time_limit_seconds FROM public.emergency_requests er WHERE er.id = s.emergency_request_id), 25 * 60)
    ELSE 50 * 60
  END
  FROM public.webrtc_sessions s
  WHERE s.id = p_session_id;
$function$;

REVOKE EXECUTE ON FUNCTION public.call_time_limit_seconds(uuid) FROM PUBLIC, anon, authenticated;

-- 2. Pelo app ninguém grava mais o cronômetro (nem o psicólogo): só o banco.
CREATE OR REPLACE FUNCTION public.guard_webrtc_client_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  NEW.id := OLD.id;
  NEW.emergency_request_id := OLD.emergency_request_id;
  NEW.created_at := OLD.created_at;
  NEW.expires_at := OLD.expires_at;
  NEW.connected_at := OLD.connected_at;
  NEW.patient_media_at := OLD.patient_media_at;
  NEW.psychologist_media_at := OLD.psychologist_media_at;
  NEW.media_seconds := OLD.media_seconds;
  NEW.media_tick_at := OLD.media_tick_at;
  NEW.media_tracked := OLD.media_tracked;
  NEW.time_left_seconds := OLD.time_left_seconds;
  NEW.timer_paused := OLD.timer_paused;
  NEW.timer_updated_at := OLD.timer_updated_at;

  -- Um lado vazio só pode ser preenchido por quem está chamando.
  IF OLD.patient_id IS NOT NULL OR NEW.patient_id IS DISTINCT FROM v_uid THEN
    NEW.patient_id := OLD.patient_id;
  END IF;
  IF OLD.psychologist_id IS NOT NULL OR NEW.psychologist_id IS DISTINCT FROM v_uid THEN
    NEW.psychologist_id := OLD.psychologist_id;
  END IF;

  IF NEW.answer IS NOT NULL AND NEW.answer IS DISTINCT FROM OLD.answer
     AND v_uid IS DISTINCT FROM NEW.patient_id THEN
    NEW.answer := OLD.answer;
  END IF;

  IF NEW.ended_by IS NOT NULL AND NEW.ended_by IS DISTINCT FROM OLD.ended_by THEN
    NEW.ended_by := v_uid;
    NEW.ended_by_type := CASE WHEN v_uid = NEW.psychologist_id THEN 'psychologist' ELSE 'patient' END;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. Cada aviso de mídia (ao conectar, cair e a cada ~20 s) soma o tempo com
--    os dois conectados e atualiza o tempo restante que a rotina do SOS usa.
CREATE OR REPLACE FUNCTION public.report_call_media(p_session_id uuid, p_connected boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  s public.webrtc_sessions%ROWTYPE;
  v_type text;
  v_both boolean;
  v_limit integer;
BEGIN
  SELECT * INTO s FROM public.webrtc_sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND OR v_uid IS NULL OR v_uid NOT IN (COALESCE(s.patient_id, '00000000-0000-0000-0000-000000000000'::uuid),
                                                 COALESCE(s.psychologist_id, '00000000-0000-0000-0000-000000000000'::uuid)) THEN
    RAISE EXCEPTION 'Sala não encontrada' USING ERRCODE = '42501';
  END IF;
  v_type := CASE WHEN v_uid = s.psychologist_id THEN 'psychologist' ELSE 'patient' END;

  INSERT INTO public.participant_presence (session_id, user_id, user_type, last_seen, media_connected, media_changed_at)
  VALUES (p_session_id, v_uid, v_type, now(), p_connected, now())
  ON CONFLICT (session_id, user_id) DO UPDATE
  SET last_seen = now(),
      media_connected = EXCLUDED.media_connected,
      media_changed_at = CASE
        WHEN participant_presence.media_connected IS DISTINCT FROM EXCLUDED.media_connected THEN now()
        ELSE participant_presence.media_changed_at
      END;

  IF s.status IS DISTINCT FROM 'completed' THEN
    -- Os dois lados com mídia passando e com sinal recente.
    SELECT count(*) = 2 INTO v_both
    FROM public.participant_presence pp
    WHERE pp.session_id = p_session_id
      AND pp.user_id IN (s.patient_id, s.psychologist_id)
      AND pp.media_connected
      AND pp.last_seen > now() - interval '60 seconds';

    v_limit := public.call_time_limit_seconds(p_session_id);

    UPDATE public.webrtc_sessions
    SET patient_media_at = CASE WHEN p_connected AND v_type = 'patient' THEN COALESCE(patient_media_at, now()) ELSE patient_media_at END,
        psychologist_media_at = CASE WHEN p_connected AND v_type = 'psychologist' THEN COALESCE(psychologist_media_at, now()) ELSE psychologist_media_at END,
        -- Soma o intervalo desde o último aviso com os dois conectados (no
        -- máximo 60 s, para uma lacuna sem avisos não contar como conversa).
        -- Soma também quando este aviso é de queda: o trecho até a queda foi
        -- conversa, e o cronômetro na tela não volta para trás ao pausar.
        media_seconds = media_seconds + CASE
          WHEN media_tick_at IS NOT NULL
            THEN LEAST(60, GREATEST(0, EXTRACT(EPOCH FROM (now() - media_tick_at))))::integer
          ELSE 0
        END,
        media_tick_at = CASE WHEN v_both THEN now() ELSE NULL END
    WHERE id = p_session_id
    RETURNING * INTO s;

    -- Tempo restante (rotina de fim do SOS): sempre a partir da mesma conta.
    UPDATE public.webrtc_sessions
    SET time_left_seconds = GREATEST(0, v_limit - s.media_seconds),
        timer_paused = NOT v_both,
        timer_updated_at = now()
    WHERE id = p_session_id;
  END IF;

  SELECT * INTO s FROM public.webrtc_sessions WHERE id = p_session_id;
  RETURN jsonb_build_object('connected', s.connected_at IS NOT NULL, 'media_seconds', s.media_seconds);
END;
$function$;

-- 4. O cronômetro que os dois aparelhos mostram: tempo com os dois conectados
--    até agora (somado + o trecho desde o último aviso) e se está correndo.
CREATE OR REPLACE FUNCTION public.call_clock(p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  s public.webrtc_sessions%ROWTYPE;
  v_live numeric := 0;
  v_running boolean;
BEGIN
  SELECT * INTO s FROM public.webrtc_sessions WHERE id = p_session_id;
  IF NOT FOUND OR v_uid IS NULL OR v_uid NOT IN (COALESCE(s.patient_id, '00000000-0000-0000-0000-000000000000'::uuid),
                                                 COALESCE(s.psychologist_id, '00000000-0000-0000-0000-000000000000'::uuid)) THEN
    RAISE EXCEPTION 'Sala não encontrada' USING ERRCODE = '42501';
  END IF;

  -- Correndo: os dois conectados no último aviso, e ele é recente.
  v_running := s.status IS DISTINCT FROM 'completed'
    AND s.media_tick_at IS NOT NULL
    AND s.media_tick_at > now() - interval '60 seconds';
  IF s.media_tick_at IS NOT NULL THEN
    v_live := LEAST(60, GREATEST(0, EXTRACT(EPOCH FROM (now() - s.media_tick_at))));
  END IF;

  RETURN jsonb_build_object(
    'elapsed_seconds', s.media_seconds + v_live,
    'running', v_running,
    'limit_seconds', public.call_time_limit_seconds(p_session_id),
    'started', s.connected_at IS NOT NULL OR s.media_seconds > 0 OR s.media_tick_at IS NOT NULL
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.call_clock(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.call_clock(uuid) TO authenticated;

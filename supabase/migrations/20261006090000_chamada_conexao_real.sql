-- Chamada de vídeo (SOS e consulta): conexão real, sinalização sem perdas e
-- fluxos alternativos para nenhum atendimento ser perdido e contado.

-- 1. Cada lado informa quando a mídia (áudio/vídeo) realmente passou. Antes a
--    chamada contava como "conectada" assim que o paciente respondia à oferta,
--    mesmo que a conexão nunca se formasse (rede bloqueada, sem TURN): o SOS
--    era gasto e a consulta podia ser concluída e paga sem ninguém se ver.
ALTER TABLE public.webrtc_sessions
  ADD COLUMN IF NOT EXISTS patient_media_at timestamptz,
  ADD COLUMN IF NOT EXISTS psychologist_media_at timestamptz,
  ADD COLUMN IF NOT EXISTS renegotiate_requested_at timestamptz;

-- Estado atual da mídia de cada participante (junto do "estou na sala").
ALTER TABLE public.participant_presence
  ADD COLUMN IF NOT EXISTS media_connected boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS media_changed_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.track_call_connected()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Depois de conectada, fica conectada (nem o app nem uma reconexão apagam).
  IF TG_OP = 'UPDATE' AND OLD.connected_at IS NOT NULL THEN
    NEW.connected_at := OLD.connected_at;
  -- Só conta quando os DOIS lados confirmaram áudio/vídeo passando.
  ELSIF NEW.patient_media_at IS NOT NULL AND NEW.psychologist_media_at IS NOT NULL THEN
    NEW.connected_at := COALESCE(NEW.connected_at, GREATEST(NEW.patient_media_at, NEW.psychologist_media_at));
  ELSIF current_user = 'authenticated' THEN
    NEW.connected_at := NULL;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sos_call_connected(p_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.webrtc_sessions s
    WHERE s.emergency_request_id = p_request_id
      AND s.connected_at IS NOT NULL
  );
$function$;

CREATE OR REPLACE FUNCTION public.appointment_call_connected(p_video_room_id text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT p_video_room_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.webrtc_sessions s
    WHERE s.id::text = p_video_room_id
      AND s.connected_at IS NOT NULL
  );
$function$;

-- Pelo app ninguém grava as confirmações de mídia direto (só pela função abaixo).
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

  IF v_uid IS DISTINCT FROM NEW.psychologist_id THEN
    NEW.time_left_seconds := OLD.time_left_seconds;
    NEW.timer_paused := OLD.timer_paused;
    NEW.timer_updated_at := OLD.timer_updated_at;
  ELSIF OLD.time_left_seconds IS NOT NULL AND NEW.time_left_seconds > OLD.time_left_seconds THEN
    NEW.time_left_seconds := OLD.time_left_seconds;
  END IF;

  IF NEW.ended_by IS NOT NULL AND NEW.ended_by IS DISTINCT FROM OLD.ended_by THEN
    NEW.ended_by := v_uid;
    NEW.ended_by_type := CASE WHEN v_uid = NEW.psychologist_id THEN 'psychologist' ELSE 'patient' END;
  END IF;

  RETURN NEW;
END;
$function$;

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
BEGIN
  SELECT * INTO s FROM public.webrtc_sessions WHERE id = p_session_id;
  IF NOT FOUND OR v_uid IS NULL OR v_uid NOT IN (COALESCE(s.patient_id, '00000000-0000-0000-0000-000000000000'::uuid),
                                                 COALESCE(s.psychologist_id, '00000000-0000-0000-0000-000000000000'::uuid)) THEN
    RAISE EXCEPTION 'Sala não encontrada' USING ERRCODE = '42501';
  END IF;
  v_type := CASE WHEN v_uid = s.psychologist_id THEN 'psychologist' ELSE 'patient' END;

  IF p_connected AND s.status IS DISTINCT FROM 'completed' THEN
    UPDATE public.webrtc_sessions
    SET patient_media_at = CASE WHEN v_type = 'patient' THEN COALESCE(patient_media_at, now()) ELSE patient_media_at END,
        psychologist_media_at = CASE WHEN v_type = 'psychologist' THEN COALESCE(psychologist_media_at, now()) ELSE psychologist_media_at END
    WHERE id = p_session_id;
  END IF;

  INSERT INTO public.participant_presence (session_id, user_id, user_type, last_seen, media_connected, media_changed_at)
  VALUES (p_session_id, v_uid, v_type, now(), p_connected, now())
  ON CONFLICT (session_id, user_id) DO UPDATE
  SET last_seen = now(),
      media_connected = EXCLUDED.media_connected,
      media_changed_at = CASE
        WHEN participant_presence.media_connected IS DISTINCT FROM EXCLUDED.media_connected THEN now()
        ELSE participant_presence.media_changed_at
      END;

  SELECT * INTO s FROM public.webrtc_sessions WHERE id = p_session_id;
  RETURN jsonb_build_object('connected', s.connected_at IS NOT NULL);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.report_call_media(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_call_media(uuid, boolean) TO authenticated;

-- 2. Candidatos de conexão (ICE): cada lado lia a lista, somava o seu e
--    regravava a lista inteira. Com os dois lados gravando ao mesmo tempo, um
--    apagava os candidatos do outro e a chamada não conectava (principalmente
--    pelo TURN). Agora cada envio é somado no banco, numa única operação.
CREATE OR REPLACE FUNCTION public.append_webrtc_ice_candidates(p_session_id uuid, p_candidates jsonb)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF jsonb_typeof(p_candidates) IS DISTINCT FROM 'array' OR jsonb_array_length(p_candidates) = 0 THEN
    RETURN;
  END IF;
  IF jsonb_array_length(p_candidates) > 50 THEN
    RAISE EXCEPTION 'Candidatos demais' USING ERRCODE = '22023';
  END IF;

  -- Sem SECURITY DEFINER: as regras de quem pode alterar a sala continuam valendo.
  UPDATE public.webrtc_sessions s
  SET ice_candidates = (
    SELECT array_agg(x.c ORDER BY x.o)
    FROM (
      SELECT t.c, t.o
      FROM unnest(COALESCE(s.ice_candidates, '{}'::jsonb[]) || ARRAY(SELECT jsonb_array_elements(p_candidates)))
        WITH ORDINALITY AS t(c, o)
      ORDER BY t.o DESC
      LIMIT 300
    ) x
  )
  WHERE s.id = p_session_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.append_webrtc_ice_candidates(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.append_webrtc_ice_candidates(uuid, jsonb) TO authenticated;

-- 3. "Chamar outro psicólogo" também quando os dois estão na sala mas a
--    chamada não conecta (antes só valia se o psicólogo sumisse, e o paciente
--    ficava preso em "reconectando").
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
      'A chamada do atendimento de SOS não conseguiu se manter e o paciente foi encaminhado para outro profissional.',
      'unread', true, '/psychologist-dashboard'
    );
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$function$;

-- 4. Encerrar por falha de conexão devolve o SOS ao paciente.
CREATE OR REPLACE FUNCTION public.refund_sos_on_failed_call()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.started_at IS NOT NULL
     AND NEW.status IN ('cancelled', 'completed')
     AND OLD.status IS DISTINCT FROM NEW.status
     AND (
       -- Psicólogo sumiu, os dois perderam o sinal ou a conexão não se manteve:
       -- devolve mesmo que a chamada tenha chegado a conectar.
       NEW.end_reason IN ('abandoned', 'psychologist_unavailable', 'connection_failure')
       -- Qualquer outro fim sem os dois lados chegarem a se ver/ouvir.
       OR NOT public.sos_call_connected(NEW.id)
     ) THEN
    UPDATE public.subscribers
    SET sos_used_this_month = false, updated_at = now()
    WHERE user_id = NEW.patient_id;
  END IF;
  RETURN NEW;
END;
$function$;

-- 5. Limite de tempo pelo cronômetro da sala (que pausa nas quedas). Antes a
--    rotina encerrava pelo relógio desde o início: depois de uma queda longa a
--    chamada era cortada com tempo ainda sobrando na tela.
CREATE OR REPLACE FUNCTION public.finalize_stale_emergency_sessions()
RETURNS TABLE(expired_count integer, timed_out_count integer, abandoned_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_expired integer := 0;
  v_timeout integer := 0;
  v_abandoned integer := 0;
  v_grace constant interval := interval '1 minute';
  v_pending_ttl constant interval := interval '10 minutes';
  v_presence_ttl constant interval := interval '10 minutes';
  v_hard_cap constant interval := interval '30 minutes';
BEGIN
  WITH updated AS (
    UPDATE public.emergency_requests
    SET status = 'cancelled',
        ended_at = now(),
        ended_by_type = 'system',
        end_reason = 'expired',
        updated_at = now()
    WHERE status = 'pending'
      AND created_at < now() - v_pending_ttl
    RETURNING id
  ),
  logged AS (
    INSERT INTO public.sos_trace_events (trace_id, emergency_request_id, event_type, actor_type, message)
    SELECT 'req:' || id::text, id, 'call_finalized_by_system', 'system', 'expired'
    FROM updated
    RETURNING 1
  )
  SELECT count(*)::integer INTO v_expired FROM logged;

  WITH updated AS (
    UPDATE public.emergency_requests er
    SET status = 'completed',
        ended_at = now(),
        ended_by_type = 'system',
        end_reason = 'time_limit',
        duration = GREATEST(0, EXTRACT(EPOCH FROM (now() - er.started_at))::integer),
        updated_at = now()
    WHERE er.status = 'in_progress'
      AND er.started_at IS NOT NULL
      AND (
        -- Teto absoluto, com ou sem cronômetro.
        er.started_at < now() - (make_interval(secs => er.time_limit_seconds) + v_hard_cap)
        OR EXISTS (
          SELECT 1 FROM public.webrtc_sessions ws
          WHERE ws.emergency_request_id = er.id
            AND ws.time_left_seconds IS NOT NULL
            AND ws.timer_updated_at IS NOT NULL
            AND (
              (ws.time_left_seconds = 0 AND ws.timer_updated_at < now() - v_grace)
              -- Correndo e o psicólogo ainda atualizando: o tempo acabou mesmo.
              OR (NOT COALESCE(ws.timer_paused, false)
                  AND ws.timer_updated_at > now() - interval '2 minutes'
                  AND ws.timer_updated_at + make_interval(secs => ws.time_left_seconds) + v_grace < now())
            )
        )
        -- Salas antigas, sem cronômetro gravado: regra de antes.
        OR (
          NOT EXISTS (
            SELECT 1 FROM public.webrtc_sessions ws
            WHERE ws.emergency_request_id = er.id AND ws.time_left_seconds IS NOT NULL
          )
          AND er.started_at < now() - (make_interval(secs => er.time_limit_seconds) + v_grace)
        )
      )
    RETURNING er.id
  ),
  logged AS (
    INSERT INTO public.sos_trace_events (trace_id, emergency_request_id, event_type, actor_type, message)
    SELECT 'req:' || id::text, id, 'call_finalized_by_system', 'system', 'time_limit'
    FROM updated
    RETURNING 1
  )
  SELECT count(*)::integer INTO v_timeout FROM logged;

  WITH updated AS (
    UPDATE public.emergency_requests er
    SET status = 'cancelled',
        ended_at = now(),
        ended_by_type = 'system',
        end_reason = 'abandoned',
        updated_at = now()
    WHERE er.status IN ('accepted', 'in_progress')
      AND COALESCE(er.started_at, er.accepted_at, er.created_at) < now() - v_presence_ttl
      AND NOT EXISTS (
        SELECT 1
        FROM public.webrtc_sessions ws
        JOIN public.participant_presence pp ON pp.session_id = ws.id
        WHERE ws.emergency_request_id = er.id
          AND pp.last_seen > now() - v_presence_ttl
      )
    RETURNING er.id AS id
  ),
  logged AS (
    INSERT INTO public.sos_trace_events (trace_id, emergency_request_id, event_type, actor_type, message)
    SELECT 'req:' || id::text, id, 'call_finalized_by_system', 'system', 'abandoned'
    FROM updated
    RETURNING 1
  )
  SELECT count(*)::integer INTO v_abandoned FROM logged;

  UPDATE public.webrtc_sessions ws
  SET status = 'completed',
      ended_at = COALESCE(ws.ended_at, er.ended_at, now()),
      ended_by_type = COALESCE(ws.ended_by_type, er.ended_by_type, 'system'),
      end_reason = COALESCE(ws.end_reason, er.end_reason),
      updated_at = now()
  FROM public.emergency_requests er
  WHERE ws.emergency_request_id = er.id
    AND er.status IN ('completed', 'cancelled')
    AND ws.status <> 'completed';

  RETURN QUERY SELECT v_expired, v_timeout, v_abandoned;
END;
$function$;

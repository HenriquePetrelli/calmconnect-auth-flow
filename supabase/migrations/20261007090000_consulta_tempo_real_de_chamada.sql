-- Consultas agendadas: só conta (consulta do mês usada, repasse ao psicólogo)
-- quando os dois ficaram de fato em chamada por pelo menos 5 minutos.
--
-- Antes bastava a chamada conectar um instante: se caísse logo depois e
-- ninguém conseguisse voltar, a rotina fechava a consulta como "realizada", o
-- paciente perdia a consulta do mês e o psicólogo recebia.

-- 1. Tempo de chamada com os DOIS conectados, somado pelo banco. Cada lado
--    avisa a cada ~20 s que a mídia está passando (report_call_media); o banco
--    soma o intervalo desde o último aviso enquanto os dois estão conectados.
ALTER TABLE public.webrtc_sessions
  ADD COLUMN IF NOT EXISTS media_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS media_tick_at timestamptz,
  -- Salas antigas não têm essa contagem: para elas vale a regra de antes.
  ADD COLUMN IF NOT EXISTS media_tracked boolean NOT NULL DEFAULT false;
ALTER TABLE public.webrtc_sessions ALTER COLUMN media_tracked SET DEFAULT true;

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
  v_both boolean;
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

    UPDATE public.webrtc_sessions
    SET patient_media_at = CASE WHEN p_connected AND v_type = 'patient' THEN COALESCE(patient_media_at, now()) ELSE patient_media_at END,
        psychologist_media_at = CASE WHEN p_connected AND v_type = 'psychologist' THEN COALESCE(psychologist_media_at, now()) ELSE psychologist_media_at END,
        -- Soma o intervalo desde o último aviso (no máximo 60 s, para uma
        -- lacuna sem avisos não contar como conversa).
        media_seconds = media_seconds + CASE
          WHEN v_both AND media_tick_at IS NOT NULL
            THEN LEAST(60, GREATEST(0, EXTRACT(EPOCH FROM (now() - media_tick_at))))::integer
          ELSE 0
        END,
        media_tick_at = CASE WHEN v_both THEN now() ELSE NULL END
    WHERE id = p_session_id;
  END IF;

  SELECT * INTO s FROM public.webrtc_sessions WHERE id = p_session_id;
  RETURN jsonb_build_object('connected', s.connected_at IS NOT NULL, 'media_seconds', s.media_seconds);
END;
$function$;

-- 2. "A consulta aconteceu": conectou e os dois ficaram pelo menos 5 minutos
--    em chamada. Vale para concluir (pelo app ou pela rotina) e para o repasse.
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
      AND (NOT s.media_tracked OR s.media_seconds >= 300)
  );
$function$;

-- 3. Rotina de fechamento (30 min após o fim do horário): realizada,
--    interrompida (conectou mas não chegou a 5 min) ou não realizada.
CREATE OR REPLACE FUNCTION public.finalize_stale_appointments()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  v_count integer := 0;
  v_connected boolean;
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
      SELECT EXISTS (
        SELECT 1 FROM public.webrtc_sessions s
        WHERE s.id::text = r.video_room_id AND s.connected_at IS NOT NULL
      ) INTO v_connected;

      IF v_connected THEN
        -- Conectou, mas a chamada caiu e não voltou: não conta para ninguém.
        UPDATE public.appointments
        SET status = 'cancelled',
            cancelled_at = now(),
            cancellation_reason = 'Interrompida: a chamada durou menos de 5 minutos com os dois conectados'
        WHERE id = r.id;
      ELSE
        UPDATE public.appointments SET status = 'no_show' WHERE id = r.id;
      END IF;

      IF r.appointment_type = 'regular' THEN
        PERFORM public.release_appointment_quota(r.id);
      END IF;

      INSERT INTO public.notifications (patient_id, appointment_id, title, message, status, push, link)
      VALUES
        (r.patient_id, r.id,
         CASE WHEN v_connected THEN 'Consulta interrompida' ELSE 'Consulta não realizada' END,
         'A consulta de ' || public.format_br_datetime(r.scheduled_at) || ' '
           || CASE WHEN v_connected THEN 'foi interrompida (a chamada caiu e não voltou).' ELSE 'não aconteceu (a chamada não chegou a conectar).' END
           || CASE WHEN r.appointment_type = 'regular' THEN ' Sua consulta do mês foi devolvida: você pode agendar outro horário.' ELSE '' END,
         'unread', true, '/appointments'),
        (r.psychologist_id, r.id,
         CASE WHEN v_connected THEN 'Consulta interrompida' ELSE 'Consulta não realizada' END,
         'A consulta de ' || public.format_br_datetime(r.scheduled_at) || ' '
           || CASE WHEN v_connected THEN 'foi interrompida (a chamada caiu e não voltou) e não entra no repasse.' ELSE 'não aconteceu (a chamada não chegou a conectar).' END,
         'unread', true, '/psychologist-dashboard');
    END IF;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$function$;

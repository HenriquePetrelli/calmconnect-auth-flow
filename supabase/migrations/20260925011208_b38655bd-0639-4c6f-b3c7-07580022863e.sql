-- Duração da chamada SOS conforme o plano do paciente.
--
-- A tela de planos vende 25 min (Plus) e 50 min (Premium), mas
-- EmergencyCall nunca passava timeLimit para EmergencyVideoCall, que caía
-- no próprio padrão de 20 min — e finalize_stale_emergency_sessions
-- também cortava toda chamada em 20 min fixos. O limite passa a ser
-- gravado no próprio chamado, no servidor, a partir do tier do paciente no
-- momento da abertura (o cliente não escolhe a própria duração).

ALTER TABLE public.emergency_requests
  ADD COLUMN IF NOT EXISTS time_limit_seconds integer NOT NULL DEFAULT 1200
  CHECK (time_limit_seconds > 0);

CREATE OR REPLACE FUNCTION public.set_emergency_time_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tier text;
BEGIN
  SELECT s.subscription_tier INTO v_tier
  FROM public.subscribers s
  WHERE s.user_id = NEW.patient_id AND s.subscribed = true
  LIMIT 1;

  NEW.time_limit_seconds := CASE v_tier
    WHEN 'Premium' THEN 50 * 60
    WHEN 'Plus' THEN 25 * 60
    ELSE 20 * 60
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_emergency_time_limit ON public.emergency_requests;
CREATE TRIGGER set_emergency_time_limit
BEFORE INSERT ON public.emergency_requests
FOR EACH ROW EXECUTE FUNCTION public.set_emergency_time_limit();

-- Mesmo corpo da versão de 20260810000619, trocando o limite fixo de 20 min
-- pelo limite gravado em cada chamado.
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
    UPDATE public.emergency_requests
    SET status = 'completed',
        ended_at = now(),
        ended_by_type = 'system',
        end_reason = 'time_limit',
        duration = GREATEST(0, EXTRACT(EPOCH FROM (now() - started_at))::integer),
        updated_at = now()
    WHERE status = 'in_progress'
      AND started_at IS NOT NULL
      AND started_at < now() - (make_interval(secs => time_limit_seconds) + v_grace)
    RETURNING id
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
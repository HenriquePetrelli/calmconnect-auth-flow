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
  v_call_limit constant interval := interval '20 minutes';
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
  )
  SELECT count(*)::integer INTO v_expired FROM updated;

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
      AND started_at < now() - (v_call_limit + v_grace)
    RETURNING id
  )
  SELECT count(*)::integer INTO v_timeout FROM updated;

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
    RETURNING er.id
  )
  SELECT count(*)::integer INTO v_abandoned FROM updated;

  -- close the video rooms, propagating WHO ended it and WHY so both clients
  -- can render the termination notice from the session row alone.
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
CREATE TABLE public.sos_trace_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id text NOT NULL,
  emergency_request_id uuid REFERENCES public.emergency_requests(id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.webrtc_sessions(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  actor_user_id uuid,
  actor_type text NOT NULL DEFAULT 'system',
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.sos_trace_events TO authenticated;
GRANT ALL ON public.sos_trace_events TO service_role;

ALTER TABLE public.sos_trace_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_sos_trace_events_trace ON public.sos_trace_events (trace_id, created_at);
CREATE INDEX idx_sos_trace_events_request ON public.sos_trace_events (emergency_request_id, created_at);
CREATE INDEX idx_sos_trace_events_created ON public.sos_trace_events (created_at DESC);

CREATE POLICY "Authenticated users can log their own trace events"
ON public.sos_trace_events
FOR INSERT
TO authenticated
WITH CHECK (actor_user_id = auth.uid());

CREATE POLICY "Participants can view trace events of their calls"
ON public.sos_trace_events
FOR SELECT
TO authenticated
USING (
  actor_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.emergency_requests er
    WHERE er.id = sos_trace_events.emergency_request_id
      AND (er.patient_id = auth.uid() OR er.accepted_by = auth.uid())
  )
);

CREATE POLICY "Admins can view all trace events"
ON public.sos_trace_events
FOR SELECT
TO authenticated
USING (public.is_super_admin());

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
      AND started_at < now() - (v_call_limit + v_grace)
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
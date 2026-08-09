-- 1. Persisted participant presence (heartbeat) -----------------------------
CREATE TABLE IF NOT EXISTS public.participant_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  user_id uuid NOT NULL,
  user_type text NOT NULL CHECK (user_type IN ('patient', 'psychologist')),
  last_seen timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.participant_presence TO authenticated;
GRANT ALL ON public.participant_presence TO service_role;

ALTER TABLE public.participant_presence ENABLE ROW LEVEL SECURITY;

-- Each user manages only their own heartbeat row.
CREATE POLICY "Users manage their own presence"
ON public.participant_presence
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Participants of the same WebRTC session can see each other's presence.
CREATE POLICY "Session participants can view presence"
ON public.participant_presence
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.webrtc_sessions ws
    WHERE ws.id = participant_presence.session_id
      AND (ws.patient_id = auth.uid() OR ws.psychologist_id = auth.uid())
  )
);

CREATE INDEX IF NOT EXISTS idx_participant_presence_session
  ON public.participant_presence (session_id, last_seen DESC);

CREATE TRIGGER update_participant_presence_updated_at
BEFORE UPDATE ON public.participant_presence
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.participant_presence;

-- 2. Server-side finalization of stale emergency sessions --------------------
CREATE OR REPLACE FUNCTION public.finalize_stale_emergency_sessions()
RETURNS TABLE(expired_count integer, timed_out_count integer, abandoned_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_expired integer := 0;
  v_timeout integer := 0;
  v_abandoned integer := 0;
  v_call_limit constant interval := interval '20 minutes';
  v_grace constant interval := interval '1 minute';
  v_pending_ttl constant interval := interval '10 minutes';
  v_presence_ttl constant interval := interval '10 minutes';
BEGIN
  -- 2a. pending requests nobody accepted -> cancelled / expired
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

  -- 2b. in_progress calls past the hard time limit -> completed / time_limit
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

  -- 2c. accepted/in_progress with no heartbeat at all -> cancelled / abandoned
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

  -- 2d. close the video rooms of every request that is no longer live
  UPDATE public.webrtc_sessions ws
  SET status = 'completed',
      ended_at = COALESCE(ws.ended_at, now()),
      updated_at = now()
  FROM public.emergency_requests er
  WHERE ws.emergency_request_id = er.id
    AND er.status IN ('completed', 'cancelled')
    AND ws.status <> 'completed';

  RETURN QUERY SELECT v_expired, v_timeout, v_abandoned;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_stale_emergency_sessions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_stale_emergency_sessions() TO service_role;

-- 3. Run it every minute -----------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

SELECT cron.unschedule('finalize-stale-emergency-sessions')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'finalize-stale-emergency-sessions'
);

SELECT cron.schedule(
  'finalize-stale-emergency-sessions',
  '* * * * *',
  $cron$SELECT public.finalize_stale_emergency_sessions();$cron$
);
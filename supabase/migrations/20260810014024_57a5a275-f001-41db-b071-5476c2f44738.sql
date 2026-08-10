-- 1. Allow the official state machine (adds in_progress)
ALTER TABLE public.emergency_requests DROP CONSTRAINT IF EXISTS emergency_requests_status_check;
ALTER TABLE public.emergency_requests
  ADD CONSTRAINT emergency_requests_status_check
  CHECK (status = ANY (ARRAY['pending','accepted','in_progress','completed','cancelled']));

-- 2. Server-side state machine guard (no backward transitions)
CREATE OR REPLACE FUNCTION public.enforce_emergency_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  allowed boolean := false;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  allowed := CASE OLD.status
    WHEN 'pending'     THEN NEW.status IN ('accepted','cancelled')
    WHEN 'accepted'    THEN NEW.status IN ('in_progress','completed','cancelled')
    WHEN 'in_progress' THEN NEW.status IN ('completed','cancelled')
    ELSE false -- completed / cancelled are terminal
  END;

  IF NOT allowed THEN
    RAISE EXCEPTION 'Transição de estado inválida no SOS: % -> %', OLD.status, NEW.status
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_emergency_status_transition ON public.emergency_requests;
CREATE TRIGGER enforce_emergency_status_transition
  BEFORE UPDATE OF status ON public.emergency_requests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_emergency_status_transition();

-- 3. Release the psychologist from "in call" whenever the request finishes
CREATE OR REPLACE FUNCTION public.release_psychologist_on_emergency_end()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IN ('completed','cancelled')
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE public.psychologist_presence
    SET current_emergency_id = NULL,
        updated_at = now()
    WHERE current_emergency_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS release_psychologist_on_emergency_end ON public.emergency_requests;
CREATE TRIGGER release_psychologist_on_emergency_end
  AFTER UPDATE OF status ON public.emergency_requests
  FOR EACH ROW EXECUTE FUNCTION public.release_psychologist_on_emergency_end();

-- 4. Real availability: heartbeat freshness + not in a call
CREATE OR REPLACE FUNCTION public.count_available_psychologists()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT count(*)::int
  FROM public.psychologist_presence pp
  JOIN public.psychologists p ON p.user_id = pp.psychologist_id
  WHERE pp.last_online > now() - interval '3 minutes'
    AND pp.current_emergency_id IS NULL
    AND p.approved = true
    AND p.approval_status = 'approved'
    AND COALESCE(p.is_blocked, false) = false;
$$;

CREATE OR REPLACE FUNCTION public.psychologist_can_attend(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.psychologists p
    WHERE p.user_id = p_user_id
      AND p.approved = true
      AND p.approval_status = 'approved'
      AND COALESCE(p.is_blocked, false) = false
      AND (p.blocked_until IS NULL OR p.blocked_until < now())
  );
$$;

REVOKE EXECUTE ON FUNCTION public.count_available_psychologists() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.count_available_psychologists() TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.psychologist_can_attend(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.psychologist_can_attend(uuid) TO authenticated, service_role;

-- 5. Presence pruning: a closed tab must not stay "online" forever
CREATE OR REPLACE FUNCTION public.prune_stale_psychologist_presence()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  removed integer;
BEGIN
  WITH gone AS (
    DELETE FROM public.psychologist_presence
    WHERE last_online < now() - interval '5 minutes'
    RETURNING 1
  )
  SELECT count(*)::int INTO removed FROM gone;
  RETURN removed;
END;
$$;

-- 6. Richer operational metrics (server-side aggregation)
CREATE OR REPLACE FUNCTION public.get_sos_metrics(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_since timestamptz := now() - make_interval(days => GREATEST(COALESCE(p_days, 30), 1));
  v_result jsonb;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'total', count(*),
    'attended', count(*) FILTER (WHERE accepted_at IS NOT NULL),
    'unattended', count(*) FILTER (WHERE accepted_at IS NULL AND status = 'cancelled'),
    'in_flight', count(*) FILTER (WHERE ended_at IS NULL AND status IN ('pending','accepted','in_progress')),
    'completed', count(*) FILTER (WHERE status = 'completed'),
    'cancelled_by_patient', count(*) FILTER (WHERE end_reason = 'cancelled_by_patient'),
    'abandoned', count(*) FILTER (WHERE end_reason = 'abandoned'),
    'expired', count(*) FILTER (WHERE end_reason = 'expired'),
    'acceptance_rate', CASE WHEN count(*) = 0 THEN 0
      ELSE round((count(*) FILTER (WHERE accepted_at IS NOT NULL))::numeric * 100 / count(*), 1) END,
    'crisis_resolved_rate', CASE WHEN count(*) FILTER (WHERE crisis_resolved IS NOT NULL) = 0 THEN 0
      ELSE round((count(*) FILTER (WHERE crisis_resolved))::numeric * 100
                 / count(*) FILTER (WHERE crisis_resolved IS NOT NULL), 1) END,
    'avg_accept_seconds', COALESCE(round(avg(EXTRACT(EPOCH FROM (accepted_at - created_at))) FILTER (WHERE accepted_at IS NOT NULL))::int, 0),
    'avg_duration_seconds', COALESCE(round(avg(duration) FILTER (WHERE duration IS NOT NULL AND duration > 0))::int, 0),
    'avg_rating', COALESCE((
      SELECT round(avg(f.rating)::numeric, 2)
      FROM public.session_feedback f
      JOIN public.emergency_requests e2 ON e2.id = f.emergency_request_id
      WHERE e2.created_at >= v_since AND f.user_type = 'patient'
    ), 0),
    'end_reasons', COALESCE((
      SELECT jsonb_object_agg(reason, qty)
      FROM (
        SELECT COALESCE(end_reason, 'desconhecido') AS reason, count(*) AS qty
        FROM public.emergency_requests
        WHERE created_at >= v_since AND ended_at IS NOT NULL
        GROUP BY 1
      ) r
    ), '{}'::jsonb)
  ) INTO v_result
  FROM public.emergency_requests
  WHERE created_at >= v_since;

  RETURN v_result;
END;
$$;

-- 7. Schedule the maintenance jobs that existed but were never scheduled
SELECT cron.unschedule(jobname) FROM cron.job
 WHERE jobname IN ('prune-stale-psychologist-presence','expire-old-conversas','cleanup-quarterly-activities-weekly');

SELECT cron.schedule('prune-stale-psychologist-presence', '*/2 * * * *',
  $$SELECT public.prune_stale_psychologist_presence();$$);
SELECT cron.schedule('expire-old-conversas', '30 3 * * *',
  $$SELECT public.gerenciar_expiracao_conversas();$$);
SELECT cron.schedule('cleanup-quarterly-activities-weekly', '15 3 * * 0',
  $$SELECT public.cleanup_quarterly_activities();$$);
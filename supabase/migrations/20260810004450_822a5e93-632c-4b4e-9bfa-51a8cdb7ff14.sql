
CREATE OR REPLACE FUNCTION public.get_sos_patient_context(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient uuid;
  v_result jsonb;
BEGIN
  SELECT er.patient_id INTO v_patient
  FROM public.emergency_requests er
  WHERE er.id = p_request_id
    AND er.accepted_by = auth.uid()
    AND er.status IN ('accepted', 'in_progress');

  IF v_patient IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'patient', (
      SELECT jsonb_build_object(
        'full_name', p.full_name,
        'city', p.city,
        'state', p.state,
        'symptoms', COALESCE(p.sintomas_selecionados, ARRAY[]::text[]),
        'last_mood_value', p.last_mood_value,
        'last_mood_date', p.last_mood_date
      )
      FROM public.patients p
      WHERE p.user_id = v_patient
      LIMIT 1
    ),
    'progress', COALESCE((
      SELECT jsonb_agg(x)
      FROM (
        SELECT pp.session_date, pp.mood_rating, pp.anxiety_level, pp.stress_level
        FROM public.patient_progress pp
        WHERE pp.patient_id = v_patient
        ORDER BY pp.session_date DESC
        LIMIT 5
      ) x
    ), '[]'::jsonb),
    'sos_total', (
      SELECT count(*) FROM public.emergency_requests e
      WHERE e.patient_id = v_patient
    ),
    'sos_history', COALESCE((
      SELECT jsonb_agg(y)
      FROM (
        SELECT e.id, e.created_at, e.status, e.duration, e.end_reason
        FROM public.emergency_requests e
        WHERE e.patient_id = v_patient AND e.id <> p_request_id
        ORDER BY e.created_at DESC
        LIMIT 5
      ) y
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_sos_patient_context(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_sos_patient_context(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_sos_metrics(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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
    'avg_accept_seconds', COALESCE(round(avg(EXTRACT(EPOCH FROM (accepted_at - created_at))) FILTER (WHERE accepted_at IS NOT NULL))::int, 0),
    'avg_duration_seconds', COALESCE(round(avg(duration) FILTER (WHERE duration IS NOT NULL))::int, 0),
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

REVOKE ALL ON FUNCTION public.get_sos_metrics(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_sos_metrics(integer) TO authenticated, service_role;

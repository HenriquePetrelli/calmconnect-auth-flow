CREATE TABLE IF NOT EXISTS public.internal_secrets (
  name text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.internal_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.internal_secrets FROM PUBLIC, anon, authenticated;
INSERT INTO public.internal_secrets (name, value)
VALUES ('cron_secret', replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''))
ON CONFLICT (name) DO NOTHING;

CREATE OR REPLACE FUNCTION public.internal_cron_secret()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT value FROM public.internal_secrets WHERE name = 'cron_secret';
$$;
REVOKE ALL ON FUNCTION public.internal_cron_secret() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.internal_cron_secret() TO service_role;

DO $$
DECLARE
  j record;
BEGIN
  FOR j IN
    SELECT jobid, command FROM cron.job
    WHERE command LIKE '%/functions/v1/%' AND command NOT LIKE '%x-cron-secret%'
  LOOP
    PERFORM cron.alter_job(
      j.jobid,
      command := regexp_replace(
        j.command,
        '(headers\s*:=\s*''[^'']*''::jsonb)',
        '\1 || jsonb_build_object(''x-cron-secret'', public.internal_cron_secret())'
      )
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, int, int) TO service_role;

CREATE OR REPLACE FUNCTION public.enforce_write_rate_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;
  IF NOT public.check_rate_limit(TG_ARGV[0] || ':' || v_uid::text, TG_ARGV[1]::int, TG_ARGV[2]::int) THEN
    RAISE EXCEPTION 'Muitas ações em pouco tempo. Aguarde um pouco e tente de novo.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_write_rate_limit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS rate_limit_mensagens ON public.mensagens;
CREATE TRIGGER rate_limit_mensagens BEFORE INSERT ON public.mensagens
  FOR EACH ROW EXECUTE FUNCTION public.enforce_write_rate_limit('mensagens', '30', '60');
DROP TRIGGER IF EXISTS rate_limit_conversas ON public.conversas;
CREATE TRIGGER rate_limit_conversas BEFORE INSERT ON public.conversas
  FOR EACH ROW EXECUTE FUNCTION public.enforce_write_rate_limit('conversas', '10', '3600');
DROP TRIGGER IF EXISTS rate_limit_group_testimonials ON public.group_testimonials;
CREATE TRIGGER rate_limit_group_testimonials BEFORE INSERT ON public.group_testimonials
  FOR EACH ROW EXECUTE FUNCTION public.enforce_write_rate_limit('depoimentos', '5', '3600');
DROP TRIGGER IF EXISTS rate_limit_group_testimonial_likes ON public.group_testimonial_likes;
CREATE TRIGGER rate_limit_group_testimonial_likes BEFORE INSERT ON public.group_testimonial_likes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_write_rate_limit('curtidas', '60', '60');
DROP TRIGGER IF EXISTS rate_limit_session_feedback ON public.session_feedback;
CREATE TRIGGER rate_limit_session_feedback BEFORE INSERT ON public.session_feedback
  FOR EACH ROW EXECUTE FUNCTION public.enforce_write_rate_limit('avaliacoes', '10', '3600');
DROP TRIGGER IF EXISTS rate_limit_notifications ON public.notifications;
CREATE TRIGGER rate_limit_notifications BEFORE INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.enforce_write_rate_limit('notificacoes', '30', '60');
DROP TRIGGER IF EXISTS rate_limit_sos_trace_events ON public.sos_trace_events;
CREATE TRIGGER rate_limit_sos_trace_events BEFORE INSERT ON public.sos_trace_events
  FOR EACH ROW EXECUTE FUNCTION public.enforce_write_rate_limit('sos-trace', '200', '60');
DROP TRIGGER IF EXISTS rate_limit_problem_reports ON public.appointment_problem_reports;
CREATE TRIGGER rate_limit_problem_reports BEFORE INSERT ON public.appointment_problem_reports
  FOR EACH ROW EXECUTE FUNCTION public.enforce_write_rate_limit('relatos', '5', '3600');

CREATE OR REPLACE FUNCTION public.organization_code_attempt_allowed()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_who text := auth.uid()::text;
BEGIN
  IF v_who IS NULL THEN
    BEGIN
      v_who := split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1);
    EXCEPTION WHEN others THEN
      v_who := NULL;
    END;
  END IF;
  RETURN public.check_rate_limit('codigo-empresa:' || COALESCE(NULLIF(btrim(v_who), ''), 'anon'), 20, 900);
END;
$$;
REVOKE ALL ON FUNCTION public.organization_code_attempt_allowed() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_organization_code(p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_org public.organizations%ROWTYPE;
  v_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  IF NOT public.organization_code_attempt_allowed() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'too_many_attempts');
  END IF;
  SELECT * INTO v_org FROM public.organizations WHERE invite_code = public.normalize_invite_code(p_code);
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'invalid_code');
  END IF;
  IF v_org.status <> 'active' OR v_org.starts_on > v_today OR (v_org.ends_on IS NOT NULL AND v_org.ends_on < v_today) THEN
    RETURN jsonb_build_object('valid', false, 'error', 'inactive');
  END IF;
  RETURN jsonb_build_object('valid', true, 'organization', v_org.name, 'tier', v_org.plan_tier, 'domain', v_org.allowed_email_domain);
END;
$$;
REVOKE ALL ON FUNCTION public.check_organization_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_organization_code(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.join_organization(p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;
  IF NOT public.organization_code_attempt_allowed() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'too_many_attempts');
  END IF;
  RETURN public.join_organization_for_user(auth.uid(), p_code);
END;
$$;
REVOKE ALL ON FUNCTION public.join_organization(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_organization(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.assert_caller_is(p_user_id uuid)
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.assert_caller_is(uuid) FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'add_patient_activity(uuid, text, timestamptz)',
    'add_quarterly_activity(uuid, text, timestamptz)',
    'update_patient_activity_time(uuid, text, integer)',
    'increment_emergency_accepted(uuid)',
    'increment_emergency_rejected(uuid)',
    'initialize_patient_achievements(uuid)',
    'get_patient_statistics(uuid)',
    'get_psychologist_rejection_status(uuid)',
    'create_psychologist_profile(uuid, text, text, text, text, text, text, text, text, text, text, text)'
  ] LOOP
    IF to_regprocedure('public.' || replace(f, '(', '_unchecked(')) IS NULL
       AND to_regprocedure('public.' || f) IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION public.%s RENAME TO %I', f, split_part(f, '(', 1) || '_unchecked');
    END IF;
    IF to_regprocedure('public.' || replace(f, '(', '_unchecked(')) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', replace(f, '(', '_unchecked('));
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role', replace(f, '(', '_unchecked('));
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_patient_activity(
  p_patient_id uuid, p_activity_name text, p_activity_date timestamptz DEFAULT now()
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.assert_caller_is(p_patient_id);
  PERFORM public.add_patient_activity_unchecked(p_patient_id, left(p_activity_name, 200), p_activity_date);
END;
$$;

CREATE OR REPLACE FUNCTION public.add_quarterly_activity(
  p_patient_id uuid, p_activity_name text, p_activity_date timestamptz DEFAULT now()
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.assert_caller_is(p_patient_id);
  PERFORM public.add_quarterly_activity_unchecked(p_patient_id, left(p_activity_name, 200), p_activity_date);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_patient_activity_time(
  p_patient_id uuid, p_activity_type text, p_duration_minutes integer
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.assert_caller_is(p_patient_id);
  PERFORM public.update_patient_activity_time_unchecked(p_patient_id, p_activity_type, LEAST(GREATEST(p_duration_minutes, 0), 240));
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_emergency_accepted(p_psychologist_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.assert_caller_is(p_psychologist_id);
  PERFORM public.increment_emergency_accepted_unchecked(p_psychologist_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_emergency_rejected(p_psychologist_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.assert_caller_is(p_psychologist_id);
  PERFORM public.increment_emergency_rejected_unchecked(p_psychologist_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.initialize_patient_achievements(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.assert_caller_is(p_user_id);
  PERFORM public.initialize_patient_achievements_unchecked(p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_psychologist_rejection_status(p_user_id uuid)
RETURNS TABLE(is_rejected boolean, rejected_at timestamptz, rejection_reason text, should_show_rejection_message boolean, should_cleanup boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.assert_caller_is(p_user_id);
  RETURN QUERY SELECT * FROM public.get_psychologist_rejection_status_unchecked(p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_patient_statistics(patient_user_id uuid)
RETURNS TABLE(consultation_count integer, sos_count integer, average_rating numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() IS DISTINCT FROM patient_user_id
     AND NOT public.is_super_admin()
     AND NOT EXISTS (
       SELECT 1 FROM public.emergency_requests er
       WHERE er.patient_id = patient_user_id AND er.accepted_by = auth.uid()
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.appointments a
       WHERE a.patient_id = patient_user_id AND a.psychologist_id = auth.uid()
     ) THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM public.get_patient_statistics_unchecked(patient_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_psychologist_profile(
  p_user_id uuid, p_full_name text, p_email text, p_crp_number text, p_specialization text,
  p_bio text, p_state text, p_city text, p_address text DEFAULT NULL, p_document_url text DEFAULT NULL,
  p_cpf text DEFAULT NULL, p_area_atendimento text DEFAULT NULL
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;
  RETURN public.create_psychologist_profile_unchecked(
    p_user_id, p_full_name, p_email, p_crp_number, p_specialization, p_bio, p_state, p_city,
    p_address, p_document_url, p_cpf, p_area_atendimento
  );
END;
$$;

DO $$
BEGIN
  IF to_regprocedure('public.create_psychologist_profile(uuid, text, text, text, text, text, text, text, text, text, text)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.create_psychologist_profile(uuid, text, text, text, text, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
  END IF;
  IF to_regprocedure('public.create_psychologist_profile(uuid, text, text, text, text, text, text, text, boolean, text, text, text, text)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.create_psychologist_profile(uuid, text, text, text, text, text, text, text, boolean, text, text, text, text) FROM PUBLIC, anon, authenticated;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.add_patient_activity(uuid, text, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.add_quarterly_activity(uuid, text, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_patient_activity_time(uuid, text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.increment_emergency_accepted(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.increment_emergency_rejected(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.initialize_patient_achievements(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_psychologist_rejection_status(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_patient_statistics(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_psychologist_profile(uuid, text, text, text, text, text, text, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_patient_activity(uuid, text, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_quarterly_activity(uuid, text, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_patient_activity_time(uuid, text, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_emergency_accepted(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_emergency_rejected(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.initialize_patient_achievements(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_psychologist_rejection_status(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_patient_statistics(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_psychologist_profile(uuid, text, text, text, text, text, text, text, text, text, text, text) TO authenticated, service_role;

DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.subscribers;

CREATE OR REPLACE FUNCTION public.guard_subscriber_client_write()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$
BEGIN
  IF current_user <> 'authenticated' OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.subscribed := false;
    NEW.subscription_tier := NULL;
    NEW.subscription_end := NULL;
    NEW.plan_limits := '{"appointments": 0, "sos_uses": 0}'::jsonb;
    NEW.entitlement_source := NULL;
    NEW.organization_id := NULL;
    NEW.stripe_customer_id := NULL;
    NEW.sos_used_this_month := false;
    NEW.appointments_used_this_month := false;
    RETURN NEW;
  END IF;
  NEW.user_id := OLD.user_id;
  NEW.subscribed := OLD.subscribed;
  NEW.subscription_tier := OLD.subscription_tier;
  NEW.subscription_end := OLD.subscription_end;
  NEW.plan_limits := OLD.plan_limits;
  NEW.entitlement_source := OLD.entitlement_source;
  NEW.organization_id := OLD.organization_id;
  NEW.stripe_customer_id := OLD.stripe_customer_id;
  NEW.sos_used_this_month := OLD.sos_used_this_month;
  NEW.sos_last_used := OLD.sos_last_used;
  NEW.appointments_used_this_month := OLD.appointments_used_this_month;
  NEW.appointments_last_used := OLD.appointments_last_used;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS a_guard_subscriber_client_write ON public.subscribers;
CREATE TRIGGER a_guard_subscriber_client_write
  BEFORE INSERT OR UPDATE ON public.subscribers
  FOR EACH ROW EXECUTE FUNCTION public.guard_subscriber_client_write();

CREATE OR REPLACE FUNCTION public.guard_psychologist_client_write()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$
BEGIN
  IF current_user <> 'authenticated' OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.approved := false;
    NEW.approval_status := 'pending';
    NEW.is_blocked := false;
    NEW.blocked_at := NULL;
    NEW.blocked_until := NULL;
    NEW.blocked_reason := NULL;
    NEW.average_rating := 0;
    NEW.ratings_count := 0;
    NEW.total_appointments := 0;
    NEW.reviewed_at := NULL;
    NEW.reviewed_by := NULL;
    NEW.rejected_at := NULL;
    NEW.rejection_reason := NULL;
    RETURN NEW;
  END IF;
  NEW.user_id := OLD.user_id;
  NEW.approved := OLD.approved;
  NEW.approval_status := OLD.approval_status;
  NEW.is_blocked := OLD.is_blocked;
  NEW.blocked_at := OLD.blocked_at;
  NEW.blocked_until := OLD.blocked_until;
  NEW.blocked_reason := OLD.blocked_reason;
  NEW.average_rating := OLD.average_rating;
  NEW.ratings_count := OLD.ratings_count;
  NEW.total_appointments := OLD.total_appointments;
  NEW.reviewed_at := OLD.reviewed_at;
  NEW.reviewed_by := OLD.reviewed_by;
  NEW.rejected_at := OLD.rejected_at;
  NEW.rejection_reason := OLD.rejection_reason;
  IF OLD.approved THEN
    NEW.crp_number := OLD.crp_number;
    NEW.cpf := OLD.cpf;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS a_guard_psychologist_client_write ON public.psychologists;
CREATE TRIGGER a_guard_psychologist_client_write
  BEFORE INSERT OR UPDATE ON public.psychologists
  FOR EACH ROW EXECUTE FUNCTION public.guard_psychologist_client_write();

CREATE OR REPLACE FUNCTION public.guard_patient_client_write()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$
BEGIN
  IF current_user <> 'authenticated' OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.is_blocked := false;
    NEW.blocked_at := NULL;
    NEW.blocked_until := NULL;
    NEW.blocked_reason := NULL;
    RETURN NEW;
  END IF;
  NEW.user_id := OLD.user_id;
  NEW.is_blocked := OLD.is_blocked;
  NEW.blocked_at := OLD.blocked_at;
  NEW.blocked_until := OLD.blocked_until;
  NEW.blocked_reason := OLD.blocked_reason;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS a_guard_patient_client_write ON public.patients;
CREATE TRIGGER a_guard_patient_client_write
  BEFORE INSERT OR UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.guard_patient_client_write();

REVOKE SELECT ON public.psychologists FROM anon, authenticated;
GRANT SELECT (
  id, user_id, full_name, crp_number, specialization, bio, state, city, address, area_atendimento,
  average_rating, ratings_count, total_appointments, approved, approval_status,
  is_blocked, blocked_at, blocked_until, blocked_reason, rejected_at, rejection_reason,
  submitted_at, reviewed_at, created_at, updated_at
) ON public.psychologists TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_psychologist_private()
RETURNS TABLE(email text, pix_key text, pix_type text, cpf text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.email, p.pix_key, p.pix_type, p.cpf
  FROM public.psychologists p
  WHERE p.user_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.get_my_psychologist_private() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_psychologist_private() TO authenticated;

ALTER TABLE public.mensagens DROP CONSTRAINT IF EXISTS mensagens_conteudo_tamanho;
ALTER TABLE public.mensagens ADD CONSTRAINT mensagens_conteudo_tamanho
  CHECK (conteudo IS NULL OR char_length(conteudo) <= 5000) NOT VALID;
ALTER TABLE public.group_testimonials DROP CONSTRAINT IF EXISTS group_testimonials_texto_tamanho;
ALTER TABLE public.group_testimonials ADD CONSTRAINT group_testimonials_texto_tamanho
  CHECK (texto IS NULL OR char_length(texto) <= 3000) NOT VALID;
ALTER TABLE public.session_feedback DROP CONSTRAINT IF EXISTS session_feedback_textos_tamanho;
ALTER TABLE public.session_feedback ADD CONSTRAINT session_feedback_textos_tamanho
  CHECK (
    (comment IS NULL OR char_length(comment) <= 3000)
    AND (complaint_description IS NULL OR char_length(complaint_description) <= 3000)
    AND (clinical_notes IS NULL OR char_length(clinical_notes) <= 10000)
  ) NOT VALID;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_textos_tamanho;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_textos_tamanho
  CHECK (char_length(title) <= 200 AND char_length(message) <= 2000) NOT VALID;

DROP POLICY IF EXISTS "Psychologists can view open or own emergency requests" ON public.emergency_requests;
CREATE POLICY "Psychologists can view open or own emergency requests"
ON public.emergency_requests
FOR SELECT TO authenticated
USING (
  accepted_by = auth.uid()
  OR (status = 'pending' AND accepted_by IS NULL AND public.psychologist_can_attend(auth.uid()))
);

DROP POLICY IF EXISTS "Psychologists can update open or own emergency requests" ON public.emergency_requests;
CREATE POLICY "Psychologists can update open or own emergency requests"
ON public.emergency_requests
FOR UPDATE TO authenticated
USING (
  public.psychologist_can_attend(auth.uid())
  AND (accepted_by = auth.uid() OR (status = 'pending' AND accepted_by IS NULL))
)
WITH CHECK (accepted_by = auth.uid() OR accepted_by IS NULL);

CREATE INDEX IF NOT EXISTS idx_mensagens_conversa_created ON public.mensagens (conversa_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conversas_psicologo ON public.conversas (psicologo_id);
CREATE INDEX IF NOT EXISTS idx_appointments_video_room ON public.appointments (video_room_id) WHERE video_room_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_group_testimonials_group ON public.group_testimonials (group_id, criado_em DESC);
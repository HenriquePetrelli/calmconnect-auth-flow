-- Guarda de 5 anos dos registros de atendimento + aceite dos documentos legais.
--
-- 1) Guarda. A Resolução CFP 01/2009 exige guardar os registros do
--    atendimento psicológico por 5 anos. Até aqui, "Excluir minha conta"
--    apagava junto os pedidos de SOS, as consultas e as avaliações (várias
--    dessas tabelas ainda caem em cascata quando o login é removido). Agora,
--    antes de apagar a conta, esses registros são copiados para
--    care_record_archive, sem ligação com o login, e ficam lá até vencer.
--
-- 2) Eliminação ao fim do prazo. purge_expired_care_records() roda todo dia
--    e apaga o que passou de 5 anos, tanto no arquivo quanto nas tabelas de
--    atendimento das contas ativas.
--
-- 3) Aceite. legal_acceptances guarda cada documento aceito (termos,
--    política, consentimento para dados de saúde, maioridade), com versão e
--    data. Quando a versão de um documento muda, o app pede o aceite de novo.

-- 1. Arquivo de registros de atendimento ------------------------------------
CREATE TABLE IF NOT EXISTS public.care_record_archive (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type text NOT NULL CHECK (record_type IN ('sos', 'consultation', 'feedback')),
  source_id uuid NOT NULL,
  -- Sem FK: o login do paciente pode não existir mais.
  former_patient_id uuid,
  patient_name text,
  patient_email text,
  psychologist_id uuid,
  occurred_at timestamptz NOT NULL,
  data jsonb NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now(),
  retain_until timestamptz NOT NULL,
  UNIQUE (record_type, source_id)
);

CREATE INDEX IF NOT EXISTS idx_care_record_archive_retain ON public.care_record_archive (retain_until);
CREATE INDEX IF NOT EXISTS idx_care_record_archive_psychologist ON public.care_record_archive (psychologist_id);

ALTER TABLE public.care_record_archive ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.care_record_archive TO authenticated;
GRANT ALL ON public.care_record_archive TO service_role;

-- O psicólogo continua podendo consultar os registros dos próprios atendimentos.
DROP POLICY IF EXISTS "Psychologists read their own archived care records" ON public.care_record_archive;
CREATE POLICY "Psychologists read their own archived care records"
  ON public.care_record_archive FOR SELECT
  TO authenticated
  USING (psychologist_id = auth.uid());

-- Copia os registros de atendimento de um paciente antes da exclusão da conta.
-- Chamado só pela edge function delete-own-account (service role).
CREATE OR REPLACE FUNCTION public.archive_patient_care_records(p_patient_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_name text;
  v_email text;
  v_count integer := 0;
  v_rows integer;
BEGIN
  SELECT p.full_name INTO v_name FROM public.profiles p WHERE p.user_id = p_patient_id LIMIT 1;
  SELECT u.email INTO v_email FROM auth.users u WHERE u.id = p_patient_id;

  INSERT INTO public.care_record_archive
    (record_type, source_id, former_patient_id, patient_name, patient_email, psychologist_id, occurred_at, data, retain_until)
  SELECT 'sos', er.id, p_patient_id, v_name, v_email, er.accepted_by, er.created_at, to_jsonb(er),
         er.created_at + interval '5 years'
  FROM public.emergency_requests er
  WHERE er.patient_id = p_patient_id
  ON CONFLICT (record_type, source_id) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_count := v_count + v_rows;

  INSERT INTO public.care_record_archive
    (record_type, source_id, former_patient_id, patient_name, patient_email, psychologist_id, occurred_at, data, retain_until)
  SELECT 'consultation', a.id, p_patient_id, v_name, v_email, a.psychologist_id, a.scheduled_at, to_jsonb(a),
         a.scheduled_at + interval '5 years'
  FROM public.appointments a
  WHERE a.patient_id = p_patient_id
  ON CONFLICT (record_type, source_id) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_count := v_count + v_rows;

  -- Avaliações e anotações clínicas dos atendimentos desse paciente, inclusive
  -- as registradas pelo psicólogo.
  INSERT INTO public.care_record_archive
    (record_type, source_id, former_patient_id, patient_name, patient_email, psychologist_id, occurred_at, data, retain_until)
  SELECT 'feedback', sf.id, p_patient_id, v_name, v_email, sf.psychologist_id,
         COALESCE(sf.created_at, now()), to_jsonb(sf),
         COALESCE(sf.created_at, now()) + interval '5 years'
  FROM public.session_feedback sf
  WHERE sf.user_id = p_patient_id
     OR sf.emergency_request_id IN (SELECT er.id FROM public.emergency_requests er WHERE er.patient_id = p_patient_id)
  ON CONFLICT (record_type, source_id) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_count := v_count + v_rows;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.archive_patient_care_records(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.archive_patient_care_records(uuid) TO service_role;

-- 2. Eliminação ao fim dos 5 anos -------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_expired_care_records()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cutoff timestamptz := now() - interval '5 years';
  v_archive integer;
  v_feedback integer;
  v_appointments integer;
  v_sessions integer;
  v_requests integer;
BEGIN
  DELETE FROM public.care_record_archive WHERE retain_until < now();
  GET DIAGNOSTICS v_archive = ROW_COUNT;

  -- Ordem pensada para as chaves estrangeiras: primeiro o que aponta para
  -- pedidos de SOS e salas de vídeo, depois eles.
  DELETE FROM public.session_feedback WHERE created_at < v_cutoff;
  GET DIAGNOSTICS v_feedback = ROW_COUNT;

  DELETE FROM public.appointments
  WHERE scheduled_at < v_cutoff
    AND status NOT IN ('pending', 'scheduled', 'confirmed', 'in_progress');
  GET DIAGNOSTICS v_appointments = ROW_COUNT;

  DELETE FROM public.webrtc_sessions ws
  WHERE ws.created_at < v_cutoff
    AND NOT EXISTS (SELECT 1 FROM public.appointments a WHERE a.video_room_id = ws.id);
  GET DIAGNOSTICS v_sessions = ROW_COUNT;

  DELETE FROM public.emergency_requests
  WHERE created_at < v_cutoff
    AND status IN ('completed', 'cancelled');
  GET DIAGNOSTICS v_requests = ROW_COUNT;

  RETURN jsonb_build_object(
    'archive', v_archive,
    'session_feedback', v_feedback,
    'appointments', v_appointments,
    'webrtc_sessions', v_sessions,
    'emergency_requests', v_requests
  );
END;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_care_records() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_care_records() TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

SELECT cron.unschedule('purge-expired-care-records')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-expired-care-records');

-- Todo dia às 03:30 UTC (00:30 em Brasília).
SELECT cron.schedule(
  'purge-expired-care-records',
  '30 3 * * *',
  $cron$SELECT public.purge_expired_care_records();$cron$
);

-- 3. Aceite dos documentos legais -------------------------------------------
CREATE TABLE IF NOT EXISTS public.legal_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document text NOT NULL CHECK (document IN (
    'terms_patient', 'terms_psychologist', 'privacy_policy', 'health_data_consent', 'age_18'
  )),
  version text NOT NULL CHECK (length(version) BETWEEN 1 AND 20),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  user_agent text CHECK (user_agent IS NULL OR length(user_agent) <= 500),
  UNIQUE (user_id, document, version)
);

CREATE INDEX IF NOT EXISTS idx_legal_acceptances_user ON public.legal_acceptances (user_id);

ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.legal_acceptances TO authenticated;
GRANT ALL ON public.legal_acceptances TO service_role;

-- Cada um registra e lê só o próprio aceite. Não há UPDATE nem DELETE: o
-- histórico de aceites é a prova do consentimento.
DROP POLICY IF EXISTS "Users record their own legal acceptances" ON public.legal_acceptances;
CREATE POLICY "Users record their own legal acceptances"
  ON public.legal_acceptances FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND accepted_at <= now() + interval '1 minute');

DROP POLICY IF EXISTS "Users read their own legal acceptances" ON public.legal_acceptances;
CREATE POLICY "Users read their own legal acceptances"
  ON public.legal_acceptances FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins read legal acceptances" ON public.legal_acceptances;
CREATE POLICY "Admins read legal acceptances"
  ON public.legal_acceptances FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

-- O aceite feito na tela de cadastro chega nos metadados do signUp
-- (legal_acceptances: [{document, version}]) e é gravado aqui, com a hora do
-- servidor. Assim ele fica registrado mesmo quando o cadastro exige confirmar
-- o e-mail e ainda não há sessão para gravar pelo app. Um metadado malformado
-- nunca impede o cadastro: nesse caso o app pede o aceite no primeiro login.
CREATE OR REPLACE FUNCTION public.record_signup_legal_acceptances()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF jsonb_typeof(NEW.raw_user_meta_data -> 'legal_acceptances') = 'array' THEN
    BEGIN
      INSERT INTO public.legal_acceptances (user_id, document, version, user_agent)
      SELECT NEW.id, item ->> 'document', item ->> 'version',
             left(NEW.raw_user_meta_data ->> 'legal_user_agent', 500)
      FROM jsonb_array_elements(NEW.raw_user_meta_data -> 'legal_acceptances') AS item
      WHERE item ->> 'document' IN ('terms_patient', 'terms_psychologist', 'privacy_policy', 'health_data_consent', 'age_18')
        AND length(item ->> 'version') BETWEEN 1 AND 20
      ON CONFLICT (user_id, document, version) DO NOTHING;
    EXCEPTION WHEN others THEN
      RAISE WARNING 'record_signup_legal_acceptances: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.record_signup_legal_acceptances() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_legal_acceptances ON auth.users;
CREATE TRIGGER on_auth_user_legal_acceptances
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.record_signup_legal_acceptances();
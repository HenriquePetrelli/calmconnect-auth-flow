-- Teste da guarda de 5 anos e do aceite dos documentos legais
-- (migration 20260928050000_care_records_retention_and_legal_acceptance).
--
-- Roda contra um Postgres com o schema aplicado:
--   supabase start
--   psql "$(supabase status -o env | grep DB_URL | cut -d= -f2- | tr -d '"')" -f supabase/tests/care_records_retention.sql
-- Tudo roda numa transação desfeita no final; qualquer falha interrompe com
-- "FALHOU: ...".

\set ON_ERROR_STOP on
BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.act_as(p_uid uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_uid::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);
END $$;

CREATE OR REPLACE FUNCTION pg_temp.check(p_ok boolean, p_msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF NOT p_ok THEN RAISE EXCEPTION 'FALHOU: %', p_msg; END IF;
  RAISE NOTICE 'ok: %', p_msg;
END $$;

-- O aceite marcado no cadastro chega nos metadados e é gravado pelo trigger.
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('a0000000-0000-0000-0000-00000000000a', 'paciente@teste.local',
   '{"legal_acceptances":[{"document":"terms_patient","version":"1.0"},{"document":"age_18","version":"1.0"},{"document":"inventado","version":"1"}]}'),
  ('c0000000-0000-0000-0000-00000000000c', 'psicologo@teste.local', '{"legal_acceptances":"lixo"}');

SELECT pg_temp.check(
  (SELECT count(*) FROM public.legal_acceptances WHERE user_id = 'a0000000-0000-0000-0000-00000000000a') = 2,
  'cadastro grava só os documentos válidos'
);
SELECT pg_temp.check(
  (SELECT count(*) FROM public.legal_acceptances WHERE user_id = 'c0000000-0000-0000-0000-00000000000c') = 0,
  'metadado malformado não impede o cadastro'
);

INSERT INTO public.emergency_requests (id, patient_id, status, accepted_by, created_at) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 'completed', 'c0000000-0000-0000-0000-00000000000c', now() - interval '1 day'),
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-00000000000a', 'completed', 'c0000000-0000-0000-0000-00000000000c', now() - interval '6 years');

-- 1. Só o service role (edge function) arquiva
SELECT pg_temp.act_as('a0000000-0000-0000-0000-00000000000a');
DO $$ BEGIN
  PERFORM public.archive_patient_care_records('a0000000-0000-0000-0000-00000000000a');
  RAISE EXCEPTION 'FALHOU: usuário comum conseguiu arquivar';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: usuário comum não arquiva';
END $$;

RESET role;
SET LOCAL role service_role;
SELECT pg_temp.check(public.archive_patient_care_records('a0000000-0000-0000-0000-00000000000a') = 2, 'arquiva os SOS do paciente');
SELECT pg_temp.check(public.archive_patient_care_records('a0000000-0000-0000-0000-00000000000a') = 0, 'arquivar de novo não duplica');

-- 2. O arquivo sobrevive à exclusão do login
RESET role;
DELETE FROM public.emergency_requests WHERE patient_id = 'a0000000-0000-0000-0000-00000000000a';
DELETE FROM auth.users WHERE id = 'a0000000-0000-0000-0000-00000000000a';
SELECT pg_temp.check((SELECT count(*) FROM public.care_record_archive) = 2, 'registros ficam guardados após excluir a conta');

-- 3. O psicólogo vê os registros dos próprios atendimentos
SELECT pg_temp.act_as('c0000000-0000-0000-0000-00000000000c');
SELECT pg_temp.check((SELECT count(*) FROM public.care_record_archive) = 2, 'psicólogo vê os próprios registros arquivados');

-- 4. Ao fim dos 5 anos o registro é eliminado
RESET role;
SET LOCAL role service_role;
SELECT pg_temp.check((public.purge_expired_care_records() ->> 'archive')::int = 1, 'rotina elimina o registro vencido');
SELECT pg_temp.check((SELECT count(*) FROM public.care_record_archive) = 1, 'o registro no prazo continua guardado');

-- 5. Aceite: cada um grava o próprio, e ninguém altera o histórico
RESET role;
SELECT pg_temp.act_as('c0000000-0000-0000-0000-00000000000c');
INSERT INTO public.legal_acceptances (user_id, document, version) VALUES ('c0000000-0000-0000-0000-00000000000c', 'privacy_policy', '1.0');
DO $$ BEGIN
  INSERT INTO public.legal_acceptances (user_id, document, version) VALUES ('a0000000-0000-0000-0000-00000000000a', 'privacy_policy', '1.0');
  RAISE EXCEPTION 'FALHOU: gravou aceite em nome de outro';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: não grava aceite em nome de outro';
END $$;
DO $$ BEGIN
  UPDATE public.legal_acceptances SET version = '9.9';
  RAISE EXCEPTION 'FALHOU: alterou o histórico de aceites';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: histórico de aceites não se altera';
END $$;

RESET role;
ROLLBACK;

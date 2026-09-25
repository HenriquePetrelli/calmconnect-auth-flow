-- Teste de RLS do plano de segurança (migration 20260925011949_…, "Plano de segurança e contatos de emergência").
--
-- Política de banco só se verifica executando como o usuário, então este
-- teste roda contra um Postgres com o schema aplicado:
--   supabase start
--   psql "$(supabase status -o env | grep DB_URL | cut -d= -f2- | tr -d '"')" -f supabase/tests/safety_plan_rls.sql
-- Tudo roda numa transação desfeita no final; qualquer falha interrompe com
-- "FALHOU: ...".

\set ON_ERROR_STOP on
BEGIN;

-- Usuários de teste
INSERT INTO auth.users (id, email) VALUES
  ('a0000000-0000-0000-0000-00000000000a', 'paciente@teste.local'),
  ('b0000000-0000-0000-0000-00000000000b', 'outro-paciente@teste.local'),
  ('c0000000-0000-0000-0000-00000000000c', 'psicologo@teste.local'),
  ('d0000000-0000-0000-0000-00000000000d', 'outro-psicologo@teste.local');

INSERT INTO public.safety_plans (patient_id, warning_signs, reasons_to_live)
VALUES ('a0000000-0000-0000-0000-00000000000a', ARRAY['Não consigo dormir'], ARRAY['Minha filha']);
INSERT INTO public.emergency_contacts (patient_id, name, phone, is_primary)
VALUES ('a0000000-0000-0000-0000-00000000000a', 'Irmã', '(11) 99999-0000', true);

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

-- 1. O dono lê e edita o próprio plano
SELECT pg_temp.act_as('a0000000-0000-0000-0000-00000000000a');
SELECT pg_temp.check((SELECT count(*) FROM public.safety_plans) = 1, 'dono vê o próprio plano');
SELECT pg_temp.check((SELECT count(*) FROM public.emergency_contacts) = 1, 'dono vê os próprios contatos');
UPDATE public.safety_plans SET coping_strategies = ARRAY['Respirar'];
SELECT pg_temp.check((SELECT coping_strategies FROM public.safety_plans) = ARRAY['Respirar'], 'dono edita o próprio plano');

-- 2. Outro paciente não vê nem altera
SELECT pg_temp.act_as('b0000000-0000-0000-0000-00000000000b');
SELECT pg_temp.check((SELECT count(*) FROM public.safety_plans) = 0, 'outro paciente não vê o plano');
SELECT pg_temp.check((SELECT count(*) FROM public.emergency_contacts) = 0, 'outro paciente não vê os contatos');
UPDATE public.safety_plans SET warning_signs = ARRAY['invadido'];
DO $$
BEGIN
  INSERT INTO public.emergency_contacts (patient_id, name, phone)
  VALUES ('a0000000-0000-0000-0000-00000000000a', 'Intruso', '11999990000');
  RAISE EXCEPTION 'FALHOU: outro paciente conseguiu inserir contato no plano alheio';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'ok: outro paciente não insere contato alheio';
END $$;

-- 3. Psicólogo sem SOS ativo: nada, nem pela tabela nem pela RPC
SELECT pg_temp.act_as('c0000000-0000-0000-0000-00000000000c');
SELECT pg_temp.check((SELECT count(*) FROM public.safety_plans) = 0, 'psicólogo não lê a tabela direto');
SELECT pg_temp.check(public.get_sos_safety_plan(gen_random_uuid()) IS NULL, 'RPC sem SOS devolve nulo');

-- 4. Psicólogo com SOS aceito por ele: lê pela RPC e fica registrado
RESET role;
INSERT INTO public.emergency_requests (id, patient_id, status, accepted_by)
VALUES ('e0000000-0000-0000-0000-00000000000e', 'a0000000-0000-0000-0000-00000000000a', 'in_progress', 'c0000000-0000-0000-0000-00000000000c');

SELECT pg_temp.act_as('c0000000-0000-0000-0000-00000000000c');
SELECT pg_temp.check(
  public.get_sos_safety_plan('e0000000-0000-0000-0000-00000000000e') -> 'plan' -> 'warning_signs' ->> 0 = 'Não consigo dormir',
  'psicólogo do SOS ativo lê o plano'
);
SELECT pg_temp.check(
  jsonb_array_length(public.get_sos_safety_plan('e0000000-0000-0000-0000-00000000000e') -> 'contacts') = 1,
  'psicólogo do SOS ativo lê os contatos'
);
RESET role;
SELECT pg_temp.check(
  (SELECT count(*) FROM public.security_audit_log
   WHERE action = 'sos_safety_plan_viewed' AND user_id = 'c0000000-0000-0000-0000-00000000000c') = 2,
  'cada leitura do psicólogo fica no security_audit_log'
);

-- 5. Outro psicólogo, mesmo SOS: nada
SELECT pg_temp.act_as('d0000000-0000-0000-0000-00000000000d');
SELECT pg_temp.check(public.get_sos_safety_plan('e0000000-0000-0000-0000-00000000000e') IS NULL, 'psicólogo que não aceitou não lê');

-- 6. SOS encerrado: acesso termina
RESET role;
UPDATE public.emergency_requests SET status = 'completed' WHERE id = 'e0000000-0000-0000-0000-00000000000e';
SELECT pg_temp.act_as('c0000000-0000-0000-0000-00000000000c');
SELECT pg_temp.check(public.get_sos_safety_plan('e0000000-0000-0000-0000-00000000000e') IS NULL, 'após o SOS encerrar o psicólogo perde o acesso');

RESET role;
ROLLBACK;

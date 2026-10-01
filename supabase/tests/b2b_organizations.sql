-- Teste do B2B (migration 20261001120000_b2b_organizations).
--
--   psql "$(supabase status -o env | grep DB_URL | cut -d= -f2- | tr -d '"')" -f supabase/tests/b2b_organizations.sql
-- Tudo roda numa transação desfeita no final; qualquer falha interrompe com "FALHOU: ...".

\set ON_ERROR_STOP on
BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.act_as(p_uid uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_uid::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);
END $$;

-- Como as edge functions: sem usuário logado (service role).
CREATE OR REPLACE FUNCTION pg_temp.as_service() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claims', '', true);
  PERFORM set_config('role', 'postgres', true);
END $$;

CREATE OR REPLACE FUNCTION pg_temp.check(p_ok boolean, p_msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF NOT p_ok THEN RAISE EXCEPTION 'FALHOU: %', p_msg; END IF;
  RAISE NOTICE 'ok: %', p_msg;
END $$;

INSERT INTO auth.users (id, email) VALUES
  ('a0000000-0000-0000-0000-00000000000a', 'ana@empresa.com.br'),
  ('b0000000-0000-0000-0000-00000000000b', 'bruno@gmail.com'),
  ('c0000000-0000-0000-0000-00000000000c', 'rh@empresa.com.br'),
  ('d0000000-0000-0000-0000-00000000000d', 'psi@teste.local');
INSERT INTO public.profiles (user_id, user_type, full_name) VALUES
  ('a0000000-0000-0000-0000-00000000000a', 'patient', 'Ana'),
  ('b0000000-0000-0000-0000-00000000000b', 'patient', 'Bruno'),
  ('c0000000-0000-0000-0000-00000000000c', 'patient', 'RH'),
  ('d0000000-0000-0000-0000-00000000000d', 'psychologist', 'Psi');

INSERT INTO public.organizations (id, name, plan_tier, seats, invite_code, allowed_email_domain)
VALUES ('e0000000-0000-0000-0000-00000000000e', 'Empresa X', 'Premium', 1, 'EMPX2026', 'empresa.com.br');

-- 1. Entrar pelo código dá o plano da empresa na linha de subscribers
SELECT pg_temp.act_as('b0000000-0000-0000-0000-00000000000b');
SELECT pg_temp.check(public.join_organization('empx-2026') ->> 'error' = 'domain_mismatch', 'domínio diferente do permitido é recusado');
SELECT pg_temp.check(public.check_organization_code('NAOEXISTE') ->> 'valid' = 'false', 'código inexistente é recusado');

SELECT pg_temp.act_as('d0000000-0000-0000-0000-00000000000d');
SELECT pg_temp.check(public.join_organization('EMPX2026') ->> 'error' = 'not_patient', 'psicólogo não usa benefício de empresa');

SELECT pg_temp.act_as('a0000000-0000-0000-0000-00000000000a');
SELECT pg_temp.check((public.join_organization(' empx 2026 ') ->> 'ok')::boolean, 'colaborador entra pelo código (com espaços e minúsculas)');
RESET role;
SELECT pg_temp.check(
  (SELECT subscribed AND subscription_tier = 'Premium' AND entitlement_source = 'organization'
   FROM public.subscribers WHERE user_id = 'a0000000-0000-0000-0000-00000000000a'),
  'acesso Premium pela empresa'
);
SELECT pg_temp.check((SELECT can_use FROM public.can_use_sos('a0000000-0000-0000-0000-00000000000a')), 'SOS liberado pelo plano da empresa');

-- 2. Vagas
UPDATE public.organizations SET allowed_email_domain = NULL WHERE id = 'e0000000-0000-0000-0000-00000000000e';
SELECT pg_temp.act_as('b0000000-0000-0000-0000-00000000000b');
SELECT pg_temp.check(public.join_organization('EMPX2026') ->> 'error' = 'no_seats', 'sem vaga, não entra');

-- 3. Stripe sem assinatura não derruba o plano da empresa
RESET role;
UPDATE public.subscribers SET subscribed = false, subscription_tier = NULL, entitlement_source = 'stripe'
WHERE user_id = 'a0000000-0000-0000-0000-00000000000a';
SELECT pg_temp.check(
  (SELECT subscribed AND subscription_tier = 'Premium' FROM public.subscribers WHERE user_id = 'a0000000-0000-0000-0000-00000000000a'),
  'escrita do Stripe sem assinatura mantém o plano da empresa'
);

-- 4. SOS do Premium: 1 por mês
UPDATE public.subscribers SET sos_used_this_month = true, sos_last_used = (now() AT TIME ZONE 'America/Sao_Paulo')::date
WHERE user_id = 'a0000000-0000-0000-0000-00000000000a';
SELECT pg_temp.check(NOT (SELECT can_use FROM public.can_use_sos('a0000000-0000-0000-0000-00000000000a')), 'Premium: segundo SOS no mês bloqueado');

-- 5. Plano próprio maior vence; contrato pausado tira só o da empresa
UPDATE public.organizations SET plan_tier = 'Plus' WHERE id = 'e0000000-0000-0000-0000-00000000000e';
UPDATE public.subscribers SET subscribed = true, subscription_tier = 'Premium', entitlement_source = 'stripe'
WHERE user_id = 'a0000000-0000-0000-0000-00000000000a';
SELECT pg_temp.check(
  (SELECT subscription_tier = 'Premium' AND entitlement_source = 'stripe' FROM public.subscribers WHERE user_id = 'a0000000-0000-0000-0000-00000000000a'),
  'Premium próprio vale mais que o Plus da empresa'
);
UPDATE public.subscribers SET subscribed = false, subscription_tier = NULL, entitlement_source = 'stripe'
WHERE user_id = 'a0000000-0000-0000-0000-00000000000a';
SELECT pg_temp.check(
  (SELECT subscription_tier = 'Plus' AND entitlement_source = 'organization' FROM public.subscribers WHERE user_id = 'a0000000-0000-0000-0000-00000000000a'),
  'cancelou o próprio: volta ao Plus da empresa'
);
UPDATE public.organizations SET status = 'paused' WHERE id = 'e0000000-0000-0000-0000-00000000000e';
SELECT pg_temp.check(
  (SELECT NOT subscribed AND subscription_tier IS NULL FROM public.subscribers WHERE user_id = 'a0000000-0000-0000-0000-00000000000a'),
  'contrato pausado tira o acesso'
);
UPDATE public.organizations SET status = 'active' WHERE id = 'e0000000-0000-0000-0000-00000000000e';
SELECT pg_temp.check(
  (SELECT subscribed FROM public.subscribers WHERE user_id = 'a0000000-0000-0000-0000-00000000000a'),
  'contrato reativado devolve o acesso'
);

-- 6. Vencimento pela rotina diária
UPDATE public.organizations SET starts_on = current_date - 30, ends_on = current_date - 1 WHERE id = 'e0000000-0000-0000-0000-00000000000e';
SELECT pg_temp.check(
  (SELECT NOT subscribed FROM public.subscribers WHERE user_id = 'a0000000-0000-0000-0000-00000000000a'),
  'contrato vencido tira o acesso'
);
UPDATE public.organizations SET ends_on = NULL WHERE id = 'e0000000-0000-0000-0000-00000000000e';

-- 7. Sair da empresa
SELECT pg_temp.act_as('a0000000-0000-0000-0000-00000000000a');
SELECT public.leave_organization();
RESET role;
SELECT pg_temp.check(
  (SELECT NOT subscribed FROM public.subscribers WHERE user_id = 'a0000000-0000-0000-0000-00000000000a'),
  'quem sai perde o acesso'
);

-- 8. Portal do RH: só gestor (ou admin), e uso só com 5+ colaboradores
SELECT public.admin_add_organization_manager('e0000000-0000-0000-0000-00000000000e', 'rh@empresa.com.br') FROM (SELECT 1) x
WHERE false; -- admin-only; o vínculo é criado direto abaixo
INSERT INTO public.organization_members (organization_id, user_id, role) VALUES ('e0000000-0000-0000-0000-00000000000e', 'c0000000-0000-0000-0000-00000000000c', 'manager');
SELECT pg_temp.check(
  (SELECT NOT COALESCE(subscribed, false) FROM public.subscribers WHERE user_id = 'c0000000-0000-0000-0000-00000000000c'),
  'gestor (RH) não ganha plano nem ocupa vaga'
);
SELECT pg_temp.act_as('c0000000-0000-0000-0000-00000000000c');
SELECT pg_temp.check((public.get_organization_dashboard('e0000000-0000-0000-0000-00000000000e') -> 'usage') = 'null'::jsonb, 'menos de 5 colaboradores: sem números de uso');
SELECT pg_temp.check(length(public.rotate_organization_invite_code('e0000000-0000-0000-0000-00000000000e')) = 8, 'RH gera um novo código');
SELECT pg_temp.check((SELECT count(*) FROM public.organizations) = 0, 'RH não lê a tabela de empresas direto');
SELECT pg_temp.check((SELECT count(*) FROM public.organization_members) = 1, 'cada um vê só o próprio vínculo');
SELECT pg_temp.act_as('b0000000-0000-0000-0000-00000000000b');
DO $$ BEGIN
  PERFORM public.get_organization_dashboard('e0000000-0000-0000-0000-00000000000e');
  RAISE EXCEPTION 'FALHOU: colaborador comum abriu o painel do RH';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: colaborador comum não abre o painel do RH';
END $$;
DO $$ BEGIN
  PERFORM public.admin_list_organization_members('e0000000-0000-0000-0000-00000000000e');
  RAISE EXCEPTION 'FALHOU: não-admin listou colaboradores';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: só o admin lista colaboradores';
END $$;
SELECT pg_temp.check((SELECT count(*) FROM public.organization_entitlement('a0000000-0000-0000-0000-00000000000a')) = 0, 'não consulta o benefício de outra pessoa');

-- 9. Código no cadastro
RESET role;
UPDATE public.organizations SET seats = 10 WHERE id = 'e0000000-0000-0000-0000-00000000000e';
INSERT INTO public.profiles (user_id, user_type, full_name) VALUES ('f0000000-0000-0000-0000-00000000000f', 'patient', 'Nova');
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('f0000000-0000-0000-0000-00000000000f', 'nova@x.com',
   json_build_object('organization_code', (SELECT invite_code FROM public.organizations WHERE id = 'e0000000-0000-0000-0000-00000000000e'))::jsonb);
SELECT pg_temp.check(
  (SELECT subscribed FROM public.subscribers WHERE user_id = 'f0000000-0000-0000-0000-00000000000f'),
  'código digitado no cadastro já dá o acesso'
);
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ('f1000000-0000-0000-0000-00000000000f', 'x@x.com', '{"organization_code":"ERRADO"}');
SELECT pg_temp.check(true, 'código errado no cadastro não impede o cadastro');

-- 10. Com 5+ colaboradores o RH vê os números agregados
SELECT pg_temp.as_service();
DO $$ BEGIN
  FOR i IN 1..5 LOOP
    INSERT INTO auth.users (id, email) VALUES (('90000000-0000-0000-0000-00000000000' || i)::uuid, 'c' || i || '@empresa.com.br');
    INSERT INTO public.organization_members (organization_id, user_id) VALUES ('e0000000-0000-0000-0000-00000000000e', ('90000000-0000-0000-0000-00000000000' || i)::uuid);
  END LOOP;
END $$;
INSERT INTO public.emergency_requests (patient_id, status) VALUES ('90000000-0000-0000-0000-000000000001', 'completed');
SELECT pg_temp.act_as('c0000000-0000-0000-0000-00000000000c');
SELECT pg_temp.check(
  (public.get_organization_dashboard('e0000000-0000-0000-0000-00000000000e') -> 'usage' ->> 'sos_this_month')::int = 1,
  'com 5+ colaboradores, o RH vê só o total de SOS do mês'
);

RESET role;
ROLLBACK;

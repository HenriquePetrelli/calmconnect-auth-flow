-- B2B: empresas que oferecem o Soliv aos colaboradores.
--
-- O contrato e a cobrança da empresa ficam fora do app (proposta e nota
-- fiscal). O app controla quem tem acesso: a empresa tem um plano (Plus ou
-- Premium), um número de vagas, uma vigência e um código de convite. O
-- colaborador entra com o código e passa a ter o plano da empresa.
--
-- O acesso é aplicado em `subscribers`, a mesma linha que já decide SOS,
-- cotas e agendamento no servidor: um trigger nessa tabela soma o plano da
-- empresa ao que vier do Stripe (vale o maior). Assim check-subscription,
-- stripe-webhook e cancel-subscription não conseguem tirar o acesso de quem
-- está coberto pela empresa.
--
-- Privacidade: o RH da empresa nunca vê quem usa o app nem como. Só números
-- agregados, e só a partir de 5 colaboradores.

CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 120),
  cnpj text CHECK (cnpj IS NULL OR cnpj ~ '^[0-9]{14}$'),
  contact_name text CHECK (contact_name IS NULL OR length(contact_name) <= 120),
  contact_email text CHECK (contact_email IS NULL OR length(contact_email) <= 200),
  plan_tier text NOT NULL CHECK (plan_tier IN ('Plus', 'Premium')),
  seats integer NOT NULL CHECK (seats BETWEEN 1 AND 100000),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  starts_on date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  ends_on date,
  invite_code text NOT NULL UNIQUE DEFAULT upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
    CHECK (invite_code ~ '^[A-Z0-9]{6,16}$'),
  -- Opcional: só e-mails deste domínio podem usar o código (ex.: empresa.com.br).
  allowed_email_domain text CHECK (allowed_email_domain IS NULL OR allowed_email_domain ~ '^[a-z0-9.-]+\.[a-z]{2,}$'),
  notes text CHECK (notes IS NULL OR length(notes) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_on IS NULL OR ends_on >= starts_on)
);

DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- member: usa o benefício (ocupa vaga). manager: RH, vê o portal da empresa.
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'manager')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'removed')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz,
  UNIQUE (organization_id, user_id)
);

-- Um benefício de empresa ativo por pessoa.
CREATE UNIQUE INDEX IF NOT EXISTS organization_members_one_active_benefit
  ON public.organization_members (user_id)
  WHERE status = 'active' AND role = 'member';
CREATE INDEX IF NOT EXISTS idx_organization_members_org ON public.organization_members (organization_id) WHERE status = 'active';

ALTER TABLE public.subscribers
  ADD COLUMN IF NOT EXISTS entitlement_source text CHECK (entitlement_source IS NULL OR entitlement_source IN ('stripe', 'organization')),
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations, public.organization_members TO authenticated;
GRANT ALL ON public.organizations, public.organization_members TO service_role;

DROP POLICY IF EXISTS "Admins manage organizations" ON public.organizations;
CREATE POLICY "Admins manage organizations" ON public.organizations
  FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Admins manage organization members" ON public.organization_members;
CREATE POLICY "Admins manage organization members" ON public.organization_members
  FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- Cada um vê o próprio vínculo. Entrar e sair é só pelas funções abaixo.
DROP POLICY IF EXISTS "Users read their own memberships" ON public.organization_members;
CREATE POLICY "Users read their own memberships" ON public.organization_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------- acesso

/** Plano que a empresa dá a esta pessoa hoje (ou nada). Uso interno (triggers). */
CREATE OR REPLACE FUNCTION public.organization_entitlement_internal(p_user_id uuid)
RETURNS TABLE (tier text, organization_id uuid, organization_name text, ends_on date)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT o.plan_tier, o.id, o.name, o.ends_on
  FROM public.organization_members m
  JOIN public.organizations o ON o.id = m.organization_id
  WHERE m.user_id = p_user_id
    AND m.status = 'active'
    AND m.role = 'member'
    AND o.status = 'active'
    AND o.starts_on <= (now() AT TIME ZONE 'America/Sao_Paulo')::date
    AND (o.ends_on IS NULL OR o.ends_on >= (now() AT TIME ZONE 'America/Sao_Paulo')::date)
  ORDER BY (o.plan_tier = 'Premium') DESC
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.organization_entitlement_internal(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.organization_entitlement_internal(uuid) TO service_role;

/** Versão pública: cada um consulta só a si mesmo; edge functions e admin, qualquer um. */
CREATE OR REPLACE FUNCTION public.organization_entitlement(p_user_id uuid)
RETURNS TABLE (tier text, organization_id uuid, organization_name text, ends_on date)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id AND NOT public.is_super_admin() THEN
    RETURN;
  END IF;
  RETURN QUERY SELECT * FROM public.organization_entitlement_internal(p_user_id);
END;
$$;

REVOKE ALL ON FUNCTION public.organization_entitlement(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.organization_entitlement(uuid) TO authenticated, service_role;

/**
 * Aplica o plano da empresa em toda escrita em `subscribers`. Vale o maior
 * plano entre o do Stripe e o da empresa. Sem assinatura própria e sem
 * empresa, a linha fica sem acesso, como antes.
 */
CREATE OR REPLACE FUNCTION public.apply_organization_entitlement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ent record;
  v_rank_stripe integer;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO ent FROM public.organization_entitlement_internal(NEW.user_id);

  -- Plano do Stripe nesta escrita. As funções do Stripe (check-subscription,
  -- stripe-webhook, cancel-subscription) gravam entitlement_source = 'stripe';
  -- linhas antigas, sem origem, também contam como Stripe.
  IF NEW.subscribed AND NEW.subscription_tier IS NOT NULL AND COALESCE(NEW.entitlement_source, 'stripe') = 'stripe' THEN
    v_rank_stripe := CASE NEW.subscription_tier WHEN 'Premium' THEN 2 WHEN 'Plus' THEN 1 ELSE 0 END;
  ELSE
    v_rank_stripe := 0;
  END IF;

  IF ent.tier IS NOT NULL AND (CASE ent.tier WHEN 'Premium' THEN 2 ELSE 1 END) > v_rank_stripe THEN
    NEW.subscribed := true;
    NEW.subscription_tier := ent.tier;
    NEW.plan_limits := CASE ent.tier
      WHEN 'Premium' THEN '{"appointments": 1, "sos_uses": 1}'::jsonb
      ELSE '{"appointments": 0, "sos_uses": 1}'::jsonb
    END;
    NEW.subscription_end := CASE WHEN ent.ends_on IS NULL THEN NULL ELSE (ent.ends_on + 1)::timestamptz END;
    NEW.entitlement_source := 'organization';
    NEW.organization_id := ent.organization_id;
  ELSIF v_rank_stripe > 0 THEN
    NEW.entitlement_source := 'stripe';
    NEW.organization_id := NULL;
  ELSIF NEW.entitlement_source = 'organization' THEN
    -- Era da empresa e não é mais (saiu, contrato pausado ou vencido).
    NEW.subscribed := false;
    NEW.subscription_tier := NULL;
    NEW.plan_limits := '{"appointments": 0, "sos_uses": 0}'::jsonb;
    NEW.subscription_end := NULL;
    NEW.entitlement_source := NULL;
    NEW.organization_id := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS apply_organization_entitlement ON public.subscribers;
CREATE TRIGGER apply_organization_entitlement
  BEFORE INSERT OR UPDATE ON public.subscribers
  FOR EACH ROW EXECUTE FUNCTION public.apply_organization_entitlement();

/** Recalcula a linha de `subscribers` de uma pessoa (o trigger faz a conta). */
CREATE OR REPLACE FUNCTION public.refresh_subscriber_entitlement(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email text;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  IF v_email IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO public.subscribers (email, user_id, updated_at)
  VALUES (v_email, p_user_id, now())
  ON CONFLICT (email) DO UPDATE SET user_id = EXCLUDED.user_id, updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_subscriber_entitlement(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_subscriber_entitlement(uuid) TO service_role;

-- Contrato pausado, encerrado, vencido ou plano trocado: recalcula todos os colaboradores.
CREATE OR REPLACE FUNCTION public.organizations_after_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.refresh_subscriber_entitlement(m.user_id)
  FROM public.organization_members m
  WHERE m.organization_id = NEW.id AND m.role = 'member';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS organizations_after_change ON public.organizations;
CREATE TRIGGER organizations_after_change
  AFTER UPDATE OF status, plan_tier, starts_on, ends_on ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.organizations_after_change();

-- Entrou, saiu ou foi removido: recalcula a pessoa.
CREATE OR REPLACE FUNCTION public.organization_members_after_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_subscriber_entitlement(OLD.user_id);
    RETURN OLD;
  END IF;
  PERFORM public.refresh_subscriber_entitlement(NEW.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS organization_members_after_change ON public.organization_members;
CREATE TRIGGER organization_members_after_change
  AFTER INSERT OR UPDATE OR DELETE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.organization_members_after_change();

-- Vigência acaba à meia-noite: uma passada diária tira o acesso de quem venceu.
CREATE OR REPLACE FUNCTION public.expire_organization_entitlements()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer := 0;
  r record;
BEGIN
  FOR r IN
    SELECT s.user_id FROM public.subscribers s
    WHERE s.entitlement_source = 'organization'
      AND NOT EXISTS (SELECT 1 FROM public.organization_entitlement_internal(s.user_id))
  LOOP
    PERFORM public.refresh_subscriber_entitlement(r.user_id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_organization_entitlements() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_organization_entitlements() TO service_role;

-- ------------------------------------------------------------- convite

CREATE OR REPLACE FUNCTION public.normalize_invite_code(p_code text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$ SELECT upper(regexp_replace(COALESCE(p_code, ''), '[^A-Za-z0-9]', '', 'g')) $$;

/**
 * Entra numa empresa pelo código. Erros devolvidos em `error`:
 * invalid_code, inactive, domain_mismatch, no_seats, already_member, not_patient.
 */
CREATE OR REPLACE FUNCTION public.join_organization_for_user(p_user_id uuid, p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org public.organizations%ROWTYPE;
  v_email text;
  v_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_used integer;
  v_current uuid;
BEGIN
  SELECT * INTO v_org FROM public.organizations WHERE invite_code = public.normalize_invite_code(p_code);
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;
  IF v_org.status <> 'active' OR v_org.starts_on > v_today OR (v_org.ends_on IS NOT NULL AND v_org.ends_on < v_today) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'inactive');
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = p_user_id AND p.user_type <> 'patient') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_patient');
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  IF v_org.allowed_email_domain IS NOT NULL
     AND lower(split_part(COALESCE(v_email, ''), '@', 2)) <> v_org.allowed_email_domain THEN
    RETURN jsonb_build_object('ok', false, 'error', 'domain_mismatch', 'domain', v_org.allowed_email_domain);
  END IF;

  SELECT organization_id INTO v_current FROM public.organization_members
  WHERE user_id = p_user_id AND status = 'active' AND role = 'member';
  IF v_current = v_org.id THEN
    RETURN jsonb_build_object('ok', true, 'organization', v_org.name, 'tier', v_org.plan_tier, 'already', true);
  ELSIF v_current IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_member');
  END IF;

  -- Trava a empresa para não passar do número de vagas em entradas simultâneas.
  PERFORM 1 FROM public.organizations WHERE id = v_org.id FOR UPDATE;
  SELECT count(*) INTO v_used FROM public.organization_members
  WHERE organization_id = v_org.id AND status = 'active' AND role = 'member';
  IF v_used >= v_org.seats THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_seats');
  END IF;

  INSERT INTO public.organization_members (organization_id, user_id, role, status, joined_at, removed_at)
  VALUES (v_org.id, p_user_id, 'member', 'active', now(), NULL)
  ON CONFLICT (organization_id, user_id)
  DO UPDATE SET role = 'member', status = 'active', joined_at = now(), removed_at = NULL;

  RETURN jsonb_build_object('ok', true, 'organization', v_org.name, 'tier', v_org.plan_tier);
END;
$$;

REVOKE ALL ON FUNCTION public.join_organization_for_user(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.join_organization_for_user(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.join_organization(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;
  RETURN public.join_organization_for_user(auth.uid(), p_code);
END;
$$;

REVOKE ALL ON FUNCTION public.join_organization(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_organization(text) TO authenticated;

/** Confere um código antes do cadastro, sem entrar. Diz só o nome da empresa. */
CREATE OR REPLACE FUNCTION public.check_organization_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org public.organizations%ROWTYPE;
  v_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
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

CREATE OR REPLACE FUNCTION public.leave_organization()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.organization_members
  SET status = 'removed', removed_at = now()
  WHERE user_id = auth.uid() AND status = 'active' AND role = 'member';
END;
$$;

REVOKE ALL ON FUNCTION public.leave_organization() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_organization() TO authenticated;

-- O código digitado no cadastro (metadado organization_code) vale na hora,
-- mesmo antes de confirmar o e-mail. Código inválido não impede o cadastro.
CREATE OR REPLACE FUNCTION public.join_organization_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF COALESCE(NEW.raw_user_meta_data ->> 'organization_code', '') <> '' THEN
    BEGIN
      PERFORM public.join_organization_for_user(NEW.id, NEW.raw_user_meta_data ->> 'organization_code');
    EXCEPTION WHEN others THEN
      RAISE WARNING 'join_organization_on_signup: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.join_organization_on_signup() FROM PUBLIC, anon, authenticated;

-- Nome começa com "on_auth_user_o": roda depois do trigger que cria o perfil.
DROP TRIGGER IF EXISTS on_auth_user_organization_code ON auth.users;
CREATE TRIGGER on_auth_user_organization_code
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.join_organization_on_signup();

-- ------------------------------------------------------------ portal RH

CREATE OR REPLACE FUNCTION public.is_organization_manager(p_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_org AND user_id = auth.uid() AND role = 'manager' AND status = 'active'
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_organization_manager(uuid) TO authenticated;

/**
 * Painel do RH. Uso só agregado e só com 5+ colaboradores ativos; abaixo
 * disso os números poderiam apontar uma pessoa.
 */
CREATE OR REPLACE FUNCTION public.get_organization_dashboard(p_org uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org public.organizations%ROWTYPE;
  v_members integer;
  v_month_start timestamptz := date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
  v_usage jsonb := NULL;
BEGIN
  IF NOT (public.is_organization_manager(p_org) OR public.is_super_admin()) THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_org FROM public.organizations WHERE id = p_org;
  SELECT count(*) INTO v_members FROM public.organization_members
  WHERE organization_id = p_org AND status = 'active' AND role = 'member';

  IF v_members >= 5 THEN
    WITH m AS (
      SELECT user_id FROM public.organization_members
      WHERE organization_id = p_org AND status = 'active' AND role = 'member'
    )
    SELECT jsonb_build_object(
      'sos_this_month', (SELECT count(*) FROM public.emergency_requests e JOIN m ON m.user_id = e.patient_id
                         WHERE e.created_at >= v_month_start AND e.status = 'completed'),
      'consultations_this_month', (SELECT count(*) FROM public.appointments a JOIN m ON m.user_id = a.patient_id
                                   WHERE a.scheduled_at >= v_month_start AND a.status = 'completed'),
      'active_last_30_days', (SELECT count(DISTINCT pm.patient_id) FROM public.patient_mood_logs pm JOIN m ON m.user_id = pm.patient_id
                              WHERE pm.created_at >= now() - interval '30 days')
    ) INTO v_usage;
  END IF;

  RETURN jsonb_build_object(
    'id', v_org.id,
    'name', v_org.name,
    'plan_tier', v_org.plan_tier,
    'status', v_org.status,
    'starts_on', v_org.starts_on,
    'ends_on', v_org.ends_on,
    'seats', v_org.seats,
    'members', v_members,
    'invite_code', v_org.invite_code,
    'allowed_email_domain', v_org.allowed_email_domain,
    'usage', v_usage,
    'usage_min_members', 5
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_organization_dashboard(uuid) TO authenticated;

/** Novo código de convite (o antigo deixa de valer). RH ou admin. */
CREATE OR REPLACE FUNCTION public.rotate_organization_invite_code(p_org uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_code text;
BEGIN
  IF NOT (public.is_organization_manager(p_org) OR public.is_super_admin()) THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = 'insufficient_privilege';
  END IF;
  LOOP
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.organizations WHERE invite_code = v_code);
  END LOOP;
  UPDATE public.organizations SET invite_code = v_code WHERE id = p_org;
  RETURN v_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rotate_organization_invite_code(uuid) TO authenticated;

-- ------------------------------------------------------------- admin

/** Lista de colaboradores para o admin do Soliv (suporte e conferência de vagas). */
CREATE OR REPLACE FUNCTION public.admin_list_organization_members(p_org uuid)
RETURNS TABLE (member_id uuid, user_id uuid, full_name text, email text, role text, status text, joined_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN QUERY
  SELECT m.id, m.user_id, p.full_name, u.email::text, m.role, m.status, m.joined_at
  FROM public.organization_members m
  LEFT JOIN public.profiles p ON p.user_id = m.user_id
  LEFT JOIN auth.users u ON u.id = m.user_id
  WHERE m.organization_id = p_org
  ORDER BY m.status, m.role DESC, m.joined_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_organization_members(uuid) TO authenticated;

/** Define o RH da empresa pelo e-mail de uma conta já cadastrada. */
CREATE OR REPLACE FUNCTION public.admin_add_organization_manager(p_org uuid, p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT id INTO v_user FROM auth.users WHERE lower(email) = lower(btrim(p_email));
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'user_not_found');
  END IF;
  INSERT INTO public.organization_members (organization_id, user_id, role, status)
  VALUES (p_org, v_user, 'manager', 'active')
  ON CONFLICT (organization_id, user_id)
  DO UPDATE SET role = 'manager', status = 'active', removed_at = NULL;
  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_add_organization_manager(uuid, text) TO authenticated;

-- ------------------------------------------------------------- SOS

-- O Premium dá 1 SOS por mês (tela de planos, Termos e check-subscription).
-- Esta função ainda dizia "Premium: ilimitado": alinhada ao que é vendido.
CREATE OR REPLACE FUNCTION public.can_use_sos(p_user_id uuid)
RETURNS TABLE(can_use boolean, reason text, plan_type text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rec RECORD;
  same_month boolean;
  brazil_today date;
  v_tier text;
BEGIN
  SELECT subscribed, subscription_tier, sos_used_this_month, sos_last_used
  INTO rec
  FROM public.subscribers
  WHERE user_id = p_user_id
  LIMIT 1;

  IF NOT FOUND OR rec.subscribed IS FALSE THEN
    RETURN QUERY SELECT false, 'Usuário não possui assinatura ativa', COALESCE(rec.subscription_tier, NULL);
    RETURN;
  END IF;

  v_tier := CASE lower(COALESCE(rec.subscription_tier, '')) WHEN 'plus' THEN 'Plus' WHEN 'premium' THEN 'Premium' ELSE NULL END;
  IF v_tier IS NULL THEN
    RETURN QUERY SELECT false, 'Plano não permite uso de SOS', rec.subscription_tier;
    RETURN;
  END IF;

  brazil_today := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  same_month := rec.sos_last_used IS NOT NULL
    AND date_part('year', rec.sos_last_used) = date_part('year', brazil_today)
    AND date_part('month', rec.sos_last_used) = date_part('month', brazil_today);

  IF rec.sos_used_this_month AND same_month THEN
    RETURN QUERY SELECT false, format('Limite mensal de SOS já utilizado (%s: 1x/mês)', upper(v_tier)), v_tier;
  ELSE
    RETURN QUERY SELECT true, format('Pode usar SOS (%s: 1x/mês)', upper(v_tier)), v_tier;
  END IF;
END;
$$;

-- --------------------------------------------------------------- cron

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

SELECT cron.unschedule('expire-organization-entitlements')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-organization-entitlements');

-- Todo dia às 03:05 UTC (00:05 em Brasília): tira o acesso de contratos vencidos.
SELECT cron.schedule(
  'expire-organization-entitlements',
  '5 3 * * *',
  $cron$SELECT public.expire_organization_entitlements();$cron$
);

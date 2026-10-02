-- B2B, segunda parte (o que as plataformas grandes — Calm, Headspace,
-- Zenklub — oferecem e ainda faltava):
--
-- 1. Desligamento pelo RH: o gestor tira o acesso de um colaborador pelo
--    e-mail, e a pessoa mantém o plano até o fim do mês (como no Calm). A
--    resposta é sempre a mesma, exista ou não alguém com aquele e-mail no
--    benefício, para o RH não descobrir quem usa o app.
-- 2. O RH também pode usar o benefício: gestor e colaborador viram vínculos
--    separados (antes era um ou outro).
-- 3. Valor do contrato por vaga, para o admin saber quanto faturar.

-- 2. Um vínculo por papel.
ALTER TABLE public.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_organization_id_user_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS organization_members_org_user_role
  ON public.organization_members (organization_id, user_id, role);

-- 1. Até quando quem foi desligado mantém o acesso.
ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS access_until date;

-- 3. Cobrança (feita fora do app).
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS price_per_seat numeric CHECK (price_per_seat IS NULL OR price_per_seat >= 0),
  ADD COLUMN IF NOT EXISTS billing_day integer CHECK (billing_day IS NULL OR billing_day BETWEEN 1 AND 28);

-- O plano da empresa vale para vínculos ativos e, depois do desligamento, até
-- o fim do mês. A data final é a menor entre o contrato e o desligamento.
CREATE OR REPLACE FUNCTION public.organization_entitlement_internal(p_user_id uuid)
RETURNS TABLE (tier text, organization_id uuid, organization_name text, ends_on date)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT o.plan_tier, o.id, o.name,
         CASE
           WHEN m.status = 'removed' THEN LEAST(m.access_until, COALESCE(o.ends_on, m.access_until))
           ELSE o.ends_on
         END
  FROM public.organization_members m
  JOIN public.organizations o ON o.id = m.organization_id
  WHERE m.user_id = p_user_id
    AND m.role = 'member'
    AND (
      m.status = 'active'
      OR (m.status = 'removed' AND m.access_until IS NOT NULL
          AND m.access_until >= (now() AT TIME ZONE 'America/Sao_Paulo')::date)
    )
    AND o.status = 'active'
    AND o.starts_on <= (now() AT TIME ZONE 'America/Sao_Paulo')::date
    AND (o.ends_on IS NULL OR o.ends_on >= (now() AT TIME ZONE 'America/Sao_Paulo')::date)
  ORDER BY (o.plan_tier = 'Premium') DESC, (m.status = 'active') DESC
  LIMIT 1
$$;

-- Entrar de novo (ex.: recontratado) limpa o desligamento.
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

  PERFORM 1 FROM public.organizations WHERE id = v_org.id FOR UPDATE;
  SELECT count(*) INTO v_used FROM public.organization_members
  WHERE organization_id = v_org.id AND status = 'active' AND role = 'member';
  IF v_used >= v_org.seats THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_seats');
  END IF;

  INSERT INTO public.organization_members (organization_id, user_id, role, status, joined_at, removed_at, access_until)
  VALUES (v_org.id, p_user_id, 'member', 'active', now(), NULL, NULL)
  ON CONFLICT (organization_id, user_id, role)
  DO UPDATE SET status = 'active', joined_at = now(), removed_at = NULL, access_until = NULL;

  RETURN jsonb_build_object('ok', true, 'organization', v_org.name, 'tier', v_org.plan_tier);
END;
$$;

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
  ON CONFLICT (organization_id, user_id, role)
  DO UPDATE SET status = 'active', removed_at = NULL;
  RETURN jsonb_build_object('ok', true);
END;
$$;

/**
 * Desligamento pelo RH. O acesso vai até o fim do mês e a vaga fica livre na
 * hora. A resposta não diz se havia alguém com aquele e-mail no benefício.
 */
CREATE OR REPLACE FUNCTION public.remove_organization_member_by_email(p_org uuid, p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_end_of_month date := (date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') + interval '1 month - 1 day')::date;
BEGIN
  IF NOT (public.is_organization_manager(p_org) OR public.is_super_admin()) THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE public.organization_members m
  SET status = 'removed', removed_at = now(), access_until = v_end_of_month
  FROM auth.users u
  WHERE m.organization_id = p_org
    AND m.role = 'member'
    AND m.status = 'active'
    AND u.id = m.user_id
    AND lower(u.email) = lower(btrim(p_email));

  RETURN jsonb_build_object('ok', true, 'access_until', v_end_of_month);
END;
$$;

REVOKE ALL ON FUNCTION public.remove_organization_member_by_email(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_organization_member_by_email(uuid, text) TO authenticated;

-- Painel do RH: o mesmo de antes, sem o preço (fica com o admin).
-- admin_list_organization_members passa a mostrar até quando vai o acesso.
DROP FUNCTION IF EXISTS public.admin_list_organization_members(uuid);
CREATE FUNCTION public.admin_list_organization_members(p_org uuid)
RETURNS TABLE (member_id uuid, user_id uuid, full_name text, email text, role text, status text, joined_at timestamptz, access_until date)
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
  SELECT m.id, m.user_id, p.full_name, u.email::text, m.role, m.status, m.joined_at, m.access_until
  FROM public.organization_members m
  LEFT JOIN public.profiles p ON p.user_id = m.user_id
  LEFT JOIN auth.users u ON u.id = m.user_id
  WHERE m.organization_id = p_org
  ORDER BY m.status, m.role DESC, m.joined_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_organization_members(uuid) TO authenticated;
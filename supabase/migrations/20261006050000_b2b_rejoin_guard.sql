-- Empresas (B2B): quem foi desligado pelo RH ou pelo admin não volta sozinho
-- com o mesmo código de convite.
--
-- Antes, o colaborador desligado pelo RH podia usar o código de novo na hora
-- (o código continua valendo para os outros colaboradores) e ocupava a vaga
-- outra vez, desfazendo o desligamento. Quem saiu por conta própria ("Sair do
-- benefício") continua podendo voltar com o código.

ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS removed_by uuid;

-- Quem desligou: gravado em qualquer caminho (RH, admin pelo painel, a
-- própria pessoa), sem depender de cada tela lembrar de preencher.
CREATE OR REPLACE FUNCTION public.set_organization_member_removed_by()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'removed' AND OLD.status IS DISTINCT FROM 'removed' THEN
    NEW.removed_by := COALESCE(NEW.removed_by, auth.uid());
  ELSIF NEW.status = 'active' THEN
    NEW.removed_by := NULL;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.set_organization_member_removed_by() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS set_organization_member_removed_by ON public.organization_members;
CREATE TRIGGER set_organization_member_removed_by
  BEFORE UPDATE OF status ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.set_organization_member_removed_by();

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

  -- Desligado pela empresa (RH ou admin): só volta se a empresa religar.
  IF EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = v_org.id
      AND user_id = p_user_id
      AND role = 'member'
      AND status = 'removed'
      AND removed_by IS NOT NULL
      AND removed_by <> p_user_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'removed_by_company');
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
REVOKE ALL ON FUNCTION public.join_organization_for_user(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.join_organization_for_user(uuid, text) TO service_role;

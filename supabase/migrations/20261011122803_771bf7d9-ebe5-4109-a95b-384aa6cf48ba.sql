CREATE OR REPLACE FUNCTION public.join_organization_for_user(p_user_id uuid, p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org public.organizations%ROWTYPE;
  v_email text;
  v_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_used integer;
  v_current uuid;
  v_confirmed timestamptz;
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

  SELECT email, email_confirmed_at INTO v_email, v_confirmed FROM auth.users WHERE id = p_user_id;
  -- Empresa com domínio de e-mail: só vale com o e-mail confirmado (quem
  -- digitasse o e-mail de outra pessoa ocuparia uma vaga). Com a confirmação
  -- desligada no Supabase o e-mail já nasce confirmado e nada muda.
  IF v_org.allowed_email_domain IS NOT NULL AND v_confirmed IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'email_not_confirmed');
  END IF;
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
$function$;


CREATE OR REPLACE FUNCTION public.join_organization_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- No cadastro e de novo quando o e-mail é confirmado (empresas com domínio
  -- só aceitam e-mail confirmado).
  IF TG_OP = 'UPDATE' AND NOT (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL) THEN
    RETURN NEW;
  END IF;
  IF COALESCE(NEW.raw_user_meta_data ->> 'organization_code', '') <> '' THEN
    BEGIN
      PERFORM public.join_organization_for_user(NEW.id, NEW.raw_user_meta_data ->> 'organization_code');
    EXCEPTION WHEN others THEN
      RAISE WARNING 'join_organization_on_signup: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed_organization ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed_organization
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.join_organization_on_signup();
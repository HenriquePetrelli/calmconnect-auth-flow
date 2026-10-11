-- Painel do admin: auditoria completa (varredura de funcionamento).
--
-- A aba Auditoria registrava bloqueios, edições e exclusões de contas, mas
-- não registrava a moderação dos grupos de apoio (editar, excluir depoimento,
-- descartar denúncias) nem as mudanças em empresas (contrato, vagas, código,
-- gestores). Agora essas ações, feitas por um admin, entram no registro.
-- (Aprovar/recusar psicólogo e confirmar repasse passam a registrar pelas
-- próprias funções do servidor.)

-- Tipos de alvo aceitos no registro (antes só paciente e psicólogo).
ALTER TABLE public.admin_audit_log DROP CONSTRAINT IF EXISTS admin_audit_log_target_type_check;
ALTER TABLE public.admin_audit_log ADD CONSTRAINT admin_audit_log_target_type_check
  CHECK (target_type = ANY (ARRAY['patient', 'psychologist', 'group_testimonial', 'testimonial_report', 'organization', 'organization_member']));

CREATE OR REPLACE FUNCTION public.audit_admin_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_admin uuid := auth.uid();
  v_target_type text := TG_ARGV[0];
  v_row jsonb := to_jsonb(CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END);
  v_old jsonb := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END;
  v_details jsonb := '{}'::jsonb;
  v_name text;
  v_target uuid;
BEGIN
  -- Só ações de um admin logado (rotinas e o próprio usuário não entram).
  IF v_admin IS NULL OR NOT public.is_super_admin(v_admin) THEN
    RETURN NULL;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Só os campos que mudaram (sem textos longos de saúde).
    SELECT COALESCE(jsonb_object_agg(k, jsonb_build_object('de', v_old -> k, 'para', v_row -> k)), '{}'::jsonb)
      INTO v_details
    FROM jsonb_object_keys(v_row) AS k
    WHERE k NOT IN ('updated_at', 'texto', 'content')
      AND (v_old -> k) IS DISTINCT FROM (v_row -> k);
    IF v_details = '{}'::jsonb AND NOT ((v_old ->> 'texto') IS DISTINCT FROM (v_row ->> 'texto')) THEN
      RETURN NULL;
    END IF;
    IF (v_old ->> 'texto') IS DISTINCT FROM (v_row ->> 'texto') THEN
      v_details := v_details || jsonb_build_object('texto', 'editado');
    END IF;
  END IF;

  v_name := COALESCE(v_row ->> 'name', v_row ->> 'invite_code', NULL);
  v_target := COALESCE(
    NULLIF(v_row ->> 'user_id', '')::uuid,
    NULLIF(v_row ->> 'id', '')::uuid
  );

  -- O registro nunca impede a ação do admin.
  BEGIN
    INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, target_name, details)
    VALUES (
      v_admin,
      lower(TG_OP) || '_' || v_target_type,
      v_target_type,
      v_target,
      v_name,
      v_details || jsonb_build_object('registro', v_row ->> 'id')
    );
  EXCEPTION WHEN others THEN
    RAISE WARNING 'audit_admin_change: %', SQLERRM;
  END;
  RETURN NULL;
END;
$function$;
REVOKE ALL ON FUNCTION public.audit_admin_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS audit_admin_change ON public.group_testimonials;
CREATE TRIGGER audit_admin_change
  AFTER UPDATE OR DELETE ON public.group_testimonials
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change('group_testimonial');

DROP TRIGGER IF EXISTS audit_admin_change ON public.group_testimonial_reports;
CREATE TRIGGER audit_admin_change
  AFTER UPDATE ON public.group_testimonial_reports
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change('testimonial_report');

DROP TRIGGER IF EXISTS audit_admin_change ON public.organizations;
CREATE TRIGGER audit_admin_change
  AFTER INSERT OR UPDATE OR DELETE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change('organization');

DROP TRIGGER IF EXISTS audit_admin_change ON public.organization_members;
CREATE TRIGGER audit_admin_change
  AFTER INSERT OR UPDATE OR DELETE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change('organization_member');
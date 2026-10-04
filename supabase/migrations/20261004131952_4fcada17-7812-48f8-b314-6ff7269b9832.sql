-- Login mais rápido: tudo o que o app precisa saber logo depois de entrar
-- (admin? tipo de conta, nome, bloqueio, situação do cadastro do psicólogo)
-- numa consulta só. Antes eram de 3 a 5 consultas em sequência no login, e
-- outras 5 no controle de acesso do app.

CREATE OR REPLACE FUNCTION public.get_login_state()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'is_admin', public.is_super_admin(v_uid),
    'profile', (
      SELECT jsonb_build_object('user_type', p.user_type::text, 'full_name', p.full_name)
      FROM public.profiles p WHERE p.user_id = v_uid LIMIT 1
    ),
    'patient', (
      SELECT jsonb_build_object('is_blocked', pt.is_blocked, 'blocked_until', pt.blocked_until, 'blocked_reason', pt.blocked_reason)
      FROM public.patients pt WHERE pt.user_id = v_uid LIMIT 1
    ),
    'psychologist', (
      SELECT jsonb_build_object(
        'approved', ps.approved, 'approval_status', ps.approval_status,
        'is_blocked', ps.is_blocked, 'blocked_until', ps.blocked_until, 'blocked_reason', ps.blocked_reason)
      FROM public.psychologists ps WHERE ps.user_id = v_uid LIMIT 1
    ),
    'registration', (
      SELECT jsonb_build_object('status', r.status, 'rejected_at', r.rejected_at, 'rejection_reason', r.rejection_reason)
      FROM public.psychologist_registrations r WHERE r.user_id = v_uid LIMIT 1
    ),
    'rejection', (
      SELECT to_jsonb(x) FROM public.get_psychologist_rejection_status_unchecked(v_uid) x LIMIT 1
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_login_state() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_login_state() TO authenticated;
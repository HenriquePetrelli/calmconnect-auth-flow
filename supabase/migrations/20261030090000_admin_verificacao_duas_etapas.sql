-- Verificação em duas etapas (app autenticador) para o admin.
--
-- O login com senha dá um token de nível "aal1". Depois do código de 6 dígitos
-- do app autenticador (TOTP do Supabase Auth), o token passa a "aal2". Antes,
-- a senha bastava para tudo: quem a descobrisse via documentos, CPF e Pix,
-- bloqueava e excluía contas e confirmava repasses.
--
-- Agora o admin só é admin (políticas, funções do painel, gatilhos que liberam
-- o admin) com o token aal2. As edge functions de admin conferem o mesmo
-- (supabase/functions/_shared/adminMfa.ts).
--
-- Quando a pergunta é sobre outra pessoa ou vem do servidor (service role,
-- rotinas), vale só o cadastro em admin_users: quem chama não é aquele admin.

CREATE OR REPLACE FUNCTION public.is_super_admin(user_id_param uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    EXISTS (
      SELECT 1
      FROM public.admin_users
      WHERE user_id = user_id_param
        AND is_active = true
    ),
    false
  )
  AND (
    user_id_param IS DISTINCT FROM auth.uid()
    OR COALESCE(auth.jwt() ->> 'aal', '') = 'aal2'
  );
$function$;

-- O app precisa saber que a conta é de admin já com a senha (aal1), para
-- levar à tela do código. Isso não dá acesso a nada: o resto continua
-- exigindo aal2.
CREATE OR REPLACE FUNCTION public.get_login_state()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'is_admin', EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = v_uid AND au.is_active = true),
    'admin_verified', public.is_super_admin(v_uid),
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
$function$;

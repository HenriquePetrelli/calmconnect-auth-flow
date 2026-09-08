INSERT INTO public.admin_users (user_id, is_active)
SELECT id, true FROM auth.users WHERE email = 'admin@admin.com'
ON CONFLICT DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE is_active = true) THEN
    RAISE EXCEPTION 'Nenhum administrador ativo em admin_users.';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.is_super_admin(user_id_param uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT COALESCE(
    EXISTS (
      SELECT 1
      FROM public.admin_users
      WHERE user_id = user_id_param
        AND is_active = true
    ),
    false
  );
$$;
-- is_super_admin() trusted auth.users.raw_user_meta_data as an alternative
-- to admin_users membership. user_metadata is writable by the user it
-- belongs to via supabase.auth.updateUser({ data: { is_super_admin: true } }),
-- so any authenticated account could grant itself super admin and pass
-- every RLS policy and edge function that calls this function.
--
-- Safety guard: refuse to apply if no active admin_users row exists yet,
-- so this migration can never lock every admin out by accident. If this
-- raises, add your own account to admin_users first (see
-- docs/creating-an-admin-account.md) and re-run.
--
-- Wrapped in an explicit transaction: without it, a plain `psql -f` (no
-- ON_ERROR_STOP) or an editor that doesn't abort on error runs each
-- statement as its own autocommitted unit, so the DO block below could
-- fail on its own while the CREATE OR REPLACE FUNCTION after it still
-- runs — silently stripping every admin's access instead of refusing to.
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE is_active = true) THEN
    RAISE EXCEPTION 'Refusing to remove the user_metadata fallback from is_super_admin(): no active row exists in admin_users yet. Add your own admin account to admin_users first (see docs/creating-an-admin-account.md), then re-run this migration.';
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

COMMIT;

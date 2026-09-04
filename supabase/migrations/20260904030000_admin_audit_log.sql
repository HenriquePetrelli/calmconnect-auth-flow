-- Admin actions that change or remove another account (block/unblock,
-- edit, delete) left no trail anywhere beyond Postgres's own internal
-- logs — no way to answer "who blocked this psychologist and why" from
-- inside the app. payment_logs already does this narrowly for payment
-- confirmations; this generalizes the same idea to every admin mutation
-- on a patient or psychologist account.

CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('patient', 'psychologist')),
  target_id uuid,
  target_name text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_audit_log_created_at ON public.admin_audit_log (created_at DESC);
CREATE INDEX idx_admin_audit_log_target ON public.admin_audit_log (target_type, target_id);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read it; only the edge functions (service role key,
-- bypasses RLS) ever write to it — no INSERT/UPDATE/DELETE policy for
-- regular authenticated users, including admins themselves, so the trail
-- can't be edited or erased from the app.
CREATE POLICY "Only admins can view the audit log"
ON public.admin_audit_log
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Paginated read enriched with the acting admin's name — the admin panel
-- needs "who did this", not just a bare user_id.
CREATE OR REPLACE FUNCTION public.get_admin_audit_log(p_limit int DEFAULT 50, p_offset int DEFAULT 0)
RETURNS TABLE (
  id uuid,
  admin_id uuid,
  admin_name text,
  action text,
  target_type text,
  target_id uuid,
  target_name text,
  details jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT
    l.id,
    l.admin_id,
    p.full_name AS admin_name,
    l.action,
    l.target_type,
    l.target_id,
    l.target_name,
    l.details,
    l.created_at
  FROM public.admin_audit_log l
  LEFT JOIN public.profiles p ON p.user_id = l.admin_id
  ORDER BY l.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_audit_log(int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_audit_log(int, int) TO authenticated;

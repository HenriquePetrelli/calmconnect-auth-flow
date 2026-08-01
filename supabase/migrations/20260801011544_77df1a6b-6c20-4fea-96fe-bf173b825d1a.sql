ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS blocked_until timestamp with time zone,
  ADD COLUMN IF NOT EXISTS blocked_reason text,
  ADD COLUMN IF NOT EXISTS blocked_at timestamp with time zone;

DROP POLICY IF EXISTS "Admins can view all patients" ON public.patients;
CREATE POLICY "Admins can view all patients"
ON public.patients FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update all patients" ON public.patients;
CREATE POLICY "Admins can update all patients"
ON public.patients FOR UPDATE TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete patients" ON public.patients;
CREATE POLICY "Admins can delete patients"
ON public.patients FOR DELETE TO authenticated
USING (public.is_super_admin(auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO authenticated;
GRANT ALL ON public.patients TO service_role;
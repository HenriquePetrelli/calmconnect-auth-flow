-- The INSERT policy on notifications only checked `auth.uid() IS NOT NULL`,
-- letting any authenticated patient insert a notification for ANY
-- patient_id — a spam/spoofing vector. Nothing legitimate needs this: the
-- only real writers are the send-appointment-notification edge function
-- (uses the service-role key, which bypasses RLS entirely and is
-- unaffected by this policy) and admin-delete-patient (which only
-- deletes). No client-side code ever inserts a notification. Restricting
-- the check to the caller's own id closes the hole for free.

DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;

CREATE POLICY "Users can create their own notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (patient_id = auth.uid());

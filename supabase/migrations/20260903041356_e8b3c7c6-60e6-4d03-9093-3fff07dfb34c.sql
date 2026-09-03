DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;

CREATE POLICY "Users can create their own notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (patient_id = auth.uid());
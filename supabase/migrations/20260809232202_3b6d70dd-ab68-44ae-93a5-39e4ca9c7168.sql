CREATE POLICY "Patients can update their own emergency requests"
ON public.emergency_requests
FOR UPDATE
TO authenticated
USING (patient_id = auth.uid())
WITH CHECK (patient_id = auth.uid());
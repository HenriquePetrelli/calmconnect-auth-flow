-- Allow patients to cancel their own emergency requests
CREATE POLICY IF NOT EXISTS "Patients can cancel their emergency requests"
ON public.emergency_requests
FOR UPDATE
USING (auth.uid() = patient_id)
WITH CHECK (auth.uid() = patient_id AND status = 'cancelled');
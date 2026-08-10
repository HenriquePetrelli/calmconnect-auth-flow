-- 1) Nunca deletar solicitações de emergência
DROP POLICY IF EXISTS "Patients can delete their own emergency requests" ON public.emergency_requests;

-- 2) Psicólogos: leitura restrita a solicitações abertas ou próprias
DROP POLICY IF EXISTS "Psychologists can view all emergency requests" ON public.emergency_requests;
CREATE POLICY "Psychologists can view open or own emergency requests"
ON public.emergency_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.user_type = 'psychologist'::user_type
  )
  AND (accepted_by = auth.uid() OR (status = 'pending' AND accepted_by IS NULL))
);

-- 3) Psicólogos: update restrito, sem transferir para outro profissional
DROP POLICY IF EXISTS "Psychologists can update emergency requests" ON public.emergency_requests;
CREATE POLICY "Psychologists can update open or own emergency requests"
ON public.emergency_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.user_type = 'psychologist'::user_type
  )
  AND (accepted_by = auth.uid() OR (status = 'pending' AND accepted_by IS NULL))
)
WITH CHECK (
  accepted_by = auth.uid() OR accepted_by IS NULL
);

-- 4) webrtc_sessions: impedir reatribuição da sala
DROP POLICY IF EXISTS "Enable update for participants" ON public.webrtc_sessions;
CREATE POLICY "Enable update for participants"
ON public.webrtc_sessions
FOR UPDATE
TO authenticated
USING (psychologist_id = auth.uid() OR patient_id = auth.uid())
WITH CHECK (psychologist_id = auth.uid() OR patient_id = auth.uid());
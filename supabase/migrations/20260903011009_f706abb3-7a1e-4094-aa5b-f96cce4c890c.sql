CREATE TABLE public.patient_mood_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mood_value smallint NOT NULL CHECK (mood_value BETWEEN 1 AND 5),
  logged_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, logged_date)
);

CREATE INDEX idx_patient_mood_logs_patient_date
  ON public.patient_mood_logs (patient_id, logged_date DESC);

GRANT SELECT, INSERT, UPDATE ON public.patient_mood_logs TO authenticated;
GRANT ALL ON public.patient_mood_logs TO service_role;

ALTER TABLE public.patient_mood_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view their own mood logs"
  ON public.patient_mood_logs
  FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients can insert their own mood logs"
  ON public.patient_mood_logs
  FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients can update their own mood logs"
  ON public.patient_mood_logs
  FOR UPDATE
  USING (auth.uid() = patient_id);
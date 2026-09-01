CREATE TABLE public.psychologist_availability_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  psychologist_id uuid NOT NULL,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  type text NOT NULL CHECK (type IN ('bloqueio', 'abertura')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

CREATE INDEX idx_psych_availability_overrides_psych_date
  ON public.psychologist_availability_overrides (psychologist_id, date);

GRANT SELECT ON public.psychologist_availability_overrides TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.psychologist_availability_overrides TO authenticated;
GRANT ALL ON public.psychologist_availability_overrides TO service_role;

ALTER TABLE public.psychologist_availability_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view availability overrides"
  ON public.psychologist_availability_overrides
  FOR SELECT
  USING (true);

CREATE POLICY "Psychologists can manage their own availability overrides"
  ON public.psychologist_availability_overrides
  FOR ALL
  USING (psychologist_id = auth.uid())
  WITH CHECK (psychologist_id = auth.uid());

CREATE TRIGGER update_psychologist_availability_overrides_updated_at
  BEFORE UPDATE ON public.psychologist_availability_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
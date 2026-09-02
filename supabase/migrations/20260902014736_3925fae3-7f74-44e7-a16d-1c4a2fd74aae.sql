CREATE TABLE public.psychologist_vacations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  psychologist_id uuid NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_vacation_range CHECK (start_date <= end_date)
);

CREATE INDEX idx_psychologist_vacations_psych_dates
  ON public.psychologist_vacations (psychologist_id, start_date, end_date);

GRANT SELECT ON public.psychologist_vacations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.psychologist_vacations TO authenticated;
GRANT ALL ON public.psychologist_vacations TO service_role;

ALTER TABLE public.psychologist_vacations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view vacations"
  ON public.psychologist_vacations
  FOR SELECT
  USING (true);

CREATE POLICY "Psychologists can manage their own vacations"
  ON public.psychologist_vacations
  FOR ALL
  USING (psychologist_id = auth.uid())
  WITH CHECK (psychologist_id = auth.uid());
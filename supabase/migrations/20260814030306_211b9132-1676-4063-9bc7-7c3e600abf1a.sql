ALTER TABLE public.session_feedback
  ADD COLUMN IF NOT EXISTS symptoms text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS clinical_notes text;
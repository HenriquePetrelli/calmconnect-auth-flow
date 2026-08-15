ALTER TABLE public.session_feedback
  ADD COLUMN IF NOT EXISTS resolution_status text,
  ADD COLUMN IF NOT EXISTS felt_heard text,
  ADD COLUMN IF NOT EXISTS has_complaint boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS complaint_categories text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS complaint_description text,
  ADD COLUMN IF NOT EXISTS requires_admin_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS psychologist_id uuid;

CREATE INDEX IF NOT EXISTS idx_session_feedback_admin_review
  ON public.session_feedback (requires_admin_review, created_at DESC)
  WHERE requires_admin_review;

CREATE UNIQUE INDEX IF NOT EXISTS session_feedback_session_user_uidx
  ON public.session_feedback (session_id, user_id);

ALTER TABLE public.session_feedback
  DROP CONSTRAINT IF EXISTS session_feedback_resolution_status_check;
ALTER TABLE public.session_feedback
  ADD CONSTRAINT session_feedback_resolution_status_check
  CHECK (resolution_status IS NULL OR resolution_status IN ('resolved','partially_resolved','not_resolved'));

ALTER TABLE public.session_feedback
  DROP CONSTRAINT IF EXISTS session_feedback_felt_heard_check;
ALTER TABLE public.session_feedback
  ADD CONSTRAINT session_feedback_felt_heard_check
  CHECK (felt_heard IS NULL OR felt_heard IN ('yes','partially','no'));
-- 1. Emergency request: outcome of the session
ALTER TABLE public.emergency_requests
  ADD COLUMN IF NOT EXISTS crisis_resolved boolean,
  ADD COLUMN IF NOT EXISTS end_notes text;

-- 2. Session feedback: optional free-text comment
ALTER TABLE public.session_feedback
  ADD COLUMN IF NOT EXISTS comment text;

-- 3. Feedback idempotency: one feedback per user per session.
--    Remove pre-existing duplicates first, keeping the newest row.
DELETE FROM public.session_feedback sf
USING public.session_feedback newer
WHERE sf.session_id = newer.session_id
  AND sf.user_id = newer.user_id
  AND sf.created_at < newer.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS session_feedback_session_user_unique
  ON public.session_feedback (session_id, user_id);

-- 4. Helpful index for open-request lookups (dedup guard + realtime filters)
CREATE INDEX IF NOT EXISTS emergency_requests_patient_status_idx
  ON public.emergency_requests (patient_id, status);

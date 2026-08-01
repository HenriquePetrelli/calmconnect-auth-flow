ALTER TABLE public.emergency_requests
  ADD COLUMN IF NOT EXISTS ended_by uuid,
  ADD COLUMN IF NOT EXISTS ended_by_type text,
  ADD COLUMN IF NOT EXISTS end_reason text;

ALTER TABLE public.webrtc_sessions
  ADD COLUMN IF NOT EXISTS end_reason text;
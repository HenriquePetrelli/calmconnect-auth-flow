ALTER TABLE public.webrtc_sessions
  ADD COLUMN IF NOT EXISTS time_left_seconds integer,
  ADD COLUMN IF NOT EXISTS timer_paused boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS timer_updated_at timestamptz;
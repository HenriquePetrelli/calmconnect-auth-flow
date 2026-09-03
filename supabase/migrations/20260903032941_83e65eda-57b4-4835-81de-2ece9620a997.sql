ALTER TABLE public.subscribers
  ADD COLUMN IF NOT EXISTS appointments_used_this_month boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS appointments_last_used timestamptz;
-- The Premium plan's "1 consulta agendada por mês" limit was never actually
-- enforced anywhere: the appointments edge function accepted a booking from
-- any authenticated patient regardless of subscription tier or quota, and
-- the only client-side gate (subscriptionTier === 'Premium') is trivially
-- bypassed by calling the edge function directly. These columns mirror the
-- sos_used_this_month / sos_last_used same-month-reset pattern already used
-- for the SOS quota, so the appointments quota can use the same approach.

ALTER TABLE public.subscribers
  ADD COLUMN IF NOT EXISTS appointments_used_this_month boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS appointments_last_used timestamptz;

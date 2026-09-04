-- psychologist_availability_overrides and psychologist_vacations were both
-- created without a foreign key on psychologist_id (just `uuid NOT NULL`),
-- unlike every sibling table (psychologist_availability, psychologist_payments,
-- webrtc_sessions, etc.) which cascades from auth.users. Deleting a
-- psychologist (admin-delete-psychologist) never cleaned these two up
-- either, so their rows became permanently orphaned — pointing at a
-- psychologist_id that no longer exists, with no way to ever get removed.
-- Add the missing FK so this is handled automatically going forward, same
-- as everywhere else.
--
-- Any row already orphaned in production predates this constraint and
-- must be cleaned up manually first, or this ALTER will fail — that is
-- intentional (fail loud instead of silently deleting rows the app can't
-- prove are actually orphaned from in here).

ALTER TABLE public.psychologist_availability_overrides
  ADD CONSTRAINT psychologist_availability_overrides_psychologist_id_fkey
  FOREIGN KEY (psychologist_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.psychologist_vacations
  ADD CONSTRAINT psychologist_vacations_psychologist_id_fkey
  FOREIGN KEY (psychologist_id) REFERENCES auth.users(id) ON DELETE CASCADE;

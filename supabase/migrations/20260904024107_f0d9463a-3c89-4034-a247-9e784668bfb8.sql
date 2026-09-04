ALTER TABLE public.psychologist_availability_overrides
  ADD CONSTRAINT psychologist_availability_overrides_psychologist_id_fkey
  FOREIGN KEY (psychologist_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.psychologist_vacations
  ADD CONSTRAINT psychologist_vacations_psychologist_id_fkey
  FOREIGN KEY (psychologist_id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- Admins only ever found out about a new pending psychologist registration
-- by happening to open the admin panel — nothing notified them. Every
-- active admin now gets an in-app notification the moment a registration
-- becomes pending (new signup, or a resubmission after rejection).

CREATE OR REPLACE FUNCTION public.notify_admins_new_psychologist_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'pending' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'pending') THEN
    INSERT INTO public.notifications (patient_id, title, message)
    SELECT
      au.user_id,
      'Novo cadastro de psicólogo pendente',
      'Um psicólogo se cadastrou e está aguardando aprovação.'
    FROM public.admin_users au
    WHERE au.is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_admins_new_psychologist_registration_trigger ON public.psychologist_registrations;
CREATE TRIGGER notify_admins_new_psychologist_registration_trigger
  AFTER INSERT OR UPDATE ON public.psychologist_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_new_psychologist_registration();

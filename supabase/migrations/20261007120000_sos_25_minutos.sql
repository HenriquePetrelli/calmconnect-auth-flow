-- SOS: 25 minutos para todos os planos (antes Premium tinha 50, Plus 25 e
-- sem plano 20). A consulta agendada continua com 50 minutos.
CREATE OR REPLACE FUNCTION public.set_emergency_time_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.time_limit_seconds := 25 * 60;
  RETURN NEW;
END;
$function$;

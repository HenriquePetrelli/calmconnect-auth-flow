CREATE OR REPLACE FUNCTION public.count_available_psychologists()
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT count(*)::int
  FROM public.psychologist_presence pp
  JOIN public.psychologists p ON p.user_id = pp.psychologist_id
  WHERE pp.last_online > now() - interval '3 minutes'
    AND pp.current_emergency_id IS NULL
    AND p.approved = true
    AND p.approval_status = 'approved'
    AND (
      COALESCE(p.is_blocked, false) = false
      OR (p.blocked_until IS NOT NULL AND p.blocked_until < now())
    );
$function$;
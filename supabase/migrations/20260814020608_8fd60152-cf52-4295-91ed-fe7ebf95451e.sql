CREATE OR REPLACE FUNCTION public.psychologist_can_attend(p_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.psychologists p
    WHERE p.user_id = p_user_id
      AND p.approved = true
      AND p.approval_status = 'approved'
      AND (
        COALESCE(p.is_blocked, false) = false
        OR (p.blocked_until IS NOT NULL AND p.blocked_until < now())
      )
  );
$function$;

UPDATE public.psychologists
SET is_blocked = false
WHERE is_blocked = true AND blocked_until IS NOT NULL AND blocked_until < now();
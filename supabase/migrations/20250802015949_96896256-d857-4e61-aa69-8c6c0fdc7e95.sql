-- Create a simple is_admin function that returns false for now
CREATE OR REPLACE FUNCTION public.is_admin(user_id_param uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT false; -- Simplified for now
$function$;

-- Now update profiles table to mark psychologists as approved based on psychologists table
UPDATE public.profiles 
SET registration_status = 'approved'
WHERE user_id IN (
    SELECT user_id 
    FROM public.psychologists 
    WHERE approved = true AND approval_status = 'approved'
);

-- Also ensure the mapping is correct by updating profiles with psychologist data  
UPDATE public.profiles 
SET 
    specialty = p.specialization,
    crp = p.crp_number
FROM public.psychologists p
WHERE profiles.user_id = p.user_id 
    AND p.approved = true 
    AND p.approval_status = 'approved';
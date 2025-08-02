-- Temporarily disable the trigger that prevents user type changes
DROP TRIGGER IF EXISTS prevent_user_type_change_trigger ON public.profiles;

-- Update profiles table to mark psychologists as approved based on psychologists table
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

-- Re-enable the trigger
CREATE TRIGGER prevent_user_type_change_trigger
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_user_type_change();
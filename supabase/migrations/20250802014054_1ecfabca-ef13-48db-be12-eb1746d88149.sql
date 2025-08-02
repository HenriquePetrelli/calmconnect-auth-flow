-- Add foreign key constraints to establish proper relationships

-- First, ensure the psychologist_id in appointments references the psychologists table
ALTER TABLE public.appointments 
ADD CONSTRAINT fk_appointments_psychologist 
FOREIGN KEY (psychologist_id) REFERENCES public.psychologists(user_id);

-- Add foreign key for patient_id in appointments to link to auth users
-- We use user_id since we can't directly reference auth.users
-- Note: This assumes patient_id should reference user_id, not the psychologists table

-- Add index for better performance on foreign key columns
CREATE INDEX IF NOT EXISTS idx_appointments_psychologist_id ON public.appointments(psychologist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
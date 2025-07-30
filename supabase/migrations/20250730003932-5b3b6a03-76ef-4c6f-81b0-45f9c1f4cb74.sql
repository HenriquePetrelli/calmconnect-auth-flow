-- Enable realtime for emergency_requests table
ALTER TABLE public.emergency_requests REPLICA IDENTITY FULL;

-- Add the table to realtime publication
BEGIN;
  -- Remove the table from publication first (in case it's already added)
  ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.emergency_requests;
  -- Add the table to the publication
  ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_requests;
COMMIT;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_emergency_requests_status ON public.emergency_requests(status);
CREATE INDEX IF NOT EXISTS idx_emergency_requests_created_at ON public.emergency_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_emergency_requests_accepted_by ON public.emergency_requests(accepted_by);
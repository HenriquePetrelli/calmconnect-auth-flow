ALTER TABLE public.psychologist_presence REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.psychologist_presence;
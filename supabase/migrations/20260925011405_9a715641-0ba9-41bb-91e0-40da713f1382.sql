REVOKE ALL ON FUNCTION public.set_emergency_time_limit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_stale_emergency_sessions() FROM PUBLIC, anon, authenticated;
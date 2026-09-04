-- No edge function in this project enforces any request rate limit — SOS
-- creation, appointment booking, and support-request emails (which cost
-- money per send via Resend) can all be called as many times as an
-- authenticated session wants. A small fixed-window counter, checked and
-- incremented atomically in one UPSERT, is enough to stop obvious abuse
-- without adding new infrastructure.

CREATE TABLE public.rate_limits (
  key text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 1
);

-- No RLS needed: only ever touched through check_rate_limit(), which is
-- SECURITY DEFINER and not directly readable/writable by clients.
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_key text, p_max_requests int, p_window_seconds int)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_now timestamptz := now();
  v_count integer;
BEGIN
  INSERT INTO public.rate_limits (key, window_start, count)
  VALUES (p_key, v_now, 1)
  ON CONFLICT (key) DO UPDATE SET
    count = CASE
      WHEN public.rate_limits.window_start <= v_now - make_interval(secs => p_window_seconds)
        THEN 1
      ELSE public.rate_limits.count + 1
    END,
    window_start = CASE
      WHEN public.rate_limits.window_start <= v_now - make_interval(secs => p_window_seconds)
        THEN v_now
      ELSE public.rate_limits.window_start
    END
  RETURNING count INTO v_count;

  RETURN v_count <= p_max_requests;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, int, int) TO authenticated, service_role;

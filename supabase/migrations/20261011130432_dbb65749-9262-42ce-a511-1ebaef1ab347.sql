-- Rotinas automáticas (varredura de funcionamento).
--
-- 1. Histórico das rotinas sem fim: o pg_cron guarda cada execução em
--    cron.job_run_details para sempre. Com rotinas de minuto em minuto, são
--    milhares de linhas por dia ocupando o banco. Agora fica só o de 14 dias.
-- 2. Saúde das rotinas no painel do admin: antes, para saber se uma rotina
--    parou (lembretes, pushes, consultas presas), era preciso abrir o banco.
--    A função get_routines_health (só admin) diz, por rotina, a última
--    execução e as falhas das últimas 24 h; a Visão geral mostra o resumo.

CREATE OR REPLACE FUNCTION public.purge_cron_history()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer := 0;
BEGIN
  BEGIN
    EXECUTE 'DELETE FROM cron.job_run_details WHERE end_time < now() - interval ''14 days''';
    GET DIAGNOSTICS v_count = ROW_COUNT;
  EXCEPTION WHEN undefined_table OR insufficient_privilege THEN
    RETURN 0;
  END;
  RETURN v_count;
END;
$function$;
REVOKE ALL ON FUNCTION public.purge_cron_history() FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule('purge-cron-history')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-cron-history');
SELECT cron.schedule('purge-cron-history', '20 5 * * *', 'SELECT public.purge_cron_history();');

-- Saúde das rotinas (só admin).
CREATE OR REPLACE FUNCTION public.get_routines_health()
RETURNS TABLE(
  jobname text,
  schedule text,
  active boolean,
  last_status text,
  last_start timestamptz,
  failures_24h integer,
  last_error text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;
  BEGIN
    RETURN QUERY EXECUTE $q$
      SELECT j.jobname::text, j.schedule::text, j.active,
             last_run.status::text, last_run.start_time,
             COALESCE(fail.n, 0)::integer,
             fail.last_message::text
      FROM cron.job j
      LEFT JOIN LATERAL (
        SELECT d.status, d.start_time FROM cron.job_run_details d
        WHERE d.jobid = j.jobid ORDER BY d.start_time DESC LIMIT 1
      ) last_run ON true
      LEFT JOIN LATERAL (
        SELECT count(*) AS n,
               (array_agg(left(d.return_message, 300) ORDER BY d.start_time DESC))[1] AS last_message
        FROM cron.job_run_details d
        WHERE d.jobid = j.jobid AND d.status = 'failed' AND d.start_time > now() - interval '24 hours'
      ) fail ON true
      ORDER BY COALESCE(fail.n, 0) DESC, j.jobname
    $q$;
  EXCEPTION WHEN undefined_table THEN
    -- Sem histórico (ambiente sem pg_cron completo): só a lista.
    RETURN QUERY
      SELECT j.jobname::text, j.schedule::text, j.active, NULL::text, NULL::timestamptz, 0, NULL::text
      FROM cron.job j ORDER BY j.jobname;
  END;
END;
$function$;
REVOKE ALL ON FUNCTION public.get_routines_health() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_routines_health() TO authenticated;
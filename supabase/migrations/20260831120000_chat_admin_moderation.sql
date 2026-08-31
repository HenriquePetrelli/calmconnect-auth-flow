-- Admin chat moderation: usage metrics and per-conversation overview,
-- both metadata-only (never expose mensagens.conteudo / imagem_url to admin),
-- plus an archive action so admin can close a flagged conversation
-- without ever reading its content.

CREATE OR REPLACE FUNCTION public.get_chat_usage_metrics(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_since timestamptz := now() - make_interval(days => GREATEST(COALESCE(p_days, 30), 1));
  v_result jsonb;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'total_conversas', (SELECT count(*) FROM public.conversas),
    'ativas', (SELECT count(*) FROM public.conversas WHERE status = 'ativa'),
    'somente_leitura', (SELECT count(*) FROM public.conversas WHERE status = 'somente_leitura'),
    'expiradas', (SELECT count(*) FROM public.conversas WHERE status = 'expirada'),
    'conversas_novas', (SELECT count(*) FROM public.conversas WHERE data_inicio >= v_since),
    'total_mensagens', (SELECT count(*) FROM public.mensagens WHERE created_at >= v_since),
    'mensagens_texto', (SELECT count(*) FROM public.mensagens WHERE created_at >= v_since AND tipo = 'texto'),
    'mensagens_imagem', (SELECT count(*) FROM public.mensagens WHERE created_at >= v_since AND tipo = 'imagem'),
    'avg_mensagens_por_conversa_ativa', COALESCE((
      SELECT round(avg(qty), 1)
      FROM (
        SELECT count(*) AS qty
        FROM public.mensagens m
        JOIN public.conversas c ON c.id = m.conversa_id
        WHERE c.status <> 'expirada'
        GROUP BY m.conversa_id
      ) per_conversa
    ), 0)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_chat_usage_metrics(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_chat_usage_metrics(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_conversas_overview()
RETURNS TABLE(
  conversa_id uuid,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  paciente_nome text,
  psicologo_nome text,
  mensagens_count bigint,
  last_message_at timestamptz,
  last_message_tipo text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Super admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.status,
    c.created_at,
    c.updated_at,
    pac.full_name,
    psi.full_name,
    COALESCE(m.mensagens_count, 0),
    m.last_message_at,
    m.last_message_tipo
  FROM public.conversas c
  LEFT JOIN public.profiles pac ON pac.user_id = c.paciente_id
  LEFT JOIN public.profiles psi ON psi.user_id = c.psicologo_id
  LEFT JOIN LATERAL (
    SELECT count(*) AS mensagens_count,
           max(created_at) AS last_message_at,
           (array_agg(tipo ORDER BY created_at DESC))[1] AS last_message_tipo
    FROM public.mensagens
    WHERE conversa_id = c.id
  ) m ON true
  ORDER BY c.updated_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_conversas_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_conversas_overview() TO authenticated;

-- Lets admin close a conversation flagged elsewhere (e.g. a support report)
-- without ever needing row-level SELECT access to mensagens content.
CREATE OR REPLACE FUNCTION public.admin_archive_conversa(p_conversa_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Super admin privileges required.';
  END IF;

  UPDATE public.conversas
  SET status = 'expirada',
      data_fim = COALESCE(data_fim, now())
  WHERE id = p_conversa_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_archive_conversa(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_archive_conversa(uuid) TO authenticated;

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
           max(msg.created_at) AS last_message_at,
           (array_agg(msg.tipo ORDER BY msg.created_at DESC))[1] AS last_message_tipo
    FROM public.mensagens msg
    WHERE msg.conversa_id = c.id
  ) m ON true
  ORDER BY c.updated_at DESC;
END;
$$;
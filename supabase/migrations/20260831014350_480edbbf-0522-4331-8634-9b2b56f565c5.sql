-- PARTE 1 — Painel admin de uso/moderação do chat (metadata-only)

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

-- PARTE 2 — Indicadores de leitura no chat

ALTER TABLE public.mensagens ADD COLUMN IF NOT EXISTS lida_em timestamptz;

CREATE OR REPLACE FUNCTION public.marcar_mensagens_como_lidas(p_conversa_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.conversas c
    WHERE c.id = p_conversa_id
      AND (c.paciente_id = auth.uid() OR c.psicologo_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Conversa não encontrada ou acesso negado';
  END IF;

  UPDATE public.mensagens
  SET lida_em = now()
  WHERE conversa_id = p_conversa_id
    AND autor_id <> auth.uid()
    AND lida_em IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.marcar_mensagens_como_lidas(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.marcar_mensagens_como_lidas(uuid) TO authenticated;

-- PARTE 3 — Sessão WebRTC para consultas agendadas

CREATE OR REPLACE FUNCTION public.get_or_create_appointment_webrtc_session(p_appointment_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_appointment record;
  v_room_id uuid;
BEGIN
  SELECT id, patient_id, psychologist_id, video_room_id
  INTO v_appointment
  FROM public.appointments
  WHERE id = p_appointment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Consulta não encontrada';
  END IF;

  IF auth.uid() NOT IN (v_appointment.patient_id, v_appointment.psychologist_id) THEN
    RAISE EXCEPTION 'Acesso negado a esta consulta';
  END IF;

  IF v_appointment.video_room_id IS NOT NULL THEN
    RETURN v_appointment.video_room_id;
  END IF;

  INSERT INTO public.webrtc_sessions (patient_id, psychologist_id, status, expires_at)
  VALUES (v_appointment.patient_id, v_appointment.psychologist_id, 'pending', now() + interval '24 hours')
  RETURNING id INTO v_room_id;

  UPDATE public.appointments
  SET video_room_id = v_room_id
  WHERE id = p_appointment_id;

  RETURN v_room_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_appointment_webrtc_session(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_appointment_webrtc_session(uuid) TO authenticated;
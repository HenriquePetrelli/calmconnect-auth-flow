-- Nota real dos psicólogos na lista do agendamento: a função
-- get_psychologists_public_stats (migração anterior) passa a devolver também a
-- média e a quantidade das avaliações dos pacientes, além das consultas e SOS
-- concluídos. Antes a lista mostrava 4 estrelas fixas para todo mundo.
--
-- O paciente não lê consultas, pedidos de SOS nem avaliações de outras pessoas
-- (RLS), então os totais vêm desta função, que devolve só números e só de
-- psicólogos aprovados. Nada de nome de paciente, data ou comentário.
--
-- A nota é calculada aqui, das avaliações (session_feedback), porque a coluna
-- psychologists.ratings_count nunca foi atualizada pelo banco.

DROP FUNCTION IF EXISTS public.get_psychologists_public_stats(uuid[]);

CREATE FUNCTION public.get_psychologists_public_stats(p_user_ids uuid[])
RETURNS TABLE(
  user_id uuid,
  consultation_count integer,
  sos_count integer,
  average_rating numeric,
  ratings_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    p.user_id,
    (
      SELECT count(*)::integer
      FROM public.appointments a
      WHERE a.psychologist_id = p.user_id AND a.status = 'completed'
    ) AS consultation_count,
    (
      SELECT count(*)::integer
      FROM public.emergency_requests er
      WHERE er.accepted_by = p.user_id AND er.status = 'completed'
    ) AS sos_count,
    r.average_rating,
    COALESCE(r.ratings_count, 0) AS ratings_count
  FROM public.psychologists p
  LEFT JOIN LATERAL (
    SELECT round(avg(f.rating)::numeric, 1) AS average_rating, count(*)::integer AS ratings_count
    FROM public.session_feedback f
    JOIN public.webrtc_sessions s ON s.id = f.session_id
    WHERE s.psychologist_id = p.user_id
      AND f.user_type = 'patient'
      AND f.rating IS NOT NULL
  ) r ON true
  WHERE auth.uid() IS NOT NULL
    AND p.approved = true
    AND p.user_id = ANY (p_user_ids[1:200]);
$$;

REVOKE ALL ON FUNCTION public.get_psychologists_public_stats(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_psychologists_public_stats(uuid[]) TO authenticated, service_role;

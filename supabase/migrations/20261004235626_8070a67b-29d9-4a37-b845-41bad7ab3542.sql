-- Totais de atendimento de cada psicólogo, mostrados ao paciente na hora de
-- escolher com quem agendar: consultas concluídas e SOS concluídos.
--
-- O paciente não lê consultas nem pedidos de SOS de outras pessoas (RLS), então
-- os totais vêm desta função, que devolve só números e só de psicólogos
-- aprovados. Nada de nome de paciente, data ou conteúdo.

CREATE OR REPLACE FUNCTION public.get_psychologists_public_stats(p_user_ids uuid[])
RETURNS TABLE(user_id uuid, consultation_count integer, sos_count integer)
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
    ) AS sos_count
  FROM public.psychologists p
  WHERE auth.uid() IS NOT NULL
    AND p.approved = true
    AND p.user_id = ANY (p_user_ids[1:200]);
$$;

REVOKE ALL ON FUNCTION public.get_psychologists_public_stats(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_psychologists_public_stats(uuid[]) TO authenticated, service_role;
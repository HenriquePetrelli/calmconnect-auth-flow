-- Depoimentos de grupos de apoio: anonimato de verdade + denúncia.
--
-- 1) Anonimato. A policy de SELECT era USING (true) para qualquer
--    autenticado, e RLS não esconde colunas: todo depoimento "anônimo"
--    chegava ao navegador com o user_id do autor. A correção anterior só
--    parou de buscar o nome — o id continuava na resposta. Agora a tabela
--    só é legível pelo próprio autor; o feed do grupo vem de
--    get_group_testimonials, que nunca devolve user_id e só devolve o nome
--    quando o depoimento não é anônimo.
--
-- 2) Denúncia. Um espaço público onde pessoas relatam sintomas precisava de
--    um canal para sinalizar conteúdo nocivo. Denúncias entram na fila de
--    moderação do admin (get_admin_group_testimonials), sem remover nada
--    automaticamente.

DROP POLICY IF EXISTS "Authenticated users can view testimonials" ON public.group_testimonials;
DROP POLICY IF EXISTS "Todos podem visualizar depoimentos" ON public.group_testimonials;
DROP POLICY IF EXISTS "Authors can view their own testimonials" ON public.group_testimonials;

CREATE POLICY "Authors can view their own testimonials"
  ON public.group_testimonials FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Denúncias ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.group_testimonial_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  testimonial_id uuid NOT NULL REFERENCES public.group_testimonials(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  reason text NOT NULL CHECK (reason IN ('ofensivo', 'risco', 'spam', 'dados_pessoais', 'outro')),
  details text CHECK (details IS NULL OR length(details) <= 500),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dismissed', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  UNIQUE (testimonial_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS idx_group_testimonial_reports_pending
  ON public.group_testimonial_reports (testimonial_id) WHERE status = 'pending';

ALTER TABLE public.group_testimonial_reports ENABLE ROW LEVEL SECURITY;

-- Sem policies para usuários comuns: denunciar passa por
-- report_group_testimonial, e só admins leem a fila.
CREATE POLICY "Admins can view testimonial reports"
  ON public.group_testimonial_reports FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

GRANT SELECT ON public.group_testimonial_reports TO authenticated;
GRANT ALL ON public.group_testimonial_reports TO service_role;

-- Feed do grupo --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_group_testimonials(p_group_id uuid, p_only_mine boolean DEFAULT false)
RETURNS TABLE(
  id uuid,
  group_id uuid,
  anonimo boolean,
  sintoma_id uuid,
  sintoma_texto text,
  humor integer,
  texto text,
  criado_em timestamptz,
  likes_positivos integer,
  likes_negativos integer,
  autor_nome text,
  is_mine boolean,
  user_like text,
  reported_by_me boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.group_id,
    t.anonimo,
    t.sintoma_id,
    t.sintoma_texto,
    t.humor::integer,
    t.texto,
    t.criado_em,
    t.likes_positivos::integer,
    t.likes_negativos::integer,
    CASE WHEN t.anonimo THEN NULL ELSE p.full_name END,
    t.user_id = v_uid,
    l.tipo::text,
    EXISTS (
      SELECT 1 FROM public.group_testimonial_reports r
      WHERE r.testimonial_id = t.id AND r.reporter_id = v_uid
    )
  FROM public.group_testimonials t
  LEFT JOIN public.profiles p ON p.user_id = t.user_id AND NOT t.anonimo
  LEFT JOIN public.group_testimonial_likes l ON l.testimonial_id = t.id AND l.user_id = v_uid
  WHERE t.group_id = p_group_id
    AND (NOT p_only_mine OR t.user_id = v_uid)
  ORDER BY t.criado_em DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_group_testimonials(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_group_testimonials(uuid, boolean) TO authenticated;

-- Denunciar ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.report_group_testimonial(p_testimonial_id uuid, p_reason text, p_details text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_author uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT user_id INTO v_author FROM public.group_testimonials WHERE id = p_testimonial_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Depoimento não encontrado';
  END IF;
  IF v_author = v_uid THEN
    RAISE EXCEPTION 'Não é possível denunciar o próprio depoimento';
  END IF;

  INSERT INTO public.group_testimonial_reports (testimonial_id, reporter_id, reason, details)
  VALUES (p_testimonial_id, v_uid, p_reason, NULLIF(trim(p_details), ''))
  ON CONFLICT (testimonial_id, reporter_id)
  DO UPDATE SET reason = EXCLUDED.reason, details = EXCLUDED.details, status = 'pending', created_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.report_group_testimonial(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_group_testimonial(uuid, text, text) TO authenticated;

-- Admin: fila de moderação passa a considerar denúncias -----------------------
DROP FUNCTION IF EXISTS public.get_admin_group_testimonials();

CREATE FUNCTION public.get_admin_group_testimonials()
RETURNS TABLE(
  testimonial_id uuid,
  group_id uuid,
  group_nome text,
  autor_nome text,
  anonimo boolean,
  texto text,
  humor integer,
  likes_positivos integer,
  likes_negativos integer,
  flagged boolean,
  criado_em timestamptz,
  pending_reports integer,
  report_reasons text[]
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
    t.id,
    t.group_id,
    g.nome,
    CASE WHEN t.anonimo THEN NULL ELSE p.full_name END,
    t.anonimo,
    t.texto,
    t.humor::integer,
    t.likes_positivos::integer,
    t.likes_negativos::integer,
    (t.likes_negativos >= 10 OR COALESCE(r.cnt, 0) > 0),
    t.criado_em,
    COALESCE(r.cnt, 0)::integer,
    COALESCE(r.reasons, ARRAY[]::text[])
  FROM public.group_testimonials t
  JOIN public.support_groups g ON g.id = t.group_id
  LEFT JOIN public.profiles p ON p.user_id = t.user_id
  LEFT JOIN LATERAL (
    SELECT count(*) AS cnt, array_agg(DISTINCT gr.reason) AS reasons
    FROM public.group_testimonial_reports gr
    WHERE gr.testimonial_id = t.id AND gr.status = 'pending'
  ) r ON true
  ORDER BY COALESCE(r.cnt, 0) DESC, (t.likes_negativos >= 10) DESC, t.likes_negativos DESC, t.criado_em DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_group_testimonials() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_group_testimonials() TO authenticated;

-- Admin: arquivar denúncias sem mexer no depoimento ---------------------------
CREATE OR REPLACE FUNCTION public.admin_dismiss_testimonial_reports(p_testimonial_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Super admin privileges required.';
  END IF;

  UPDATE public.group_testimonial_reports
  SET status = 'dismissed', reviewed_at = now(), reviewed_by = auth.uid()
  WHERE testimonial_id = p_testimonial_id AND status = 'pending';
END;
$$;

REVOKE ALL ON FUNCTION public.admin_dismiss_testimonial_reports(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_dismiss_testimonial_reports(uuid) TO authenticated;

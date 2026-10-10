-- Grupos de apoio: regras no servidor.
--
-- 1. Escrever depoimento e reagir são dos planos Plus e Premium (inclusive o
--    plano pago pela empresa). Antes isso só era conferido na tela: pela API,
--    qualquer conta, mesmo sem plano, escrevia e reagia.
-- 2. Reagir numa operação só (trocar, tirar). Antes o app lia e depois
--    gravava: dois toques rápidos davam erro e a tela voltava ao estado antigo.
-- 3. Ninguém reage ao próprio depoimento (a tela escondia; a API deixava).
-- 4. Depoimento com 3 denúncias pendentes de pessoas diferentes sai da lista
--    dos outros até o admin revisar (nada é apagado; o autor continua vendo,
--    com o aviso "em análise"). Antes um texto com conteúdo de risco ficava à
--    vista de todos até alguém do admin abrir o painel.
-- 5. Gatilho de contagem duplicado removido (o mesmo cálculo rodava duas vezes).

CREATE OR REPLACE FUNCTION public.has_paid_plan(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.subscribers s
    WHERE s.user_id = p_user_id
      AND s.subscribed
      AND lower(COALESCE(s.subscription_tier, '')) IN ('plus', 'premium')
      AND (s.subscription_end IS NULL OR s.subscription_end > now())
  );
$function$;

REVOKE ALL ON FUNCTION public.has_paid_plan(uuid) FROM PUBLIC, anon, authenticated;

-- A própria pessoa tem plano pago? (sem consultar o plano de outras pessoas)
CREATE OR REPLACE FUNCTION public.current_user_has_paid_plan()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.has_paid_plan(auth.uid());
$function$;

REVOKE ALL ON FUNCTION public.current_user_has_paid_plan() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_has_paid_plan() TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_group_paid_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;
  IF NOT public.current_user_has_paid_plan() THEN
    RAISE EXCEPTION 'Escrever depoimentos e reagir é dos planos Plus e Premium.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS a_guard_group_paid_write ON public.group_testimonials;
CREATE TRIGGER a_guard_group_paid_write
  BEFORE INSERT ON public.group_testimonials
  FOR EACH ROW EXECUTE FUNCTION public.guard_group_paid_write();

DROP TRIGGER IF EXISTS a_guard_group_paid_write ON public.group_testimonial_likes;
CREATE TRIGGER a_guard_group_paid_write
  BEFORE INSERT OR UPDATE ON public.group_testimonial_likes
  FOR EACH ROW EXECUTE FUNCTION public.guard_group_paid_write();

-- Não reagir ao próprio depoimento.
CREATE OR REPLACE FUNCTION public.guard_testimonial_like_author()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (SELECT 1 FROM public.group_testimonials t WHERE t.id = NEW.testimonial_id AND t.user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'Não é possível reagir ao próprio depoimento' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS b_guard_testimonial_like_author ON public.group_testimonial_likes;
CREATE TRIGGER b_guard_testimonial_like_author
  BEFORE INSERT OR UPDATE ON public.group_testimonial_likes
  FOR EACH ROW EXECUTE FUNCTION public.guard_testimonial_like_author();

DROP TRIGGER IF EXISTS update_testimonial_like_counts_trigger ON public.group_testimonial_likes;

CREATE OR REPLACE FUNCTION public.testimonial_like_totals(p_testimonial_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'likes_positivos', COALESCE(max(t.likes_positivos), 0),
    'likes_negativos', COALESCE(max(t.likes_negativos), 0)
  )
  FROM public.group_testimonials t
  WHERE t.id = p_testimonial_id;
$function$;

REVOKE ALL ON FUNCTION public.testimonial_like_totals(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.testimonial_like_totals(uuid) TO authenticated;

-- Reagir: 'positivo', 'negativo' ou 'none' (tirar). Devolve os totais novos.
CREATE OR REPLACE FUNCTION public.react_to_testimonial(p_testimonial_id uuid, p_tipo text)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  IF p_tipo NOT IN ('positivo', 'negativo', 'none') THEN
    RAISE EXCEPTION 'Reação inválida' USING ERRCODE = '22023';
  END IF;

  IF p_tipo = 'none' THEN
    DELETE FROM public.group_testimonial_likes WHERE testimonial_id = p_testimonial_id AND user_id = v_uid;
  ELSE
    INSERT INTO public.group_testimonial_likes (testimonial_id, user_id, tipo)
    VALUES (p_testimonial_id, v_uid, p_tipo::public.like_type)
    ON CONFLICT (testimonial_id, user_id) DO UPDATE SET tipo = EXCLUDED.tipo
    WHERE public.group_testimonial_likes.tipo IS DISTINCT FROM EXCLUDED.tipo;
  END IF;

  -- Totais pela função de leitura (a tabela só mostra ao autor).
  RETURN public.testimonial_like_totals(p_testimonial_id)
    || jsonb_build_object('user_like', CASE WHEN p_tipo = 'none' THEN NULL ELSE p_tipo END);
END;
$function$;

REVOKE ALL ON FUNCTION public.react_to_testimonial(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.react_to_testimonial(uuid, text) TO authenticated;

-- Lista do grupo: esconde dos outros o que está em análise (3+ denúncias pendentes).
DROP FUNCTION IF EXISTS public.get_group_testimonials(uuid, boolean);
CREATE FUNCTION public.get_group_testimonials(p_group_id uuid, p_only_mine boolean DEFAULT false)
RETURNS TABLE(id uuid, group_id uuid, anonimo boolean, sintoma_id uuid, sintoma_texto text, humor integer, texto text,
              criado_em timestamp with time zone, likes_positivos integer, likes_negativos integer, autor_nome text,
              is_mine boolean, user_like text, reported_by_me boolean, under_review boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  RETURN QUERY
  WITH pending AS (
    SELECT r.testimonial_id, count(*) AS n
    FROM public.group_testimonial_reports r
    JOIN public.group_testimonials gt ON gt.id = r.testimonial_id AND gt.group_id = p_group_id
    WHERE r.status = 'pending'
    GROUP BY r.testimonial_id
  )
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
    ),
    COALESCE(pe.n, 0) >= 3
  FROM public.group_testimonials t
  LEFT JOIN public.profiles p ON p.user_id = t.user_id AND NOT t.anonimo
  LEFT JOIN public.group_testimonial_likes l ON l.testimonial_id = t.id AND l.user_id = v_uid
  LEFT JOIN pending pe ON pe.testimonial_id = t.id
  WHERE t.group_id = p_group_id
    AND (NOT p_only_mine OR t.user_id = v_uid)
    AND (t.user_id = v_uid OR COALESCE(pe.n, 0) < 3)
  ORDER BY t.criado_em DESC;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_group_testimonials(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_group_testimonials(uuid, boolean) TO authenticated;
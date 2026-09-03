CREATE OR REPLACE FUNCTION public.update_testimonial_like_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.group_testimonials
    SET
      likes_positivos = (
        SELECT COUNT(*)
        FROM public.group_testimonial_likes
        WHERE testimonial_id = NEW.testimonial_id
        AND tipo = 'positivo'
      ),
      likes_negativos = (
        SELECT COUNT(*)
        FROM public.group_testimonial_likes
        WHERE testimonial_id = NEW.testimonial_id
        AND tipo = 'negativo'
      )
    WHERE id = NEW.testimonial_id;

    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    UPDATE public.group_testimonials
    SET
      likes_positivos = (
        SELECT COUNT(*)
        FROM public.group_testimonial_likes
        WHERE testimonial_id = OLD.testimonial_id
        AND tipo = 'positivo'
      ),
      likes_negativos = (
        SELECT COUNT(*)
        FROM public.group_testimonial_likes
        WHERE testimonial_id = OLD.testimonial_id
        AND tipo = 'negativo'
      )
    WHERE id = OLD.testimonial_id;

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_group_testimonials()
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
  criado_em timestamptz
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
    t.humor,
    t.likes_positivos,
    t.likes_negativos,
    t.likes_negativos >= 10,
    t.criado_em
  FROM public.group_testimonials t
  JOIN public.support_groups g ON g.id = t.group_id
  LEFT JOIN public.profiles p ON p.user_id = t.user_id
  ORDER BY (t.likes_negativos >= 10) DESC, t.likes_negativos DESC, t.criado_em DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_group_testimonials() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_group_testimonials() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_testimonial(p_testimonial_id uuid, p_texto text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Super admin privileges required.';
  END IF;

  IF p_texto IS NULL OR length(trim(p_texto)) = 0 THEN
    RAISE EXCEPTION 'O texto do depoimento não pode ficar vazio.';
  END IF;

  UPDATE public.group_testimonials
  SET texto = p_texto
  WHERE id = p_testimonial_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_testimonial(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_testimonial(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_testimonial(p_testimonial_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Super admin privileges required.';
  END IF;

  DELETE FROM public.group_testimonials WHERE id = p_testimonial_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_testimonial(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_testimonial(uuid) TO authenticated;
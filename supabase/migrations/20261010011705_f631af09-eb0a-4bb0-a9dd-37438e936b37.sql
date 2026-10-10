-- Plano de segurança: salvar sem duplicar, sem apagar o que outro aparelho
-- salvou, e com os mesmos limites de texto da tela.
--
-- - p_new_id: o plano novo leva um id gerado no aparelho. Se a resposta do
--   servidor se perder e a pessoa tocar "Salvar" de novo, o banco reconhece o
--   plano e só atualiza (antes criava outro plano igual).
-- - p_expected_updated_at: a versão que a tela abriu. Se o plano mudou em
--   outro aparelho depois disso, o banco recusa em vez de sobrescrever tudo
--   (antes a última gravação apagava, sem aviso, o que o outro aparelho tinha
--   salvado: razões, contatos).
-- - Itens com até 200 caracteres (o limite que a tela já usa); itens vazios
--   ou repetidos na mesma parte saem.

DROP FUNCTION IF EXISTS public.save_safety_plan(uuid, text, text[], text[], text[], text[], text[], jsonb);

CREATE OR REPLACE FUNCTION public.clean_safety_plan_items(p_items text[])
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(array_agg(item ORDER BY first_pos), '{}')
  FROM (
    SELECT left(btrim(i), 200) AS item, min(pos) AS first_pos
    FROM unnest(COALESCE(p_items, '{}')) WITH ORDINALITY AS t(i, pos)
    WHERE btrim(i) <> ''
    GROUP BY left(btrim(i), 200)
  ) s;
$function$;

CREATE FUNCTION public.save_safety_plan(
  p_plan_id uuid,
  p_title text,
  p_warning_signs text[],
  p_coping_strategies text[],
  p_distractions text[],
  p_safe_environment text[],
  p_reasons_to_live text[],
  p_contacts jsonb DEFAULT '[]'::jsonb,
  p_new_id uuid DEFAULT NULL,
  p_expected_updated_at timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
  v_plan_id uuid := p_plan_id;
  v_current timestamptz;
  v_title text := left(nullif(btrim(p_title), ''), 80);
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  IF v_title IS NULL THEN
    RAISE EXCEPTION 'Dê um título ao plano';
  END IF;
  IF jsonb_typeof(COALESCE(p_contacts, '[]'::jsonb)) <> 'array' OR jsonb_array_length(COALESCE(p_contacts, '[]'::jsonb)) > 20 THEN
    RAISE EXCEPTION 'Lista de contatos inválida';
  END IF;

  -- Plano novo que já chegou numa tentativa anterior: vira atualização.
  IF v_plan_id IS NULL AND p_new_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.safety_plans WHERE id = p_new_id AND patient_id = v_uid) THEN
    v_plan_id := p_new_id;
  END IF;

  IF v_plan_id IS NULL THEN
    INSERT INTO public.safety_plans (
      id, patient_id, title, warning_signs, coping_strategies, distractions, safe_environment, reasons_to_live
    ) VALUES (
      COALESCE(p_new_id, gen_random_uuid()), v_uid, v_title,
      public.clean_safety_plan_items(p_warning_signs), public.clean_safety_plan_items(p_coping_strategies),
      public.clean_safety_plan_items(p_distractions), public.clean_safety_plan_items(p_safe_environment),
      public.clean_safety_plan_items(p_reasons_to_live)
    )
    RETURNING id INTO v_id;
  ELSE
    SELECT updated_at INTO v_current
    FROM public.safety_plans
    WHERE id = v_plan_id AND patient_id = v_uid
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Plano não encontrado';
    END IF;
    -- Alterado em outro aparelho depois que esta tela abriu.
    IF p_expected_updated_at IS NOT NULL AND p_plan_id IS NOT NULL
       AND date_trunc('milliseconds', v_current) > date_trunc('milliseconds', p_expected_updated_at) THEN
      RAISE EXCEPTION 'Este plano foi alterado em outro aparelho. Abra de novo para ver a versão mais nova.'
        USING ERRCODE = '40001';
    END IF;

    UPDATE public.safety_plans
    SET title = v_title,
        warning_signs = public.clean_safety_plan_items(p_warning_signs),
        coping_strategies = public.clean_safety_plan_items(p_coping_strategies),
        distractions = public.clean_safety_plan_items(p_distractions),
        safe_environment = public.clean_safety_plan_items(p_safe_environment),
        reasons_to_live = public.clean_safety_plan_items(p_reasons_to_live)
    WHERE id = v_plan_id AND patient_id = v_uid
    RETURNING id INTO v_id;
  END IF;

  DELETE FROM public.emergency_contacts WHERE plan_id = v_id AND patient_id = v_uid;

  -- Só o primeiro contato marcado como principal fica como principal.
  INSERT INTO public.emergency_contacts (patient_id, plan_id, name, relationship, phone, is_primary)
  SELECT v_uid, v_id,
         left(btrim(e.v ->> 'name'), 100),
         left(nullif(btrim(e.v ->> 'relationship'), ''), 60),
         btrim(e.v ->> 'phone'),
         COALESCE((e.v ->> 'is_primary')::boolean, false) AND e.ord = (
           SELECT min(x.ord)
           FROM jsonb_array_elements(COALESCE(p_contacts, '[]'::jsonb)) WITH ORDINALITY AS x(v, ord)
           WHERE COALESCE((x.v ->> 'is_primary')::boolean, false)
         )
  FROM jsonb_array_elements(COALESCE(p_contacts, '[]'::jsonb)) WITH ORDINALITY AS e(v, ord);

  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.save_safety_plan(uuid, text, text[], text[], text[], text[], text[], jsonb, uuid, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_safety_plan(uuid, text, text[], text[], text[], text[], text[], jsonb, uuid, timestamptz) TO authenticated;

-- Os itens de cada parte também têm limite de tamanho no banco.
ALTER TABLE public.safety_plans DROP CONSTRAINT IF EXISTS safety_plans_item_length_check;
CREATE OR REPLACE FUNCTION public.safety_plan_items_ok(p_items text[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(bool_and(length(i) <= 200), true) FROM unnest(COALESCE(p_items, '{}')) AS i;
$function$;
UPDATE public.safety_plans
SET warning_signs = public.clean_safety_plan_items(warning_signs),
    coping_strategies = public.clean_safety_plan_items(coping_strategies),
    distractions = public.clean_safety_plan_items(distractions),
    safe_environment = public.clean_safety_plan_items(safe_environment),
    reasons_to_live = public.clean_safety_plan_items(reasons_to_live)
WHERE NOT (public.safety_plan_items_ok(warning_signs) AND public.safety_plan_items_ok(coping_strategies)
           AND public.safety_plan_items_ok(distractions) AND public.safety_plan_items_ok(safe_environment)
           AND public.safety_plan_items_ok(reasons_to_live));
ALTER TABLE public.safety_plans ADD CONSTRAINT safety_plans_item_length_check CHECK (
  public.safety_plan_items_ok(warning_signs) AND public.safety_plan_items_ok(coping_strategies)
  AND public.safety_plan_items_ok(distractions) AND public.safety_plan_items_ok(safe_environment)
  AND public.safety_plan_items_ok(reasons_to_live)
);
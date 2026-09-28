-- Vários planos de segurança por paciente (até 10), cada um com título e
-- com os próprios contatos de emergência.
--
-- Antes: um plano por paciente (UNIQUE em patient_id) e contatos soltos,
-- ligados só ao paciente. Agora o paciente lista, edita e exclui planos; os
-- contatos pertencem ao plano e são apagados junto com ele.
--
-- O salvamento passa pela função save_safety_plan, que grava plano e
-- contatos numa única transação — nada de plano salvo com contatos pela
-- metade. Ela roda com os privilégios de quem chama (SECURITY INVOKER),
-- então as mesmas policies de RLS continuam valendo.

-- 1. Título e fim do "um plano por paciente" ------------------------------
ALTER TABLE public.safety_plans
  DROP CONSTRAINT IF EXISTS safety_plans_patient_id_key;

ALTER TABLE public.safety_plans
  ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT 'Plano de segurança 01'
  CHECK (length(trim(title)) BETWEEN 1 AND 80);

CREATE INDEX IF NOT EXISTS idx_safety_plans_patient ON public.safety_plans (patient_id, created_at);

-- 2. Contatos passam a pertencer a um plano --------------------------------
ALTER TABLE public.emergency_contacts
  ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.safety_plans(id) ON DELETE CASCADE;

-- Quem já tinha contatos mas nenhum plano ganha um plano vazio para abrigá-los.
INSERT INTO public.safety_plans (patient_id)
SELECT DISTINCT ec.patient_id
FROM public.emergency_contacts ec
WHERE ec.plan_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.safety_plans sp WHERE sp.patient_id = ec.patient_id);

UPDATE public.emergency_contacts ec
SET plan_id = (
  SELECT sp.id FROM public.safety_plans sp
  WHERE sp.patient_id = ec.patient_id
  ORDER BY sp.created_at
  LIMIT 1
)
WHERE ec.plan_id IS NULL;

ALTER TABLE public.emergency_contacts ALTER COLUMN plan_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_plan ON public.emergency_contacts (plan_id);

-- Um contato só pode apontar para um plano do mesmo paciente.
DROP POLICY IF EXISTS "Patients manage their own emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Patients manage their own emergency contacts"
  ON public.emergency_contacts FOR ALL
  TO authenticated
  USING (auth.uid() = patient_id)
  WITH CHECK (
    auth.uid() = patient_id
    AND EXISTS (
      SELECT 1 FROM public.safety_plans sp
      WHERE sp.id = emergency_contacts.plan_id AND sp.patient_id = auth.uid()
    )
  );

-- 3. Limite de 10 planos por paciente ----------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_safety_plan_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF (SELECT count(*) FROM public.safety_plans WHERE patient_id = NEW.patient_id) >= 10 THEN
    RAISE EXCEPTION 'Você já tem 10 planos de segurança. Exclua um para criar outro.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_safety_plan_limit ON public.safety_plans;
CREATE TRIGGER enforce_safety_plan_limit
BEFORE INSERT ON public.safety_plans
FOR EACH ROW EXECUTE FUNCTION public.enforce_safety_plan_limit();

-- 4. Salvar plano + contatos de uma vez ---------------------------------------
-- p_plan_id nulo cria um plano novo; preenchido, atualiza aquele plano.
-- p_contacts: [{"name": "...", "relationship": "...", "phone": "...", "is_primary": true}]
CREATE OR REPLACE FUNCTION public.save_safety_plan(
  p_plan_id uuid,
  p_title text,
  p_warning_signs text[],
  p_coping_strategies text[],
  p_distractions text[],
  p_safe_environment text[],
  p_reasons_to_live text[],
  p_contacts jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
  v_title text := nullif(trim(p_title), '');
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

  IF p_plan_id IS NULL THEN
    INSERT INTO public.safety_plans (
      patient_id, title, warning_signs, coping_strategies, distractions, safe_environment, reasons_to_live
    ) VALUES (
      v_uid, v_title,
      COALESCE(p_warning_signs, '{}'), COALESCE(p_coping_strategies, '{}'), COALESCE(p_distractions, '{}'),
      COALESCE(p_safe_environment, '{}'), COALESCE(p_reasons_to_live, '{}')
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.safety_plans
    SET title = v_title,
        warning_signs = COALESCE(p_warning_signs, '{}'),
        coping_strategies = COALESCE(p_coping_strategies, '{}'),
        distractions = COALESCE(p_distractions, '{}'),
        safe_environment = COALESCE(p_safe_environment, '{}'),
        reasons_to_live = COALESCE(p_reasons_to_live, '{}')
    WHERE id = p_plan_id AND patient_id = v_uid
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
      RAISE EXCEPTION 'Plano não encontrado';
    END IF;
  END IF;

  DELETE FROM public.emergency_contacts WHERE plan_id = v_id AND patient_id = v_uid;

  -- Só o primeiro contato marcado como principal fica como principal.
  INSERT INTO public.emergency_contacts (patient_id, plan_id, name, relationship, phone, is_primary)
  SELECT v_uid, v_id,
         trim(e.v ->> 'name'),
         nullif(trim(e.v ->> 'relationship'), ''),
         trim(e.v ->> 'phone'),
         COALESCE((e.v ->> 'is_primary')::boolean, false) AND e.ord = (
           SELECT min(x.ord)
           FROM jsonb_array_elements(COALESCE(p_contacts, '[]'::jsonb)) WITH ORDINALITY AS x(v, ord)
           WHERE COALESCE((x.v ->> 'is_primary')::boolean, false)
         )
  FROM jsonb_array_elements(COALESCE(p_contacts, '[]'::jsonb)) WITH ORDINALITY AS e(v, ord);

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_safety_plan(uuid, text, text[], text[], text[], text[], text[], jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_safety_plan(uuid, text, text[], text[], text[], text[], text[], jsonb) TO authenticated;

-- 5. Psicólogo no SOS vê todos os planos do paciente --------------------------
-- Mesma regra de acesso de antes (só durante SOS ativo que ele aceitou, com
-- registro em security_audit_log); o formato passa a ser uma lista de planos,
-- cada um com seus contatos.
CREATE OR REPLACE FUNCTION public.get_sos_safety_plan(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_patient uuid;
  v_result jsonb;
BEGIN
  SELECT er.patient_id INTO v_patient
  FROM public.emergency_requests er
  WHERE er.id = p_request_id
    AND er.accepted_by = auth.uid()
    AND er.status IN ('accepted', 'in_progress');

  IF v_patient IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'plans', COALESCE(jsonb_agg(jsonb_build_object(
      'title', sp.title,
      'warning_signs', sp.warning_signs,
      'coping_strategies', sp.coping_strategies,
      'distractions', sp.distractions,
      'safe_environment', sp.safe_environment,
      'reasons_to_live', sp.reasons_to_live,
      'updated_at', sp.updated_at,
      'contacts', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'name', ec.name,
          'relationship', ec.relationship,
          'phone', ec.phone,
          'is_primary', ec.is_primary
        ) ORDER BY ec.is_primary DESC, ec.created_at)
        FROM public.emergency_contacts ec
        WHERE ec.plan_id = sp.id
      ), '[]'::jsonb)
    ) ORDER BY sp.updated_at DESC), '[]'::jsonb)
  )
  INTO v_result
  FROM public.safety_plans sp
  WHERE sp.patient_id = v_patient;

  INSERT INTO public.security_audit_log (user_id, action, table_name, record_id, new_values)
  VALUES (
    auth.uid(),
    'sos_safety_plan_viewed',
    'safety_plans',
    v_patient,
    jsonb_build_object('emergency_request_id', p_request_id)
  );

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_sos_safety_plan(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_sos_safety_plan(uuid) TO authenticated;

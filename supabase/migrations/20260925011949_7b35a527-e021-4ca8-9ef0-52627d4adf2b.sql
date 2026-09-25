-- Plano de segurança e contatos de emergência do paciente.
--
-- Atendimento em crise (Resolução CFP 09/2024) pede que o profissional
-- saiba quem acionar se a conversa apontar risco imediato — até aqui o
-- psicólogo do SOS recebia só os sintomas do cadastro.
--
-- Estrutura baseada no Safety Planning Intervention (Stanley & Brown):
-- sinais de alerta, estratégias próprias, pessoas/lugares que distraem,
-- pessoas a quem pedir ajuda (emergency_contacts), como deixar o ambiente
-- seguro e razões para seguir.
--
-- Quem lê:
--   * o próprio paciente, sempre (RLS);
--   * o psicólogo, SOMENTE durante um SOS que ele mesmo aceitou e que ainda
--     está ativo, e SOMENTE via get_sos_safety_plan — cada leitura grava
--     uma linha em security_audit_log;
--   * admin, nunca (não há policy nem RPC para isso).

CREATE TABLE IF NOT EXISTS public.safety_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  warning_signs text[] NOT NULL DEFAULT '{}',
  coping_strategies text[] NOT NULL DEFAULT '{}',
  distractions text[] NOT NULL DEFAULT '{}',
  safe_environment text[] NOT NULL DEFAULT '{}',
  reasons_to_live text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    cardinality(warning_signs) <= 20 AND cardinality(coping_strategies) <= 20 AND
    cardinality(distractions) <= 20 AND cardinality(safe_environment) <= 20 AND
    cardinality(reasons_to_live) <= 20
  )
);

CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
  relationship text CHECK (relationship IS NULL OR length(relationship) <= 60),
  phone text NOT NULL CHECK (phone ~ '^[0-9+() -]{8,20}$'),
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_patient ON public.emergency_contacts (patient_id);

CREATE TRIGGER update_safety_plans_updated_at
BEFORE UPDATE ON public.safety_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_emergency_contacts_updated_at
BEFORE UPDATE ON public.emergency_contacts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.safety_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.safety_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emergency_contacts TO authenticated;
GRANT ALL ON public.safety_plans TO service_role;
GRANT ALL ON public.emergency_contacts TO service_role;

CREATE POLICY "Patients manage their own safety plan"
  ON public.safety_plans FOR ALL
  TO authenticated
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients manage their own emergency contacts"
  ON public.emergency_contacts FOR ALL
  TO authenticated
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

-- Leitura pelo psicólogo durante o SOS ---------------------------------------
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
    'plan', (
      SELECT jsonb_build_object(
        'warning_signs', sp.warning_signs,
        'coping_strategies', sp.coping_strategies,
        'distractions', sp.distractions,
        'safe_environment', sp.safe_environment,
        'reasons_to_live', sp.reasons_to_live,
        'updated_at', sp.updated_at
      )
      FROM public.safety_plans sp
      WHERE sp.patient_id = v_patient
    ),
    'contacts', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'name', ec.name,
        'relationship', ec.relationship,
        'phone', ec.phone,
        'is_primary', ec.is_primary
      ) ORDER BY ec.is_primary DESC, ec.created_at)
      FROM public.emergency_contacts ec
      WHERE ec.patient_id = v_patient
    ), '[]'::jsonb)
  ) INTO v_result;

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
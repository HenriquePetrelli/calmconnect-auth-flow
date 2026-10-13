-- SOS: triagem rápida (opcional) antes de entrar na fila.
--
-- Na tela "Precisa de ajuda agora?" o paciente pode marcar o que está
-- sentindo (nada é obrigatório: o botão funciona sem marcar). O pedido vai
-- para todos os psicólogos online, como antes; a triagem só informa quem vai
-- atender e coloca na frente da fila os pedidos com risco
-- (pensamentos de suicídio ou de se machucar; perigo ou violência).
--
-- Opções (chaves gravadas):
--   suicidio      Pensamentos de suicídio ou de me machucar   (prioritário)
--   panico        Crise de pânico
--   ansiedade     Crise de ansiedade
--   tristeza      Tristeza muito forte ou desesperança
--   acontecimento Passei por algo difícil agora
--   perigo        Estou em perigo ou sofri violência          (prioritário)
--   outro         Outra coisa

ALTER TABLE public.emergency_requests
  ADD COLUMN IF NOT EXISTS triage text[] NOT NULL DEFAULT ARRAY[]::text[];

ALTER TABLE public.emergency_requests DROP CONSTRAINT IF EXISTS emergency_requests_triage_check;
ALTER TABLE public.emergency_requests
  ADD CONSTRAINT emergency_requests_triage_check CHECK (
    triage <@ ARRAY['suicidio','panico','ansiedade','tristeza','acontecimento','perigo','outro']::text[]
    AND cardinality(triage) <= 7
  );

-- A triagem é gravada na criação (pela função do SOS) e não muda depois pelo app.
CREATE OR REPLACE FUNCTION public.keep_sos_triage()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_user = 'authenticated' THEN
    NEW.triage := OLD.triage;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS a_keep_sos_triage ON public.emergency_requests;
CREATE TRIGGER a_keep_sos_triage
  BEFORE UPDATE ON public.emergency_requests
  FOR EACH ROW EXECUTE FUNCTION public.keep_sos_triage();

-- O psicólogo que aceitou vê a triagem no painel de contexto da chamada.
CREATE OR REPLACE FUNCTION public.get_sos_patient_context(p_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    'triage', (SELECT COALESCE(er.triage, ARRAY[]::text[]) FROM public.emergency_requests er WHERE er.id = p_request_id),
    'patient', (
      SELECT jsonb_build_object(
        'full_name', p.full_name,
        'city', p.city,
        'state', p.state,
        'symptoms', COALESCE(p.sintomas_selecionados, ARRAY[]::text[]),
        'last_mood_value', p.last_mood_value,
        'last_mood_date', p.last_mood_date
      )
      FROM public.patients p
      WHERE p.user_id = v_patient
      LIMIT 1
    ),
    'progress', COALESCE((
      SELECT jsonb_agg(x)
      FROM (
        SELECT pp.session_date, pp.mood_rating, pp.anxiety_level, pp.stress_level
        FROM public.patient_progress pp
        WHERE pp.patient_id = v_patient
        ORDER BY pp.session_date DESC
        LIMIT 5
      ) x
    ), '[]'::jsonb),
    'sos_total', (
      SELECT count(*) FROM public.emergency_requests e
      WHERE e.patient_id = v_patient
    ),
    'sos_history', COALESCE((
      SELECT jsonb_agg(y)
      FROM (
        SELECT e.id, e.created_at, e.status, e.duration, e.end_reason
        FROM public.emergency_requests e
        WHERE e.patient_id = v_patient AND e.id <> p_request_id
        ORDER BY e.created_at DESC
        LIMIT 5
      ) y
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;
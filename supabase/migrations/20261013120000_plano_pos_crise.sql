-- ============================================================================
-- Plano pós-crise: o psicólogo recomenda um plano de segurança ao paciente.
--
-- Durante o atendimento (SOS ou consulta) o psicólogo preenche o mesmo
-- formulário do plano de segurança do paciente (sem os contatos). O plano fica
-- como rascunho e só chega ao paciente quando o atendimento termina. O paciente
-- decide: salvar nos planos dele (pode editar antes), ou "agora não".
-- O psicólogo vê o que recomendou, mas não o que o paciente fez com isso.
-- ============================================================================

-- 1. Planos do paciente: de onde veio e se o paciente mudou depois ------------
ALTER TABLE public.safety_plans
  ADD COLUMN IF NOT EXISTS recommended_by text,
  ADD COLUMN IF NOT EXISTS source_suggestion_id uuid,
  ADD COLUMN IF NOT EXISTS patient_edited_at timestamptz;

-- Não é SECURITY DEFINER: precisa enxergar o papel de quem chama.
CREATE OR REPLACE FUNCTION public.guard_safety_plan_recommendation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.recommended_by := NULL;
    NEW.source_suggestion_id := NULL;
    NEW.patient_edited_at := NULL;
    RETURN NEW;
  END IF;
  NEW.recommended_by := OLD.recommended_by;
  NEW.source_suggestion_id := OLD.source_suggestion_id;
  NEW.patient_edited_at := OLD.patient_edited_at;
  IF OLD.recommended_by IS NOT NULL AND (
       NEW.title IS DISTINCT FROM OLD.title
    OR NEW.warning_signs IS DISTINCT FROM OLD.warning_signs
    OR NEW.coping_strategies IS DISTINCT FROM OLD.coping_strategies
    OR NEW.distractions IS DISTINCT FROM OLD.distractions
    OR NEW.safe_environment IS DISTINCT FROM OLD.safe_environment
    OR NEW.reasons_to_live IS DISTINCT FROM OLD.reasons_to_live
  ) THEN
    NEW.patient_edited_at := now();
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS guard_safety_plan_recommendation ON public.safety_plans;
CREATE TRIGGER guard_safety_plan_recommendation
  BEFORE INSERT OR UPDATE ON public.safety_plans
  FOR EACH ROW EXECUTE FUNCTION public.guard_safety_plan_recommendation();

-- 2. Recomendações ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.safety_plan_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  psychologist_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  psychologist_name text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('sos', 'appointment')),
  source_id uuid NOT NULL,
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 80),
  warning_signs text[] NOT NULL DEFAULT '{}',
  coping_strategies text[] NOT NULL DEFAULT '{}',
  distractions text[] NOT NULL DEFAULT '{}',
  safe_environment text[] NOT NULL DEFAULT '{}',
  reasons_to_live text[] NOT NULL DEFAULT '{}',
  -- draft: atendimento em andamento (o paciente ainda não vê)
  -- pending: entregue, esperando o paciente decidir
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'saved', 'dismissed')),
  saved_plan_id uuid REFERENCES public.safety_plans(id) ON DELETE SET NULL,
  delivered_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_id),
  CHECK (cardinality(warning_signs) <= 20 AND cardinality(coping_strategies) <= 20 AND cardinality(distractions) <= 20
         AND cardinality(safe_environment) <= 20 AND cardinality(reasons_to_live) <= 20),
  CHECK (public.safety_plan_items_ok(warning_signs) AND public.safety_plan_items_ok(coping_strategies)
         AND public.safety_plan_items_ok(distractions) AND public.safety_plan_items_ok(safe_environment)
         AND public.safety_plan_items_ok(reasons_to_live))
);

CREATE INDEX IF NOT EXISTS safety_plan_suggestions_patient_idx
  ON public.safety_plan_suggestions (patient_id, status, delivered_at DESC);
CREATE INDEX IF NOT EXISTS safety_plan_suggestions_draft_idx
  ON public.safety_plan_suggestions (updated_at) WHERE status = 'draft';

ALTER TABLE public.safety_plan_suggestions ENABLE ROW LEVEL SECURITY;

-- O paciente lê as que já foram entregues. Tudo o mais passa pelas funções.
-- O psicólogo não lê a tabela (veria o status): usa get_post_crisis_plan.
DROP POLICY IF EXISTS "Patients view delivered suggestions" ON public.safety_plan_suggestions;
CREATE POLICY "Patients view delivered suggestions" ON public.safety_plan_suggestions
  FOR SELECT TO authenticated
  USING (patient_id = auth.uid() AND status <> 'draft');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.safety_plan_suggestions TO authenticated;
GRANT ALL ON public.safety_plan_suggestions TO service_role;

DROP TRIGGER IF EXISTS update_safety_plan_suggestions_updated_at ON public.safety_plan_suggestions;
CREATE TRIGGER update_safety_plan_suggestions_updated_at
  BEFORE UPDATE ON public.safety_plan_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. O atendimento: quem atende, se ainda está aberto e se ainda dá para mexer --
-- Retorna o paciente quando o psicólogo pode escrever o plano deste atendimento:
-- durante a chamada ou até 2 horas depois do fim.
CREATE OR REPLACE FUNCTION public.post_crisis_plan_source(
  p_source_type text, p_source_id uuid, p_psychologist_id uuid,
  OUT patient_id uuid, OUT is_open boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r record;
BEGIN
  IF p_source_type = 'sos' THEN
    SELECT er.patient_id AS pid, er.status, er.started_at, COALESCE(er.ended_at, er.updated_at) AS ended
    INTO r
    FROM public.emergency_requests er
    WHERE er.id = p_source_id AND er.accepted_by = p_psychologist_id;
    IF NOT FOUND THEN
      RETURN;
    END IF;
    IF r.status IN ('accepted', 'in_progress') THEN
      patient_id := r.pid; is_open := true;
    ELSIF r.status IN ('completed', 'cancelled') AND r.started_at IS NOT NULL AND r.ended > now() - interval '2 hours' THEN
      patient_id := r.pid; is_open := false;
    END IF;
  ELSIF p_source_type = 'appointment' THEN
    SELECT a.patient_id AS pid, a.status, a.scheduled_at, COALESCE(a.duration, 50) AS dur
    INTO r
    FROM public.appointments a
    WHERE a.id = p_source_id AND a.psychologist_id = p_psychologist_id;
    IF NOT FOUND OR r.status NOT IN ('scheduled', 'confirmed', 'in_progress', 'completed') THEN
      RETURN;
    END IF;
    IF now() < r.scheduled_at - interval '30 minutes'
       OR now() > r.scheduled_at + make_interval(mins => r.dur) + interval '2 hours' THEN
      RETURN;
    END IF;
    patient_id := r.pid;
    is_open := r.status <> 'completed';
  END IF;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.post_crisis_plan_source(text, uuid, uuid) FROM PUBLIC, anon, authenticated;

-- 4. Entrega ao paciente (rascunho → pendente + aviso discreto) -----------------
CREATE OR REPLACE FUNCTION public.deliver_post_crisis_plan(p_suggestion_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  s public.safety_plan_suggestions;
BEGIN
  UPDATE public.safety_plan_suggestions
  SET status = 'pending', delivered_at = now()
  WHERE id = p_suggestion_id AND status = 'draft'
  RETURNING * INTO s;
  IF NOT FOUND THEN
    RETURN;
  END IF;
  INSERT INTO public.notifications (patient_id, title, message, status, push, link, push_text)
  VALUES (
    s.patient_id,
    'Seu psicólogo deixou um plano para você',
    s.psychologist_name || ' preparou um plano de segurança com o que vocês conversaram. '
      || 'Abra para ver e decida se quer salvar nos seus planos.',
    'unread',
    true,
    '/safety-plan',
    -- O texto do push aparece na tela bloqueada: nada sobre crise ou psicólogo.
    'Você tem uma novidade no app. Toque para abrir.'
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.deliver_post_crisis_plan(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.deliver_post_crisis_plans_on_end()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_type text := CASE TG_TABLE_NAME WHEN 'emergency_requests' THEN 'sos' ELSE 'appointment' END;
  v_id uuid;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status
     OR NEW.status NOT IN ('completed', 'cancelled', 'no_show') THEN
    RETURN NEW;
  END IF;
  SELECT id INTO v_id FROM public.safety_plan_suggestions
  WHERE source_type = v_type AND source_id = NEW.id AND status = 'draft';
  IF v_id IS NOT NULL THEN
    PERFORM public.deliver_post_crisis_plan(v_id);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS deliver_post_crisis_plans_on_end ON public.emergency_requests;
CREATE TRIGGER deliver_post_crisis_plans_on_end
  AFTER UPDATE OF status ON public.emergency_requests
  FOR EACH ROW EXECUTE FUNCTION public.deliver_post_crisis_plans_on_end();

DROP TRIGGER IF EXISTS deliver_post_crisis_plans_on_end ON public.appointments;
CREATE TRIGGER deliver_post_crisis_plans_on_end
  AFTER UPDATE OF status ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.deliver_post_crisis_plans_on_end();

-- Rede de segurança: atendimento que não fechou o status (ex.: consulta que
-- ficou "confirmada" depois da hora). O rascunho sai assim que não dá mais
-- para o psicólogo mexer nele.
CREATE OR REPLACE FUNCTION public.deliver_stale_post_crisis_plans()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  s record;
  n integer := 0;
BEGIN
  FOR s IN
    SELECT sg.id
    FROM public.safety_plan_suggestions sg
    WHERE sg.status = 'draft'
      AND (
        sg.psychologist_id IS NULL
        OR (public.post_crisis_plan_source(sg.source_type, sg.source_id, sg.psychologist_id)).patient_id IS NULL
        OR NOT (public.post_crisis_plan_source(sg.source_type, sg.source_id, sg.psychologist_id)).is_open
      )
  LOOP
    PERFORM public.deliver_post_crisis_plan(s.id);
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.deliver_stale_post_crisis_plans() FROM PUBLIC, anon, authenticated;

DO $cron$
BEGIN
  PERFORM cron.unschedule('deliver-post-crisis-plans')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'deliver-post-crisis-plans');
  PERFORM cron.schedule('deliver-post-crisis-plans', '*/10 * * * *', 'SELECT public.deliver_stale_post_crisis_plans();');
END
$cron$;

-- 5. Psicólogo: salvar e ler o plano do atendimento -----------------------------
CREATE OR REPLACE FUNCTION public.save_post_crisis_plan(
  p_source_type text,
  p_source_id uuid,
  p_title text,
  p_warning_signs text[],
  p_coping_strategies text[],
  p_distractions text[],
  p_safe_environment text[],
  p_reasons_to_live text[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_src record;
  v_title text := left(nullif(btrim(p_title), ''), 80);
  v_name text;
  v_ws text[] := public.clean_safety_plan_items(p_warning_signs);
  v_cs text[] := public.clean_safety_plan_items(p_coping_strategies);
  v_di text[] := public.clean_safety_plan_items(p_distractions);
  v_se text[] := public.clean_safety_plan_items(p_safe_environment);
  v_rl text[] := public.clean_safety_plan_items(p_reasons_to_live);
  v_id uuid;
  v_status text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  IF p_source_type NOT IN ('sos', 'appointment') THEN
    RAISE EXCEPTION 'Atendimento inválido';
  END IF;
  SELECT * INTO v_src FROM public.post_crisis_plan_source(p_source_type, p_source_id, v_uid);
  IF v_src.patient_id IS NULL THEN
    RAISE EXCEPTION 'Só quem atendeu pode deixar o plano, durante o atendimento ou até 2 horas depois.';
  END IF;
  IF v_title IS NULL THEN
    RAISE EXCEPTION 'Dê um título ao plano';
  END IF;
  IF cardinality(v_ws) + cardinality(v_cs) + cardinality(v_di) + cardinality(v_se) + cardinality(v_rl) = 0 THEN
    RAISE EXCEPTION 'Preencha pelo menos um item do plano';
  END IF;

  SELECT status INTO v_status FROM public.safety_plan_suggestions
  WHERE source_type = p_source_type AND source_id = p_source_id;
  -- Depois que o paciente decidiu, o plano dele é dele.
  IF v_status IN ('saved', 'dismissed') THEN
    RAISE EXCEPTION 'O paciente já viu este plano. Não dá mais para alterar.';
  END IF;

  SELECT COALESCE(nullif(btrim(p.full_name), ''), nullif(btrim(pr.full_name), ''), 'Seu psicólogo')
  INTO v_name
  FROM (SELECT 1) one
  LEFT JOIN public.psychologists p ON p.user_id = v_uid
  LEFT JOIN public.profiles pr ON pr.user_id = v_uid;

  INSERT INTO public.safety_plan_suggestions (
    patient_id, psychologist_id, psychologist_name, source_type, source_id, title,
    warning_signs, coping_strategies, distractions, safe_environment, reasons_to_live
  ) VALUES (
    v_src.patient_id, v_uid, left(v_name, 120), p_source_type, p_source_id, v_title,
    v_ws, v_cs, v_di, v_se, v_rl
  )
  ON CONFLICT (source_type, source_id) DO UPDATE
  SET title = EXCLUDED.title,
      warning_signs = EXCLUDED.warning_signs,
      coping_strategies = EXCLUDED.coping_strategies,
      distractions = EXCLUDED.distractions,
      safe_environment = EXCLUDED.safe_environment,
      reasons_to_live = EXCLUDED.reasons_to_live,
      psychologist_name = EXCLUDED.psychologist_name
  WHERE safety_plan_suggestions.psychologist_id = v_uid
    AND safety_plan_suggestions.status IN ('draft', 'pending')
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Não foi possível salvar o plano';
  END IF;

  -- Salvo depois que o atendimento terminou: vai direto para o paciente.
  IF NOT v_src.is_open THEN
    PERFORM public.deliver_post_crisis_plan(v_id);
  END IF;
  RETURN v_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.save_post_crisis_plan(text, uuid, text, text[], text[], text[], text[], text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_post_crisis_plan(text, uuid, text, text[], text[], text[], text[], text[]) TO authenticated;

-- O psicólogo relê o que recomendou (na chamada e no histórico). Sem o status:
-- o que o paciente fez com o plano é dele.
CREATE OR REPLACE FUNCTION public.get_post_crisis_plan(p_source_type text, p_source_id uuid)
RETURNS TABLE (
  id uuid, title text, warning_signs text[], coping_strategies text[], distractions text[],
  safe_environment text[], reasons_to_live text[], delivered boolean, editable boolean, updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT s.id, s.title, s.warning_signs, s.coping_strategies, s.distractions, s.safe_environment, s.reasons_to_live,
         s.status <> 'draft',
         s.status IN ('draft', 'pending')
           AND (public.post_crisis_plan_source(s.source_type, s.source_id, auth.uid())).patient_id IS NOT NULL,
         s.updated_at
  FROM public.safety_plan_suggestions s
  WHERE s.source_type = p_source_type AND s.source_id = p_source_id AND s.psychologist_id = auth.uid();
$function$;

REVOKE EXECUTE ON FUNCTION public.get_post_crisis_plan(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_post_crisis_plan(text, uuid) TO authenticated;

-- 6. Paciente: salvar (pode editar antes) ou "agora não" ------------------------
CREATE OR REPLACE FUNCTION public.accept_safety_plan_suggestion(
  p_suggestion_id uuid,
  p_replace_plan_id uuid DEFAULT NULL,
  p_title text DEFAULT NULL,
  p_warning_signs text[] DEFAULT NULL,
  p_coping_strategies text[] DEFAULT NULL,
  p_distractions text[] DEFAULT NULL,
  p_safe_environment text[] DEFAULT NULL,
  p_reasons_to_live text[] DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  s public.safety_plan_suggestions;
  v_title text;
  v_ws text[]; v_cs text[]; v_di text[]; v_se text[]; v_rl text[];
  v_plan_id uuid;
  v_edited boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  SELECT * INTO s FROM public.safety_plan_suggestions
  WHERE id = p_suggestion_id AND patient_id = v_uid
  FOR UPDATE;
  IF NOT FOUND OR s.status = 'draft' THEN
    RAISE EXCEPTION 'Plano não encontrado';
  END IF;
  -- Toque duplo ou segunda aba: devolve o plano já salvo.
  IF s.status = 'saved' AND s.saved_plan_id IS NOT NULL THEN
    RETURN s.saved_plan_id;
  END IF;

  v_title := COALESCE(left(nullif(btrim(p_title), ''), 80), s.title);
  v_ws := public.clean_safety_plan_items(COALESCE(p_warning_signs, s.warning_signs));
  v_cs := public.clean_safety_plan_items(COALESCE(p_coping_strategies, s.coping_strategies));
  v_di := public.clean_safety_plan_items(COALESCE(p_distractions, s.distractions));
  v_se := public.clean_safety_plan_items(COALESCE(p_safe_environment, s.safe_environment));
  v_rl := public.clean_safety_plan_items(COALESCE(p_reasons_to_live, s.reasons_to_live));
  v_edited := v_title IS DISTINCT FROM s.title OR v_ws IS DISTINCT FROM s.warning_signs
    OR v_cs IS DISTINCT FROM s.coping_strategies OR v_di IS DISTINCT FROM s.distractions
    OR v_se IS DISTINCT FROM s.safe_environment OR v_rl IS DISTINCT FROM s.reasons_to_live;

  IF p_replace_plan_id IS NOT NULL THEN
    DELETE FROM public.safety_plans WHERE id = p_replace_plan_id AND patient_id = v_uid;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'O plano a substituir não existe mais';
    END IF;
  END IF;

  -- O limite de 10 planos vale aqui também (enforce_safety_plan_limit).
  INSERT INTO public.safety_plans (
    patient_id, title, warning_signs, coping_strategies, distractions, safe_environment, reasons_to_live,
    recommended_by, source_suggestion_id, patient_edited_at
  ) VALUES (
    v_uid, v_title, v_ws, v_cs, v_di, v_se, v_rl,
    s.psychologist_name, s.id, CASE WHEN v_edited THEN now() END
  )
  RETURNING id INTO v_plan_id;

  UPDATE public.safety_plan_suggestions
  SET status = 'saved', saved_plan_id = v_plan_id, decided_at = now()
  WHERE id = s.id;
  RETURN v_plan_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.accept_safety_plan_suggestion(uuid, uuid, text, text[], text[], text[], text[], text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_safety_plan_suggestion(uuid, uuid, text, text[], text[], text[], text[], text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.dismiss_safety_plan_suggestion(p_suggestion_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  UPDATE public.safety_plan_suggestions
  SET status = 'dismissed', decided_at = now()
  WHERE id = p_suggestion_id AND patient_id = auth.uid() AND status = 'pending';
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.dismiss_safety_plan_suggestion(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dismiss_safety_plan_suggestion(uuid) TO authenticated;

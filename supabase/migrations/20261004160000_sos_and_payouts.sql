-- SOS e repasse dos psicólogos.
--
-- SOS
-- 1. O paciente podia criar chamado direto no banco, pulando a checagem de
--    cota (can_use_sos), que só existe na edge function emergency-sos. O app
--    sempre cria pela edge function; a permissão direta sai.
-- 2. O paciente podia alterar qualquer campo do próprio chamado (aumentar o
--    limite de tempo da chamada além do plano, reabrir chamado encerrado,
--    trocar o psicólogo). Agora o app só faz as mudanças do fluxo normal.
-- 3. A cota mensal do SOS era marcada pelo app do paciente ao entrar na
--    chamada (mark-sos-used). Se essa chamada falhasse ou fosse pulada, o SOS
--    saía de graça e sem limite. Agora o banco marca quando a chamada começa.
--
-- Repasse
-- 4. O repasse contava SOS pela tabela de consultas (appointment_type =
--    'emergency'), mas o SOS nunca cria consulta: o psicólogo nunca recebia
--    pelos atendimentos de SOS. Agora conta os chamados de SOS concluídos.
-- 5. A sincronização somava de novo a cada clique: sincronizar duas vezes na
--    mesma semana dobrava o valor a pagar. Agora cada consulta/SOS entra uma
--    única vez (payout_items) e nada que já passou fica de fora.

-- ===========================================================================
-- 1. Criar chamado só pela edge function
-- ===========================================================================
DROP POLICY IF EXISTS "Patients can create emergency requests" ON public.emergency_requests;

-- ===========================================================================
-- 2. Mudanças permitidas pelo app no chamado
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.guard_emergency_request_client_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Edge functions, cron e funções do banco seguem livres.
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  IF NEW.patient_id IS DISTINCT FROM OLD.patient_id
     OR NEW.time_limit_seconds IS DISTINCT FROM OLD.time_limit_seconds
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.video_room_id IS DISTINCT FROM OLD.video_room_id THEN
    RAISE EXCEPTION 'Alteração não permitida neste atendimento' USING ERRCODE = '42501';
  END IF;

  -- Psicólogo só pode assumir um chamado livre para si mesmo.
  IF NEW.accepted_by IS DISTINCT FROM OLD.accepted_by
     AND NOT (OLD.accepted_by IS NULL AND NEW.accepted_by = auth.uid()) THEN
    RAISE EXCEPTION 'Alteração não permitida neste atendimento' USING ERRCODE = '42501';
  END IF;

  -- O início da chamada não pode ser apagado nem trocado.
  IF OLD.started_at IS NOT NULL AND NEW.started_at IS DISTINCT FROM OLD.started_at THEN
    RAISE EXCEPTION 'Alteração não permitida neste atendimento' USING ERRCODE = '42501';
  END IF;

  -- Chamado encerrado não volta a ficar ativo.
  IF OLD.status IN ('completed', 'cancelled', 'expired', 'abandoned')
     AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Este atendimento já foi encerrado' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_emergency_request_client_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_emergency_request_client_update ON public.emergency_requests;
CREATE TRIGGER guard_emergency_request_client_update
  BEFORE UPDATE ON public.emergency_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_emergency_request_client_update();

-- ===========================================================================
-- 3. Cota do SOS marcada pelo banco quando a chamada começa
-- ===========================================================================
-- Mesma regra da edge function mark-sos-used (que continua sendo chamada e
-- vira só uma segunda garantia): Plus e Premium têm 1 SOS por mês.
CREATE OR REPLACE FUNCTION public.mark_sos_used_on_start()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.started_at IS NULL AND NEW.started_at IS NOT NULL THEN
    UPDATE public.subscribers
    SET sos_used_this_month = true,
        sos_last_used = (now() AT TIME ZONE 'America/Sao_Paulo')::date,
        updated_at = now()
    WHERE user_id = NEW.patient_id
      AND subscribed = true
      AND lower(COALESCE(subscription_tier, '')) IN ('plus', 'premium');
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_sos_used_on_start() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS mark_sos_used_on_start ON public.emergency_requests;
CREATE TRIGGER mark_sos_used_on_start
  AFTER UPDATE OF started_at ON public.emergency_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_sos_used_on_start();

-- ===========================================================================
-- 4 e 5. Repasse: cada atendimento entra uma única vez
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.payout_items (
  source_type text NOT NULL CHECK (source_type IN ('appointment', 'sos')),
  source_id uuid NOT NULL,
  psychologist_user_id uuid NOT NULL,
  amount numeric(10, 2) NOT NULL,
  occurred_at timestamptz NOT NULL,
  counted_at timestamptz NOT NULL DEFAULT now(),
  -- true = registrado na criação desta tabela, sem somar ao valor a pagar
  -- (já tinha sido contado pela sincronização antiga, ou fica a critério do admin).
  backfilled boolean NOT NULL DEFAULT false,
  PRIMARY KEY (source_type, source_id)
);

ALTER TABLE public.payout_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins veem os itens de repasse" ON public.payout_items
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

CREATE INDEX IF NOT EXISTS payout_items_psychologist_idx ON public.payout_items (psychologist_user_id, occurred_at);

-- Histórico: tudo que a sincronização antiga já cobria fica registrado sem
-- somar de novo. Consultas antes da semana passada: já sincronizadas. Semana
-- passada: só se já houve sincronização dela para o psicólogo. SOS anteriores
-- (que nunca foram pagos): registrados sem valor a pagar, para o admin
-- decidir (consulta em payout_items com source_type = 'sos' e backfilled).
INSERT INTO public.payout_items (source_type, source_id, psychologist_user_id, amount, occurred_at, backfilled)
SELECT 'appointment', a.id, a.psychologist_id, 90.00, a.scheduled_at, true
FROM public.appointments a
WHERE a.status = 'completed'
  AND a.appointment_type = 'regular'
  AND (
    a.scheduled_at < date_trunc('week', now() - interval '1 week')
    OR (
      a.scheduled_at < date_trunc('week', now())
      AND EXISTS (
        SELECT 1
        FROM public.payment_logs l
        JOIN public.psychologists p ON p.id = l.psychologist_id
        WHERE p.user_id = a.psychologist_id
          AND l.action = 'sync_update'
          AND (l.details ->> 'week_start')::timestamptz = date_trunc('week', now() - interval '1 week')
      )
    )
  )
ON CONFLICT DO NOTHING;

INSERT INTO public.payout_items (source_type, source_id, psychologist_user_id, amount, occurred_at, backfilled)
SELECT 'sos', e.id, e.accepted_by, 50.00, e.started_at, true
FROM public.emergency_requests e
WHERE e.status = 'completed'
  AND e.accepted_by IS NOT NULL
  AND e.started_at IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.sync_psychologist_payments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  -- Semanas fechadas (até a última segunda-feira), como antes; o que ficou de
  -- fora de sincronizações anteriores também entra.
  v_cutoff timestamptz := date_trunc('week', now());
  r record;
BEGIN
  CREATE TEMP TABLE IF NOT EXISTS _new_payout_items (
    source_type text, psychologist_user_id uuid, amount numeric
  ) ON COMMIT DROP;
  TRUNCATE _new_payout_items;

  WITH inserted AS (
    INSERT INTO public.payout_items (source_type, source_id, psychologist_user_id, amount, occurred_at)
    SELECT 'appointment', a.id, a.psychologist_id, 90.00, a.scheduled_at
    FROM public.appointments a
    WHERE a.status = 'completed'
      AND a.appointment_type = 'regular'
      AND a.scheduled_at < v_cutoff
    UNION ALL
    SELECT 'sos', e.id, e.accepted_by, 50.00, e.started_at
    FROM public.emergency_requests e
    WHERE e.status = 'completed'
      AND e.accepted_by IS NOT NULL
      AND e.started_at IS NOT NULL
      AND e.started_at < v_cutoff
    ON CONFLICT DO NOTHING
    RETURNING source_type, psychologist_user_id, amount
  )
  INSERT INTO _new_payout_items SELECT * FROM inserted;

  FOR r IN
    SELECT p.id AS psychologist_id, p.full_name, p.cpf, p.crp_number, p.email, p.pix_key, p.pix_type,
           count(*) FILTER (WHERE n.source_type = 'appointment')::int AS scheduled_count,
           count(*) FILTER (WHERE n.source_type = 'sos')::int AS emergency_count,
           sum(n.amount) AS total
    FROM _new_payout_items n
    JOIN public.psychologists p ON p.user_id = n.psychologist_user_id
    GROUP BY p.id, p.full_name, p.cpf, p.crp_number, p.email, p.pix_key, p.pix_type
  LOOP
    INSERT INTO public.psychologist_payments (
      psychologist_id, name, cpf, crp, email, pix_key, pix_type,
      scheduled_pending_count, emergency_pending_count, total_pending_amount
    ) VALUES (
      r.psychologist_id, r.full_name, r.cpf, r.crp_number, r.email, r.pix_key, r.pix_type,
      r.scheduled_count, r.emergency_count, r.total
    )
    ON CONFLICT (psychologist_id) DO UPDATE SET
      name = EXCLUDED.name,
      cpf = EXCLUDED.cpf,
      crp = EXCLUDED.crp,
      email = EXCLUDED.email,
      pix_key = EXCLUDED.pix_key,
      pix_type = EXCLUDED.pix_type,
      scheduled_pending_count = COALESCE(psychologist_payments.scheduled_pending_count, 0) + EXCLUDED.scheduled_pending_count,
      emergency_pending_count = COALESCE(psychologist_payments.emergency_pending_count, 0) + EXCLUDED.emergency_pending_count,
      total_pending_amount = COALESCE(psychologist_payments.total_pending_amount, 0) + EXCLUDED.total_pending_amount,
      updated_at = now();

    INSERT INTO public.payment_logs (psychologist_id, admin_id, action, scheduled_count, emergency_count, details)
    VALUES (
      r.psychologist_id,
      '00000000-0000-0000-0000-000000000000',
      'sync_update',
      r.scheduled_count,
      r.emergency_count,
      jsonb_build_object(
        'week_start', date_trunc('week', now() - interval '1 week'),
        'week_end', v_cutoff,
        'scheduled_amount', r.scheduled_count * 90.00,
        'emergency_amount', r.emergency_count * 50.00,
        'total_amount', r.total
      )
    );
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_psychologist_payments() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_psychologist_payments() TO service_role;

-- ===========================================================================
-- 6. Acompanhamento no dia seguinte ao SOS
-- ===========================================================================
-- Serviços de crise como o 988 fazem contato depois do atendimento: o dia
-- seguinte é um momento de risco. Cerca de 24h depois de um SOS concluído,
-- o paciente recebe uma mensagem (também por push) perguntando como está.
CREATE TABLE IF NOT EXISTS public.sos_followups_sent (
  request_id uuid PRIMARY KEY REFERENCES public.emergency_requests(id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sos_followups_sent ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.queue_sos_followups()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH due AS (
    SELECT e.id, e.patient_id
    FROM public.emergency_requests e
    WHERE e.status = 'completed'
      AND e.started_at IS NOT NULL
      AND e.ended_at BETWEEN now() - interval '30 hours' AND now() - interval '22 hours'
  ),
  claimed AS (
    INSERT INTO public.sos_followups_sent (request_id)
    SELECT id FROM due
    ON CONFLICT DO NOTHING
    RETURNING request_id
  )
  INSERT INTO public.notifications (patient_id, title, message, status, push, link)
  SELECT d.patient_id,
         'Como você está hoje?',
         'Ontem você pediu ajuda pelo SOS. Que tal registrar como está se sentindo hoje? Se precisar, o seu plano de segurança e a respiração guiada estão no app, e o CVV atende 24h no 188.',
         'unread', true, '/home'
  FROM claimed c
  JOIN due d ON d.id = c.request_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.queue_sos_followups() FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'sos-followups';
SELECT cron.schedule('sos-followups', '17 * * * *', $cron$SELECT public.queue_sos_followups();$cron$);

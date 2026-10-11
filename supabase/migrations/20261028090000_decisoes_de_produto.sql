-- Decisões de produto de outubro de 2026 (pendências 4, 11, 13, 14 e 15).

-- ============================================================================
-- 4. SOS de antes da correção do repasse: não serão pagos. O app ainda não
--    está em produção, então os registros (só histórico, fora do valor a
--    pagar) são apagados.
-- ============================================================================
DELETE FROM public.payout_items WHERE backfilled;

-- ============================================================================
-- 13. SOS só entra no repasse com 5 minutos de chamada com os dois lados
--     conectados (como a consulta agendada). Antes bastava conectar.
--     Não muda a devolução do SOS do mês ao paciente (continua: só volta se a
--     chamada nunca conectou ou terminou por falha).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sos_call_payable(p_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.webrtc_sessions s
    WHERE s.emergency_request_id = p_request_id
      AND s.connected_at IS NOT NULL
      -- Salas antigas, sem contagem de tempo: vale a regra de antes.
      AND (NOT s.media_tracked OR s.media_seconds >= 300)
  );
$function$;

REVOKE EXECUTE ON FUNCTION public.sos_call_payable(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.sync_psychologist_payments()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  -- Semanas fechadas (até a última segunda-feira, no horário de Brasília); o
  -- que ficou de fora de sincronizações anteriores também entra.
  v_cutoff timestamptz := (date_trunc('week', now() AT TIME ZONE 'America/Sao_Paulo')) AT TIME ZONE 'America/Sao_Paulo';
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
      AND public.appointment_call_connected(a.video_room_id)
    UNION ALL
    SELECT 'sos', e.id, e.accepted_by, 50.00, e.started_at
    FROM public.emergency_requests e
    WHERE e.status = 'completed'
      AND e.accepted_by IS NOT NULL
      AND e.started_at IS NOT NULL
      AND e.started_at < v_cutoff
      AND public.sos_call_payable(e.id)
    ON CONFLICT DO NOTHING
    RETURNING source_type, psychologist_user_id, amount
  )
  INSERT INTO _new_payout_items SELECT * FROM inserted;

  -- Pendente sempre a partir do livro (também corrige diferenças antigas).
  FOR r IN
    SELECT DISTINCT psychologist_user_id FROM public.payout_items WHERE paid_at IS NULL AND NOT backfilled
    UNION
    SELECT p.user_id FROM public.psychologist_payments pp JOIN public.psychologists p ON p.id = pp.psychologist_id
    WHERE COALESCE(pp.total_pending_amount, 0) <> 0
  LOOP
    PERFORM public.recompute_psychologist_pending(r.psychologist_user_id);
  END LOOP;

  FOR r IN
    SELECT p.id AS psychologist_id,
           count(*) FILTER (WHERE n.source_type = 'appointment')::int AS scheduled_count,
           count(*) FILTER (WHERE n.source_type = 'sos')::int AS emergency_count,
           sum(n.amount) AS total
    FROM _new_payout_items n
    JOIN public.psychologists p ON p.user_id = n.psychologist_user_id
    GROUP BY p.id
  LOOP
    INSERT INTO public.payment_logs (psychologist_id, admin_id, action, scheduled_count, emergency_count, details)
    VALUES (
      r.psychologist_id,
      '00000000-0000-0000-0000-000000000000',
      'sync_update',
      r.scheduled_count,
      r.emergency_count,
      jsonb_build_object(
        'week_end', v_cutoff,
        'scheduled_amount', r.scheduled_count * 90.00,
        'emergency_amount', r.emergency_count * 50.00,
        'total_amount', r.total
      )
    );
  END LOOP;
END;
$function$;

-- ============================================================================
-- 11. Anotação privada do psicólogo, separada do resumo da sessão.
--     O resumo (appointments.session_summary) continua visível ao paciente;
--     a anotação fica numa tabela que só o psicólogo da consulta lê.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.appointment_private_notes (
  appointment_id uuid PRIMARY KEY REFERENCES public.appointments(id) ON DELETE CASCADE,
  psychologist_id uuid NOT NULL,
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 10000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS appointment_private_notes_psychologist_idx
  ON public.appointment_private_notes (psychologist_id);

ALTER TABLE public.appointment_private_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Psychologist reads own private notes" ON public.appointment_private_notes;
DROP POLICY IF EXISTS "Psychologist writes own private notes" ON public.appointment_private_notes;
DROP POLICY IF EXISTS "Psychologist updates own private notes" ON public.appointment_private_notes;
DROP POLICY IF EXISTS "Psychologist deletes own private notes" ON public.appointment_private_notes;

CREATE POLICY "Psychologist reads own private notes" ON public.appointment_private_notes
  FOR SELECT TO authenticated USING (psychologist_id = auth.uid());
CREATE POLICY "Psychologist writes own private notes" ON public.appointment_private_notes
  FOR INSERT TO authenticated WITH CHECK (
    psychologist_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.appointments a WHERE a.id = appointment_id AND a.psychologist_id = auth.uid())
  );
CREATE POLICY "Psychologist updates own private notes" ON public.appointment_private_notes
  FOR UPDATE TO authenticated USING (psychologist_id = auth.uid()) WITH CHECK (psychologist_id = auth.uid());
CREATE POLICY "Psychologist deletes own private notes" ON public.appointment_private_notes
  FOR DELETE TO authenticated USING (psychologist_id = auth.uid());

-- A consulta e o dono da anotação não mudam depois de criada.
CREATE OR REPLACE FUNCTION public.guard_private_note_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.appointment_id := OLD.appointment_id;
    NEW.psychologist_id := OLD.psychologist_id;
    NEW.created_at := OLD.created_at;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS a_guard_private_note ON public.appointment_private_notes;
CREATE TRIGGER a_guard_private_note
  BEFORE INSERT OR UPDATE ON public.appointment_private_notes
  FOR EACH ROW EXECUTE FUNCTION public.guard_private_note_update();

-- ============================================================================
-- 14. Repasses de psicólogo excluído: arquivados por 5 anos (registro
--     fiscal), sem ligação com a conta. Só o admin lê. A exclusão
--     (admin-delete-psychologist) arquiva antes de apagar; uma rotina diária
--     apaga o que passou dos 5 anos.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.archived_psychologist_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Só para achar os comprovantes no bucket payment-receipts (pasta com este id).
  former_psychologist_id uuid NOT NULL,
  full_name text,
  cpf text,
  crp text,
  email text,
  pix_key text,
  pix_type text,
  payment_summary jsonb,
  payment_logs jsonb NOT NULL DEFAULT '[]'::jsonb,
  payout_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  archived_at timestamptz NOT NULL DEFAULT now(),
  purge_after date NOT NULL DEFAULT ((now() AT TIME ZONE 'America/Sao_Paulo')::date + interval '5 years')::date
);

ALTER TABLE public.archived_psychologist_payouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read archived payouts" ON public.archived_psychologist_payouts;
CREATE POLICY "Admins read archived payouts" ON public.archived_psychologist_payouts
  FOR SELECT TO authenticated USING (public.is_super_admin());

CREATE OR REPLACE FUNCTION public.archive_psychologist_payouts(p_psychologist_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  p public.psychologists%ROWTYPE;
  v_logs jsonb;
  v_items jsonb;
  v_summary jsonb;
  v_id uuid;
BEGIN
  SELECT * INTO p FROM public.psychologists WHERE id = p_psychologist_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(l) - 'psychologist_id' ORDER BY l.created_at), '[]'::jsonb)
    INTO v_logs FROM public.payment_logs l WHERE l.psychologist_id = p.id;
  SELECT COALESCE(jsonb_agg(to_jsonb(i) - 'psychologist_user_id' ORDER BY i.occurred_at), '[]'::jsonb)
    INTO v_items FROM public.payout_items i WHERE i.psychologist_user_id = p.user_id;
  SELECT to_jsonb(pp) - 'psychologist_id' INTO v_summary
    FROM public.psychologist_payments pp WHERE pp.psychologist_id = p.id;

  -- Nada para guardar: nunca teve repasse.
  IF v_logs = '[]'::jsonb AND v_items = '[]'::jsonb AND v_summary IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.archived_psychologist_payouts (
    former_psychologist_id, full_name, cpf, crp, email, pix_key, pix_type,
    payment_summary, payment_logs, payout_items
  ) VALUES (
    p.id, p.full_name, p.cpf, p.crp_number, p.email, p.pix_key, p.pix_type,
    v_summary, v_logs, v_items
  )
  RETURNING id INTO v_id;

  DELETE FROM public.payout_items WHERE psychologist_user_id = p.user_id;
  RETURN v_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.archive_psychologist_payouts(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.purge_archived_psychologist_payouts()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH d AS (
    DELETE FROM public.archived_psychologist_payouts
    WHERE purge_after < (now() AT TIME ZONE 'America/Sao_Paulo')::date
    RETURNING 1
  )
  SELECT count(*)::integer FROM d;
$function$;

REVOKE EXECUTE ON FUNCTION public.purge_archived_psychologist_payouts() FROM PUBLIC, anon, authenticated;

DO $cron$
BEGIN
  PERFORM cron.unschedule('purge-archived-payouts')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-archived-payouts');
  PERFORM cron.schedule('purge-archived-payouts', '25 5 * * *', 'SELECT public.purge_archived_psychologist_payouts();');
END
$cron$;

-- ============================================================================
-- 15. Consulta marcada para depois do fim do plano: é cancelada quando o
--     plano termina, com aviso ao paciente 3 dias antes.
-- ============================================================================

-- Mesma função do cancelamento imediato, com o motivo certo para cada caso.
CREATE OR REPLACE FUNCTION public.cancel_appointments_after_plan_loss(p_user_id uuid, p_reason text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  v_count integer := 0;
  v_premium boolean;
  v_plan_ended boolean := p_reason = 'plan_ended';
BEGIN
  -- Ainda tem Premium (ex.: pela empresa): nada muda.
  SELECT COALESCE(bool_or(subscribed AND lower(COALESCE(subscription_tier, '')) = 'premium'), false)
    INTO v_premium
  FROM public.subscribers WHERE user_id = p_user_id;
  IF v_premium THEN
    RETURN 0;
  END IF;

  FOR r IN
    SELECT a.id, a.psychologist_id,
           CASE WHEN a.status = 'reschedule_proposed' AND a.proposed_scheduled_at IS NOT NULL
                THEN a.proposed_scheduled_at ELSE a.scheduled_at END AS starts_at
    FROM public.appointments a
    WHERE a.patient_id = p_user_id
      AND a.appointment_type = 'regular'
      AND a.status IN ('pending', 'scheduled', 'confirmed', 'reschedule_proposed')
      AND CASE WHEN a.status = 'reschedule_proposed' AND a.proposed_scheduled_at IS NOT NULL
               THEN a.proposed_scheduled_at ELSE a.scheduled_at END > now()
    FOR UPDATE
  LOOP
    UPDATE public.appointments
    SET status = 'cancelled',
        cancelled_at = now(),
        cancellation_reason = CASE WHEN v_plan_ended THEN 'O plano do paciente terminou' ELSE 'Plano cancelado pelo paciente' END
    WHERE id = r.id;

    INSERT INTO public.notifications (patient_id, appointment_id, title, message, status, push, link)
    VALUES (
      r.psychologist_id, r.id, 'Consulta cancelada',
      'A consulta de ' || public.format_br_datetime(r.starts_at) || ' foi cancelada: '
        || CASE WHEN v_plan_ended THEN 'o plano do paciente terminou.' ELSE 'o paciente cancelou o plano.' END
        || ' O horário ficou livre.',
      'unread', true, '/psicologo/consultas'
    );
    v_count := v_count + 1;
  END LOOP;

  IF v_count > 0 THEN
    INSERT INTO public.notifications (patient_id, title, message, status, push, link)
    VALUES (
      p_user_id, 'Consultas canceladas',
      CASE WHEN v_plan_ended THEN
             CASE WHEN v_count = 1 THEN 'Seu plano terminou e a consulta marcada para depois disso foi cancelada. Para agendar de novo, escolha um plano.'
                  ELSE 'Seu plano terminou e as ' || v_count || ' consultas marcadas para depois disso foram canceladas. Para agendar de novo, escolha um plano.' END
           ELSE
             CASE WHEN v_count = 1 THEN 'Sua consulta agendada foi cancelada junto com o plano.'
                  ELSE 'Suas ' || v_count || ' consultas agendadas foram canceladas junto com o plano.' END
      END,
      'unread', v_plan_ended, CASE WHEN v_plan_ended THEN '/subscription-plans' ELSE '/appointments' END
    );
  END IF;
  RETURN v_count;
END;
$function$;

-- A versão de antes (usada pelo cancelamento imediato) continua existindo.
CREATE OR REPLACE FUNCTION public.cancel_appointments_after_plan_loss(p_user_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.cancel_appointments_after_plan_loss(p_user_id, 'cancelled');
$function$;

REVOKE EXECUTE ON FUNCTION public.cancel_appointments_after_plan_loss(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cancel_appointments_after_plan_loss(uuid) FROM PUBLIC, anon, authenticated;

-- Quando o Premium termina (fim do período, pagamento recusado, empresa que
-- encerrou), as consultas futuras são canceladas. No cancelamento imediato o
-- app já cancelou antes; aqui não sobra nada para cancelar.
CREATE OR REPLACE FUNCTION public.cancel_appointments_on_plan_end()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.user_id IS NOT NULL
     AND OLD.subscribed AND lower(COALESCE(OLD.subscription_tier, '')) = 'premium'
     AND NOT (NEW.subscribed AND lower(COALESCE(NEW.subscription_tier, '')) = 'premium') THEN
    PERFORM public.cancel_appointments_after_plan_loss(NEW.user_id, 'plan_ended');
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS cancel_appointments_on_plan_end ON public.subscribers;
CREATE TRIGGER cancel_appointments_on_plan_end
  AFTER UPDATE ON public.subscribers
  FOR EACH ROW EXECUTE FUNCTION public.cancel_appointments_on_plan_end();

-- Aviso 3 dias antes: plano que não vai renovar e consulta marcada para
-- depois do fim. Um aviso por consulta.
CREATE OR REPLACE FUNCTION public.warn_appointments_before_plan_end()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  v_count integer := 0;
BEGIN
  FOR r IN
    SELECT s.user_id, s.subscription_end, a.id AS appointment_id,
           CASE WHEN a.status = 'reschedule_proposed' AND a.proposed_scheduled_at IS NOT NULL
                THEN a.proposed_scheduled_at ELSE a.scheduled_at END AS starts_at
    FROM public.subscribers s
    JOIN public.appointments a ON a.patient_id = s.user_id
    WHERE s.subscribed
      AND s.cancel_at_period_end
      AND lower(COALESCE(s.subscription_tier, '')) = 'premium'
      AND s.subscription_end > now()
      AND s.subscription_end <= now() + interval '3 days'
      AND a.appointment_type = 'regular'
      AND a.status IN ('pending', 'scheduled', 'confirmed', 'reschedule_proposed')
      AND CASE WHEN a.status = 'reschedule_proposed' AND a.proposed_scheduled_at IS NOT NULL
               THEN a.proposed_scheduled_at ELSE a.scheduled_at END >= s.subscription_end
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.patient_id = s.user_id AND n.appointment_id = a.id
          AND n.title = 'Consulta depois do fim do plano'
      )
  LOOP
    INSERT INTO public.notifications (patient_id, appointment_id, title, message, status, push, link)
    VALUES (
      r.user_id, r.appointment_id, 'Consulta depois do fim do plano',
      'Seu plano termina em ' || to_char(r.subscription_end AT TIME ZONE 'America/Sao_Paulo', 'DD/MM')
        || '. A consulta de ' || public.format_br_datetime(r.starts_at)
        || ' será cancelada se o plano não for renovado.',
      'unread', true, '/subscription-plans'
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.warn_appointments_before_plan_end() FROM PUBLIC, anon, authenticated;

DO $cron$
BEGIN
  PERFORM cron.unschedule('warn-appointments-before-plan-end')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'warn-appointments-before-plan-end');
  PERFORM cron.schedule('warn-appointments-before-plan-end', '12 12 * * *', 'SELECT public.warn_appointments_before_plan_end();');
END
$cron$;

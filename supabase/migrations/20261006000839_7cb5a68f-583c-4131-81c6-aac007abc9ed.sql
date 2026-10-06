-- SOS: correções da varredura de 2026-10-06.
--
-- 1. Um SOS aberto por paciente. Dois toques ao mesmo tempo (ou duas abas)
--    passavam os dois pela checagem da edge function e criavam dois pedidos
--    na fila.
-- 2. Um SOS por psicólogo. A checagem "já está em atendimento" da edge
--    function não segurava dois aceites ao mesmo tempo, e o aceite direto
--    pelo banco (policy de UPDATE) não passava por ela.
-- 3. Pedido com mais de 10 minutos não pode mais ser aceito (a rotina de
--    expiração roda a cada minuto; nesse intervalo o aceite ainda passava).
-- 4. SOS do mês devolvido sempre que a chamada começou mas não conectou os
--    dois lados, qualquer que seja o motivo do fim. Antes, cancelado por
--    outro motivo (ex.: paciente cancelou depois do aceite) ficava gasto.

-- ===========================================================================
-- 1 a 3. Um SOS aberto por paciente e por psicólogo; aceite dentro do prazo
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.guard_sos_concurrency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_open text[] := ARRAY['pending', 'accepted', 'in_progress'];
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = ANY (v_open) AND NEW.ended_at IS NULL THEN
      PERFORM pg_advisory_xact_lock(hashtext('sos_patient:' || NEW.patient_id::text));
      IF EXISTS (
        SELECT 1 FROM public.emergency_requests e
        WHERE e.patient_id = NEW.patient_id
          AND e.status = ANY (v_open)
          AND e.ended_at IS NULL
      ) THEN
        RAISE EXCEPTION 'SOS_ALREADY_OPEN' USING ERRCODE = '23505';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- Aceite: pendente → aceito.
  IF OLD.status = 'pending' AND NEW.status = 'accepted' AND NEW.accepted_by IS NOT NULL THEN
    IF OLD.created_at < now() - interval '10 minutes' THEN
      RAISE EXCEPTION 'Este pedido de SOS expirou e não pode mais ser aceito.' USING ERRCODE = 'P0001';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext('sos_psychologist:' || NEW.accepted_by::text));
    IF EXISTS (
      SELECT 1 FROM public.emergency_requests e
      WHERE e.accepted_by = NEW.accepted_by
        AND e.id <> NEW.id
        AND e.status IN ('accepted', 'in_progress')
        AND e.ended_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Você já está em um atendimento de emergência. Finalize-o antes de aceitar outro.' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_sos_concurrency() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_sos_concurrency ON public.emergency_requests;
CREATE TRIGGER guard_sos_concurrency
  BEFORE INSERT OR UPDATE OF status, accepted_by ON public.emergency_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_sos_concurrency();

-- ===========================================================================
-- 4. Devolver o SOS do mês quando a chamada não conectou
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.refund_sos_on_failed_call()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.started_at IS NOT NULL
     AND NEW.status IN ('cancelled', 'completed')
     AND OLD.status IS DISTINCT FROM NEW.status
     AND (
       -- Psicólogo sumiu ou os dois perderam o sinal: devolve mesmo que a
       -- chamada tenha chegado a conectar.
       NEW.end_reason IN ('abandoned', 'psychologist_unavailable')
       -- Qualquer outro fim sem os dois lados chegarem a se ver/ouvir.
       OR NOT public.sos_call_connected(NEW.id)
     ) THEN
    UPDATE public.subscribers
    SET sos_used_this_month = false, updated_at = now()
    WHERE user_id = NEW.patient_id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.refund_sos_on_failed_call() FROM PUBLIC, anon, authenticated;
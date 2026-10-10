-- Consultas: regras no servidor (segunda varredura).
--
-- 1. Horário proposto também é protegido pelo banco. A trava contra dois
--    pedidos no mesmo horário (prevent_appointment_overlap) olhava só o
--    horário marcado: um paciente agendando e o psicólogo propondo o mesmo
--    horário a outro paciente, ao mesmo tempo, passavam os dois.
-- 2. Lembretes seguem o horário novo. Os lembretes de 24 h e 1 h ficam
--    registrados por consulta; quando a consulta mudava de horário (proposta
--    aceita), o "já enviado" do horário antigo valia para o novo e o paciente
--    ficava sem lembrete.
-- 3. Limites de texto no resumo da sessão (10.000) e na mensagem da proposta
--    (1.000).

CREATE OR REPLACE FUNCTION public.prevent_appointment_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_holding text[] := ARRAY['pending', 'scheduled', 'confirmed', 'in_progress'];
  v_start timestamptz;
  v_duration integer := COALESCE(NEW.duration, 50);
BEGIN
  IF NEW.appointment_type IS DISTINCT FROM 'regular' THEN
    RETURN NEW;
  END IF;

  -- Horário que esta consulta passa a segurar.
  IF NEW.status = ANY (v_holding) THEN
    v_start := NEW.scheduled_at;
  ELSIF NEW.status = 'reschedule_proposed' AND NEW.proposed_scheduled_at IS NOT NULL THEN
    v_start := NEW.proposed_scheduled_at;
  ELSE
    RETURN NEW;
  END IF;

  -- Já segurava este mesmo horário (ex.: pendente → confirmada): nada muda.
  IF TG_OP = 'UPDATE'
     AND NEW.psychologist_id = OLD.psychologist_id
     AND v_duration = COALESCE(OLD.duration, 50)
     AND (
       (OLD.status = ANY (v_holding) AND OLD.scheduled_at = v_start)
       OR (OLD.status = 'reschedule_proposed' AND OLD.proposed_scheduled_at = v_start)
     ) THEN
    RETURN NEW;
  END IF;

  -- Um pedido de cada vez por psicólogo, até o fim da transação.
  PERFORM pg_advisory_xact_lock(hashtext('appointment_slot:' || NEW.psychologist_id::text));

  IF EXISTS (
    SELECT 1
    FROM public.appointments a
    CROSS JOIN LATERAL (
      SELECT CASE
        WHEN a.status = ANY (v_holding) THEN a.scheduled_at
        WHEN a.status = 'reschedule_proposed' THEN a.proposed_scheduled_at
      END AS held_at
    ) h
    WHERE a.psychologist_id = NEW.psychologist_id
      AND a.id <> NEW.id
      AND a.appointment_type = 'regular'
      AND h.held_at IS NOT NULL
      AND h.held_at < v_start + make_interval(mins => v_duration)
      AND v_start < h.held_at + make_interval(mins => COALESCE(a.duration, 50))
  ) THEN
    RAISE EXCEPTION 'Este horário já está ocupado. Escolha outro horário disponível.' USING ERRCODE = '23P01';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS prevent_appointment_overlap ON public.appointments;
CREATE TRIGGER prevent_appointment_overlap
  BEFORE INSERT OR UPDATE OF status, scheduled_at, proposed_scheduled_at, psychologist_id, duration
  ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.prevent_appointment_overlap();

-- Mudou o horário: os lembretes valem para o horário novo.
CREATE OR REPLACE FUNCTION public.reset_appointment_reminders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at THEN
    DELETE FROM public.appointment_reminders_sent WHERE appointment_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.reset_appointment_reminders() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS reset_appointment_reminders ON public.appointments;
CREATE TRIGGER reset_appointment_reminders
  AFTER UPDATE OF scheduled_at ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.reset_appointment_reminders();

ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_session_summary_tamanho;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_session_summary_tamanho
  CHECK (session_summary IS NULL OR char_length(session_summary) <= 10000) NOT VALID;
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_proposal_notes_tamanho;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_proposal_notes_tamanho
  CHECK (proposal_notes IS NULL OR char_length(proposal_notes) <= 1000) NOT VALID;
-- Excluir um psicólogo não apaga mais o histórico de consultas dos pacientes.
--
-- Antes, apagar o cadastro do psicólogo apagava junto (em cascata) todas as
-- consultas dele: o paciente perdia o histórico, o resumo das sessões e a
-- avaliação, e as consultas futuras sumiam sem aviso nem devolução da
-- consulta do mês.
--
-- Agora, antes de excluir (admin-delete-psychologist chama
-- detach_psychologist_from_appointments):
-- - as consultas ainda ativas (futuras ou não fechadas) são canceladas, o
--   paciente é avisado e a consulta do mês volta para ele;
-- - todas as consultas guardam o nome do psicólogo (psychologist_name) e ficam
--   no histórico do paciente, sem ligação com a conta excluída;
-- - as anotações privadas do psicólogo saem junto com ele.

ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS psychologist_name text;

ALTER TABLE public.appointments ALTER COLUMN psychologist_id DROP NOT NULL;

ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_psychologist_fk;
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_psychologist_fk
  FOREIGN KEY (psychologist_id) REFERENCES public.psychologists(user_id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.detach_psychologist_from_appointments(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_name text;
  r record;
  v_cancelled integer := 0;
  v_refunded boolean;
BEGIN
  SELECT full_name INTO v_name FROM public.psychologists WHERE user_id = p_user_id;

  FOR r IN
    SELECT a.id, a.patient_id,
           CASE WHEN a.status = 'reschedule_proposed' AND a.proposed_scheduled_at IS NOT NULL
                THEN a.proposed_scheduled_at ELSE a.scheduled_at END AS starts_at
    FROM public.appointments a
    -- Todas as ativas, também a que já começou ou ainda não foi fechada pela
    -- rotina: sem psicólogo, ela não teria como acontecer nem ser fechada.
    WHERE a.psychologist_id = p_user_id
      AND a.status IN ('pending', 'scheduled', 'confirmed', 'reschedule_proposed', 'in_progress')
    FOR UPDATE
  LOOP
    UPDATE public.appointments
    SET status = 'cancelled',
        cancelled_at = now(),
        cancellation_reason = 'O psicólogo não atende mais pelo Soliv'
    WHERE id = r.id;

    v_refunded := public.release_appointment_quota(r.id);

    INSERT INTO public.notifications (patient_id, appointment_id, title, message, status, push, link)
    VALUES (
      r.patient_id, r.id, 'Consulta cancelada',
      'A consulta de ' || public.format_br_datetime(r.starts_at)
        || CASE WHEN v_name IS NOT NULL THEN ' com ' || v_name ELSE '' END
        || ' foi cancelada: o psicólogo não atende mais pelo Soliv.'
        || CASE WHEN v_refunded THEN ' A consulta do mês voltou para você.' ELSE '' END
        || ' Você pode agendar com outro profissional.',
      'unread', true, '/appointments'
    );
    v_cancelled := v_cancelled + 1;
  END LOOP;

  -- O nome fica na consulta para o histórico do paciente.
  UPDATE public.appointments
  SET psychologist_name = COALESCE(psychologist_name, v_name)
  WHERE psychologist_id = p_user_id;

  -- Anotações privadas são do psicólogo: saem com ele.
  DELETE FROM public.appointment_private_notes WHERE psychologist_id = p_user_id;

  RETURN v_cancelled;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.detach_psychologist_from_appointments(uuid) FROM PUBLIC, anon, authenticated;
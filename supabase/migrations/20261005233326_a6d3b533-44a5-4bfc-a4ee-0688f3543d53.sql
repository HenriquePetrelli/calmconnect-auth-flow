-- Regras de agendamento: correções da varredura de 2026-10-05.
--
-- 1. Horários ocupados visíveis para o paciente. As policies deixam o
--    paciente ler só as próprias consultas, então o app mostrava como livres
--    horários já pedidos por outros pacientes (o servidor recusava só depois
--    do clique). Esta função devolve só início e duração dos horários que
--    seguram a agenda do psicólogo, sem nada sobre o paciente.
-- 2. Dois pedidos ao mesmo tempo para o mesmo horário passavam os dois pela
--    checagem da edge function antes de qualquer um gravar. Agora o banco
--    recusa a sobreposição, com uma trava por psicólogo.
-- 3. Cancelar um pedido com "novo horário proposto" era recusado ("já
--    começou") quando o horário original passava, mesmo com o novo horário
--    ainda à frente.

-- ===========================================================================
-- 1. Horários ocupados de um psicólogo (para montar os horários livres)
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.get_psychologist_busy_times(
  p_psychologist_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
RETURNS TABLE (starts_at timestamptz, duration_minutes integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT a.scheduled_at, COALESCE(a.duration, 50)
  FROM public.appointments a
  WHERE auth.uid() IS NOT NULL
    AND p_to - p_from <= interval '3 days'
    AND a.psychologist_id = p_psychologist_id
    AND a.status IN ('pending', 'scheduled', 'confirmed', 'in_progress')
    AND a.scheduled_at BETWEEN p_from AND p_to
  UNION ALL
  -- Horário proposto pelo psicólogo e ainda sem resposta do paciente.
  SELECT a.proposed_scheduled_at, COALESCE(a.duration, 50)
  FROM public.appointments a
  WHERE auth.uid() IS NOT NULL
    AND p_to - p_from <= interval '3 days'
    AND a.psychologist_id = p_psychologist_id
    AND a.status = 'reschedule_proposed'
    AND a.proposed_scheduled_at BETWEEN p_from AND p_to;
$$;
REVOKE ALL ON FUNCTION public.get_psychologist_busy_times(uuid, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_psychologist_busy_times(uuid, timestamptz, timestamptz) TO authenticated;

-- ===========================================================================
-- 2. Nunca duas consultas sobrepostas para o mesmo psicólogo
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.prevent_appointment_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_holding text[] := ARRAY['pending', 'scheduled', 'confirmed', 'in_progress'];
BEGIN
  IF NEW.appointment_type IS DISTINCT FROM 'regular' OR NOT (NEW.status = ANY (v_holding)) THEN
    RETURN NEW;
  END IF;
  -- Já segurava este mesmo horário (ex.: pendente → confirmada): nada muda.
  IF TG_OP = 'UPDATE'
     AND OLD.status = ANY (v_holding)
     AND NEW.scheduled_at = OLD.scheduled_at
     AND NEW.psychologist_id = OLD.psychologist_id
     AND COALESCE(NEW.duration, 50) = COALESCE(OLD.duration, 50) THEN
    RETURN NEW;
  END IF;

  -- Um pedido de cada vez por psicólogo, até o fim da transação.
  PERFORM pg_advisory_xact_lock(hashtext('appointment_slot:' || NEW.psychologist_id::text));

  IF EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.psychologist_id = NEW.psychologist_id
      AND a.id <> NEW.id
      AND a.appointment_type = 'regular'
      AND a.status = ANY (v_holding)
      AND a.scheduled_at < NEW.scheduled_at + make_interval(mins => COALESCE(NEW.duration, 50))
      AND NEW.scheduled_at < a.scheduled_at + make_interval(mins => COALESCE(a.duration, 50))
  ) THEN
    RAISE EXCEPTION 'Este horário já está ocupado. Escolha outro horário disponível.' USING ERRCODE = '23P01';
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.prevent_appointment_overlap() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS prevent_appointment_overlap ON public.appointments;
CREATE TRIGGER prevent_appointment_overlap
  BEFORE INSERT OR UPDATE OF status, scheduled_at, psychologist_id, duration ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_appointment_overlap();

-- ===========================================================================
-- 3. Cancelar: com novo horário proposto, vale o horário proposto
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.cancel_appointment(p_appointment_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  a public.appointments%ROWTYPE;
  v_by_patient boolean;
  v_refund boolean;
  v_other uuid;
  v_name text;
  v_starts_at timestamptz;
  v_reason text := NULLIF(left(btrim(COALESCE(p_reason, '')), 500), '');
BEGIN
  SELECT * INTO a FROM public.appointments WHERE id = p_appointment_id FOR UPDATE;
  IF NOT FOUND OR v_uid IS NULL OR (a.patient_id <> v_uid AND a.psychologist_id <> v_uid) THEN
    RAISE EXCEPTION 'Consulta não encontrada' USING ERRCODE = '42501';
  END IF;

  IF a.status NOT IN ('pending', 'scheduled', 'confirmed', 'reschedule_proposed') THEN
    RAISE EXCEPTION 'Esta consulta não pode mais ser cancelada' USING ERRCODE = 'P0001';
  END IF;

  -- Com novo horário proposto, a consulta (se aceita) acontece no horário
  -- proposto: é ele que diz se ainda dá para cancelar.
  v_starts_at := CASE
    WHEN a.status = 'reschedule_proposed' AND a.proposed_scheduled_at IS NOT NULL THEN a.proposed_scheduled_at
    ELSE a.scheduled_at
  END;
  IF v_starts_at <= now() THEN
    RAISE EXCEPTION 'A consulta já começou e não pode mais ser cancelada' USING ERRCODE = 'P0001';
  END IF;

  v_by_patient := a.patient_id = v_uid;
  v_refund := NOT v_by_patient
    OR a.status IN ('pending', 'reschedule_proposed')
    OR a.scheduled_at - now() >= interval '24 hours';

  UPDATE public.appointments
  SET status = 'cancelled',
      cancelled_at = now(),
      cancelled_by = v_uid,
      cancellation_reason = v_reason
  WHERE id = a.id;

  IF v_refund AND a.appointment_type = 'regular' THEN
    PERFORM public.release_appointment_quota(a.id);
  END IF;

  v_other := CASE WHEN v_by_patient THEN a.psychologist_id ELSE a.patient_id END;
  SELECT full_name INTO v_name FROM public.profiles WHERE user_id = v_uid;
  INSERT INTO public.notifications (patient_id, appointment_id, title, message, status, push, link)
  VALUES (
    v_other,
    a.id,
    'Consulta cancelada',
    COALESCE(v_name, CASE WHEN v_by_patient THEN 'O paciente' ELSE 'O psicólogo' END)
      || ' cancelou a consulta de ' || public.format_br_datetime(v_starts_at) || '.'
      || CASE WHEN v_reason IS NOT NULL THEN ' Motivo: ' || rtrim(v_reason, '.') || '.' ELSE '' END
      || CASE WHEN NOT v_by_patient AND a.appointment_type = 'regular' THEN ' Sua consulta do mês foi devolvida: você pode agendar outro horário.' ELSE '' END,
    'unread',
    true,
    CASE WHEN v_by_patient THEN '/psicologo/consultas' ELSE '/appointments' END
  );

  RETURN jsonb_build_object('cancelled', true, 'refunded', v_refund AND a.appointment_type = 'regular');
END;
$$;
REVOKE ALL ON FUNCTION public.cancel_appointment(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_appointment(uuid, text) TO authenticated;
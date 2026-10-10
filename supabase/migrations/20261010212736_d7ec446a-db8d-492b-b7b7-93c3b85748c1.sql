-- Agenda do psicólogo: regras no servidor (varredura de funcionamento).

-- Consultas que caem num período (datas no horário de Brasília).
CREATE OR REPLACE FUNCTION public.vacation_conflicts(p_start date, p_end date)
RETURNS TABLE(id uuid, starts_at timestamptz, status text, patient_name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT a.id,
         CASE WHEN a.status = 'reschedule_proposed' AND a.proposed_scheduled_at IS NOT NULL
              THEN a.proposed_scheduled_at ELSE a.scheduled_at END AS starts_at,
         a.status,
         p.full_name
  FROM public.appointments a
  LEFT JOIN public.profiles p ON p.user_id = a.patient_id
  WHERE auth.uid() IS NOT NULL
    AND a.psychologist_id = auth.uid()
    AND a.status IN ('pending', 'scheduled', 'confirmed', 'reschedule_proposed')
    AND (CASE WHEN a.status = 'reschedule_proposed' AND a.proposed_scheduled_at IS NOT NULL
              THEN a.proposed_scheduled_at ELSE a.scheduled_at END) > now()
    AND ((CASE WHEN a.status = 'reschedule_proposed' AND a.proposed_scheduled_at IS NOT NULL
               THEN a.proposed_scheduled_at ELSE a.scheduled_at END) AT TIME ZONE 'America/Sao_Paulo')::date
        BETWEEN p_start AND p_end
  ORDER BY 2;
$function$;
REVOKE ALL ON FUNCTION public.vacation_conflicts(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vacation_conflicts(date, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_psychologist_vacation(p_start date, p_end date, p_cancel_appointments boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  r record;
  v_cancelled integer := 0;
  v_name text;
BEGIN
  IF v_uid IS NULL OR NOT EXISTS (SELECT 1 FROM public.psychologists WHERE user_id = v_uid) THEN
    RAISE EXCEPTION 'Só psicólogos marcam férias' USING ERRCODE = '42501';
  END IF;
  IF p_start IS NULL OR p_end IS NULL OR p_start > p_end THEN
    RAISE EXCEPTION 'A data de início deve ser antes ou igual à data de término.' USING ERRCODE = '22023';
  END IF;
  IF p_start < v_today THEN
    RAISE EXCEPTION 'A data de início não pode ser no passado.' USING ERRCODE = '22023';
  END IF;
  IF p_end > v_today + 366 THEN
    RAISE EXCEPTION 'As férias podem ser marcadas até um ano à frente.' USING ERRCODE = '22023';
  END IF;

  -- Um período ativo ou futuro por vez: o novo substitui o anterior.
  DELETE FROM public.psychologist_vacations WHERE psychologist_id = v_uid AND end_date >= v_today;
  INSERT INTO public.psychologist_vacations (psychologist_id, start_date, end_date) VALUES (v_uid, p_start, p_end);

  IF p_cancel_appointments THEN
    SELECT full_name INTO v_name FROM public.profiles WHERE user_id = v_uid;
    FOR r IN
      SELECT a.*
      FROM public.appointments a
      JOIN public.vacation_conflicts(p_start, p_end) c ON c.id = a.id
      FOR UPDATE OF a
    LOOP
      UPDATE public.appointments
      SET status = 'cancelled', cancelled_at = now(), cancelled_by = v_uid,
          cancellation_reason = 'Psicólogo de férias'
      WHERE id = r.id;
      IF r.appointment_type = 'regular' THEN
        PERFORM public.release_appointment_quota(r.id);
      END IF;
      INSERT INTO public.notifications (patient_id, appointment_id, title, message, status, push, link)
      VALUES (
        r.patient_id, r.id, 'Consulta cancelada',
        COALESCE(v_name, 'O psicólogo') || ' estará de férias e cancelou a consulta de '
          || public.format_br_datetime(CASE WHEN r.status = 'reschedule_proposed' AND r.proposed_scheduled_at IS NOT NULL
                                            THEN r.proposed_scheduled_at ELSE r.scheduled_at END)
          || '. Sua consulta do mês foi devolvida: você pode agendar com outro psicólogo ou em outra data.',
        'unread', true, '/appointments'
      );
      v_cancelled := v_cancelled + 1;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('cancelled', v_cancelled);
END;
$function$;
REVOKE ALL ON FUNCTION public.set_psychologist_vacation(date, date, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_psychologist_vacation(date, date, boolean) TO authenticated;

-- Bloqueio por cima de consulta marcada: recusado.
CREATE OR REPLACE FUNCTION public.guard_override_block()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_from timestamptz;
  v_to timestamptz;
BEGIN
  IF NEW.type <> 'bloqueio' THEN
    RETURN NEW;
  END IF;
  v_from := (NEW.date + NEW.start_time) AT TIME ZONE 'America/Sao_Paulo';
  v_to := (NEW.date + NEW.end_time) AT TIME ZONE 'America/Sao_Paulo';
  IF EXISTS (
    SELECT 1 FROM public.appointments a
    CROSS JOIN LATERAL (
      SELECT CASE WHEN a.status = 'reschedule_proposed' THEN a.proposed_scheduled_at ELSE a.scheduled_at END AS held_at
    ) h
    WHERE a.psychologist_id = NEW.psychologist_id
      AND a.status IN ('pending', 'scheduled', 'confirmed', 'in_progress', 'reschedule_proposed')
      AND h.held_at IS NOT NULL
      AND h.held_at < v_to
      AND v_from < h.held_at + make_interval(mins => COALESCE(a.duration, 50))
  ) THEN
    RAISE EXCEPTION 'Esse horário tem consulta marcada e não pode ser bloqueado. Cancele ou remarque a consulta antes.' USING ERRCODE = '23P01';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.guard_override_block() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_override_block ON public.psychologist_availability_overrides;
CREATE TRIGGER guard_override_block
  BEFORE INSERT OR UPDATE ON public.psychologist_availability_overrides
  FOR EACH ROW EXECUTE FUNCTION public.guard_override_block();

-- Leitura só para quem está logado.
DROP POLICY IF EXISTS "Everyone can view psychologist availability" ON public.psychologist_availability;
CREATE POLICY "Everyone can view psychologist availability" ON public.psychologist_availability
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Everyone can view availability overrides" ON public.psychologist_availability_overrides;
CREATE POLICY "Everyone can view availability overrides" ON public.psychologist_availability_overrides
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Everyone can view vacations" ON public.psychologist_vacations;
CREATE POLICY "Everyone can view vacations" ON public.psychologist_vacations
  FOR SELECT TO authenticated USING (true);
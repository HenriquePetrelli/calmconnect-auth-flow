-- lovable-cron-fallback-reviewed: time-based closing 30 min after appointment end; repo migration applied verbatim
-- Consultas: fechar as que ficaram "em aberto" e proteger a sala de vídeo.
--
-- 1. Se alguém fecha o app sem encerrar a chamada, a consulta ficava
--    "Em andamento" para sempre; se ninguém entrava, "Confirmada" para
--    sempre. O repasse do psicólogo só conta consultas concluídas, então a
--    consulta que aconteceu e travou nunca era paga. Agora, 30 min depois do
--    fim previsto: se a chamada chegou a conectar os dois lados (a sessão de
--    vídeo tem `answer`), vira "concluída"; senão, "não realizada"
--    (no_show) e a consulta do mês volta para o paciente.
-- 2. A sala de vídeo podia ser aberta para qualquer consulta, a qualquer
--    hora (cancelada, recusada, dias antes). Agora só para consulta
--    confirmada/em andamento, de 10 min antes do início até 15 min depois do
--    fim (mesma janela do app).

ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('pending', 'scheduled', 'confirmed', 'declined', 'cancelled', 'completed', 'reschedule_proposed', 'in_progress', 'no_show'));

CREATE OR REPLACE FUNCTION public.get_or_create_appointment_webrtc_session(p_appointment_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_appointment record;
  v_room_id uuid;
BEGIN
  SELECT id, patient_id, psychologist_id, video_room_id, status, scheduled_at, COALESCE(duration, 50) AS duration
  INTO v_appointment
  FROM public.appointments
  WHERE id = p_appointment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Consulta não encontrada';
  END IF;

  IF auth.uid() NOT IN (v_appointment.patient_id, v_appointment.psychologist_id) THEN
    RAISE EXCEPTION 'Acesso negado a esta consulta';
  END IF;

  IF v_appointment.status NOT IN ('scheduled', 'confirmed', 'in_progress') THEN
    RAISE EXCEPTION 'Esta consulta não está mais disponível para chamada';
  END IF;

  IF now() < v_appointment.scheduled_at - interval '10 minutes'
     OR now() > v_appointment.scheduled_at + make_interval(mins => v_appointment.duration + 15) THEN
    RAISE EXCEPTION 'A sala da consulta abre 10 minutos antes do horário';
  END IF;

  IF v_appointment.video_room_id IS NOT NULL THEN
    RETURN v_appointment.video_room_id;
  END IF;

  INSERT INTO public.webrtc_sessions (patient_id, psychologist_id, status, expires_at)
  VALUES (v_appointment.patient_id, v_appointment.psychologist_id, 'pending', now() + interval '24 hours')
  RETURNING id INTO v_room_id;

  UPDATE public.appointments
  SET video_room_id = v_room_id
  WHERE id = p_appointment_id;

  RETURN v_room_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_appointment_webrtc_session(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_appointment_webrtc_session(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.finalize_stale_appointments()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r record;
  v_count integer := 0;
  v_connected boolean;
BEGIN
  FOR r IN
    SELECT a.*
    FROM public.appointments a
    WHERE a.status IN ('scheduled', 'confirmed', 'in_progress')
      AND a.scheduled_at + make_interval(mins => COALESCE(a.duration, 50) + 30) < now()
    FOR UPDATE SKIP LOCKED
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM public.webrtc_sessions s
      WHERE r.video_room_id IS NOT NULL
        AND s.id::text = r.video_room_id
        AND s.answer IS NOT NULL
    ) INTO v_connected;

    IF v_connected THEN
      UPDATE public.appointments SET status = 'completed' WHERE id = r.id;
    ELSE
      UPDATE public.appointments SET status = 'no_show' WHERE id = r.id;
      IF r.appointment_type = 'regular' THEN
        UPDATE public.subscribers SET appointments_used_this_month = false WHERE user_id = r.patient_id;
      END IF;
      INSERT INTO public.notifications (patient_id, appointment_id, title, message, status, push, link)
      VALUES
        (r.patient_id, r.id, 'Consulta não realizada',
         'A consulta de ' || public.format_br_datetime(r.scheduled_at) || ' não aconteceu (a chamada não chegou a conectar). Sua consulta do mês foi devolvida: você pode agendar outro horário.',
         'unread', true, '/appointments'),
        (r.psychologist_id, r.id, 'Consulta não realizada',
         'A consulta de ' || public.format_br_datetime(r.scheduled_at) || ' não aconteceu (a chamada não chegou a conectar).',
         'unread', true, '/psychologist-dashboard');
    END IF;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_stale_appointments() FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'finalize-stale-appointments';
SELECT cron.schedule('finalize-stale-appointments', '*/10 * * * *', $cron$SELECT public.finalize_stale_appointments();$cron$);
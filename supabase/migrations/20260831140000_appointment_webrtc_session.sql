-- Scheduled-appointment video calls never actually connected patient and
-- psychologist: ConsultationVideoCall.tsx inserted a brand new
-- webrtc_sessions row on every mount, with nothing tying it back to the
-- appointment, so each side ended up signaling on its own disconnected
-- session. This mirrors the pairing already used by the SOS flow
-- (emergency_requests.video_room_id -> webrtc_sessions), reusing the
-- appointments.video_room_id column that already existed but was never
-- read or written.

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
  SELECT id, patient_id, psychologist_id, video_room_id
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

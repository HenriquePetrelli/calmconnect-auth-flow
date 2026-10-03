-- Avaliação da consulta agendada.
--
-- A consulta agendada usa a mesma sala de vídeo (webrtc_sessions) do SOS, e o
-- fim da chamada já abria a avaliação, que vai para session_feedback e entra
-- na média do psicólogo (trigger session_feedback_recalc_rating). Faltava:
-- 1. Só quem participou da sessão pode avaliá-la. Antes a regra conferia só
--    que a pessoa avaliava em nome dela mesma: qualquer usuário podia gravar
--    nota para uma sessão alheia e mexer na média de qualquer psicólogo.
-- 2. Vincular a avaliação à consulta (appointment_id) e ao psicólogo
--    (psychologist_id); antes só o SOS preenchia o psicólogo.

ALTER TABLE public.session_feedback
  ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_session_feedback_appointment ON public.session_feedback (appointment_id);

CREATE OR REPLACE FUNCTION public.prepare_session_feedback()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  s public.webrtc_sessions%ROWTYPE;
BEGIN
  SELECT * INTO s FROM public.webrtc_sessions WHERE id = NEW.session_id;

  -- Chamadas do app (com usuário logado): só participantes da sessão, cada
  -- um no próprio papel.
  IF auth.uid() IS NOT NULL THEN
    IF NOT FOUND
       OR NEW.user_id IS DISTINCT FROM auth.uid()
       OR NOT (
         (NEW.user_type = 'patient' AND s.patient_id = auth.uid())
         OR (NEW.user_type = 'psychologist' AND s.psychologist_id = auth.uid())
       ) THEN
      RAISE EXCEPTION 'Você só pode avaliar atendimentos dos quais participou' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF FOUND THEN
    NEW.psychologist_id := COALESCE(NEW.psychologist_id, s.psychologist_id);
    NEW.emergency_request_id := COALESCE(NEW.emergency_request_id, s.emergency_request_id);
  END IF;

  IF NEW.appointment_id IS NULL THEN
    SELECT a.id INTO NEW.appointment_id
    FROM public.appointments a
    WHERE a.video_room_id = NEW.session_id::text
    LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_session_feedback() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS prepare_session_feedback ON public.session_feedback;
CREATE TRIGGER prepare_session_feedback
  BEFORE INSERT ON public.session_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.prepare_session_feedback();

-- Avaliações que já existem: preenche consulta e psicólogo.
UPDATE public.session_feedback f
SET appointment_id = a.id
FROM public.appointments a
WHERE f.appointment_id IS NULL
  AND a.video_room_id = f.session_id::text;

UPDATE public.session_feedback f
SET psychologist_id = s.psychologist_id
FROM public.webrtc_sessions s
WHERE f.psychologist_id IS NULL
  AND s.id = f.session_id;
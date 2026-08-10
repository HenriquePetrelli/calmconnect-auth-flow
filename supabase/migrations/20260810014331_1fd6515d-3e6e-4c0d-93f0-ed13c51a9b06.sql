CREATE OR REPLACE FUNCTION public.protect_emergency_request_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Service role / server-side jobs bypass this guard.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Patient-owned updates may never rewrite attendance-owned data.
  IF auth.uid() = OLD.patient_id AND auth.uid() IS DISTINCT FROM OLD.accepted_by THEN
    NEW.patient_id      := OLD.patient_id;
    NEW.accepted_by     := OLD.accepted_by;
    NEW.accepted_at     := OLD.accepted_at;
    NEW.crisis_resolved := OLD.crisis_resolved;
    NEW.end_notes       := OLD.end_notes;
    NEW.video_room_id   := OLD.video_room_id;
    NEW.room_url        := OLD.room_url;
    NEW.patient_details := OLD.patient_details;
  END IF;

  -- Nobody may re-assign an already accepted request to another psychologist.
  IF OLD.accepted_by IS NOT NULL AND NEW.accepted_by IS DISTINCT FROM OLD.accepted_by THEN
    NEW.accepted_by := OLD.accepted_by;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_emergency_request_columns ON public.emergency_requests;
CREATE TRIGGER protect_emergency_request_columns
  BEFORE UPDATE ON public.emergency_requests
  FOR EACH ROW EXECUTE FUNCTION public.protect_emergency_request_columns();
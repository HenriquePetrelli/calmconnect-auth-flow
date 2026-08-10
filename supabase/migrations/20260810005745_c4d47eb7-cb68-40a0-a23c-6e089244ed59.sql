-- 1. One video room per emergency request
CREATE UNIQUE INDEX IF NOT EXISTS webrtc_sessions_emergency_request_unique
  ON public.webrtc_sessions (emergency_request_id)
  WHERE emergency_request_id IS NOT NULL;

-- 2. Allow 'partially'
ALTER TABLE public.session_feedback DROP CONSTRAINT IF EXISTS session_feedback_problem_resolved_check;
ALTER TABLE public.session_feedback
  ADD CONSTRAINT session_feedback_problem_resolved_check
  CHECK (problem_resolved IS NULL OR problem_resolved = ANY (ARRAY['yes','no','partially']));

-- 3. Link feedback to the emergency request
ALTER TABLE public.session_feedback ADD COLUMN IF NOT EXISTS emergency_request_id uuid;
CREATE INDEX IF NOT EXISTS idx_session_feedback_emergency_request
  ON public.session_feedback (emergency_request_id);

UPDATE public.session_feedback f
SET emergency_request_id = s.emergency_request_id
FROM public.webrtc_sessions s
WHERE f.session_id = s.id
  AND f.emergency_request_id IS NULL
  AND s.emergency_request_id IS NOT NULL;

-- 4. Server-side average rating recalculation
CREATE OR REPLACE FUNCTION public.recalc_psychologist_rating_from_feedback()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_psychologist uuid;
  new_avg numeric;
BEGIN
  IF COALESCE(NEW.user_type, '') <> 'patient' OR NEW.rating IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT s.psychologist_id INTO target_psychologist
  FROM public.webrtc_sessions s
  WHERE s.id = NEW.session_id;

  IF target_psychologist IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT ROUND(AVG(f.rating)::numeric, 2) INTO new_avg
  FROM public.session_feedback f
  JOIN public.webrtc_sessions s2 ON s2.id = f.session_id
  WHERE s2.psychologist_id = target_psychologist
    AND f.user_type = 'patient'
    AND f.rating IS NOT NULL;

  UPDATE public.psychologists
  SET average_rating = COALESCE(new_avg, 0)
  WHERE user_id = target_psychologist;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS session_feedback_recalc_rating ON public.session_feedback;
CREATE TRIGGER session_feedback_recalc_rating
AFTER INSERT OR UPDATE OF rating, user_type ON public.session_feedback
FOR EACH ROW EXECUTE FUNCTION public.recalc_psychologist_rating_from_feedback();
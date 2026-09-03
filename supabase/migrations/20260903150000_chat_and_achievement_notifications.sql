-- Two notification types the Notifications screen already has icon-matching
-- logic for ("mensagem"/"chat"/"conversa" and "conquista"/"meta") were never
-- actually produced anywhere — nothing ever inserted them. Both are added
-- here as triggers (not client-side inserts) so they fire regardless of
-- which code path creates the message/unlocks the achievement, and so they
-- work under the tightened notifications INSERT policy (patient_id must
-- equal the inserting user — a chat notification's recipient is the OTHER
-- party, so it can only be created by something that bypasses RLS, i.e. a
-- SECURITY DEFINER trigger, same as the rest of the notification writers).
--
-- Message content is never referenced here, by design — only the sender's
-- name — consistent with the chat admin moderation's metadata-only rule.

CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_paciente_id uuid;
  v_psicologo_id uuid;
  v_recipient_id uuid;
  v_sender_name text;
BEGIN
  SELECT paciente_id, psicologo_id INTO v_paciente_id, v_psicologo_id
  FROM public.conversas
  WHERE id = NEW.conversa_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_recipient_id := CASE WHEN NEW.autor_id = v_paciente_id THEN v_psicologo_id ELSE v_paciente_id END;
  IF v_recipient_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO v_sender_name FROM public.profiles WHERE user_id = NEW.autor_id;

  INSERT INTO public.notifications (patient_id, title, message)
  VALUES (
    v_recipient_id,
    'Nova mensagem',
    'Você recebeu uma nova mensagem de ' || COALESCE(v_sender_name, 'alguém') || ' no chat.'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_new_message_trigger ON public.mensagens;
CREATE TRIGGER notify_new_message_trigger
  AFTER INSERT ON public.mensagens
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_message();

CREATE OR REPLACE FUNCTION public.notify_achievement_unlocked()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.achieved = true AND (OLD.achieved IS DISTINCT FROM true) THEN
    INSERT INTO public.notifications (patient_id, title, message)
    VALUES (
      NEW.user_id,
      'Nova conquista desbloqueada!',
      'Você desbloqueou a conquista "' || NEW.title || '". Continue assim!'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_achievement_unlocked_trigger ON public.patient_achievements;
CREATE TRIGGER notify_achievement_unlocked_trigger
  AFTER UPDATE ON public.patient_achievements
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_achievement_unlocked();

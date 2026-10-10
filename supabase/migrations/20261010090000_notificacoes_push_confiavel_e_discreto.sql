-- Notificações: push que não se perde, texto discreto na tela bloqueada,
-- avisos que só o servidor cria e limpeza dos antigos.

-- 1. Só o servidor cria avisos. Nenhuma tela do app cria notificação; a
--    regra antiga deixava a própria pessoa criar avisos para si com push e
--    texto à escolha (que saíam pelo Firebase com o nome do app).
DROP POLICY IF EXISTS "Users can create their own notifications" ON public.notifications;

-- 2. Pelo app, só dá para marcar como lida/não lida (o resto é do servidor:
--    texto, destino, push). Antes dava para reabrir o push de um aviso antigo.
CREATE OR REPLACE FUNCTION public.guard_notification_client_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;
  IF NEW.status NOT IN ('read', 'unread') THEN
    NEW.status := OLD.status;
  END IF;
  NEW.id := OLD.id;
  NEW.patient_id := OLD.patient_id;
  NEW.appointment_id := OLD.appointment_id;
  NEW.title := OLD.title;
  NEW.message := OLD.message;
  NEW.link := OLD.link;
  NEW.push := OLD.push;
  NEW.push_sent_at := OLD.push_sent_at;
  NEW.push_text := OLD.push_text;
  NEW.push_attempts := OLD.push_attempts;
  NEW.push_claimed_at := OLD.push_claimed_at;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$function$;

-- 3. Push com nova tentativa: antes o aviso era marcado como enviado ANTES
--    de ir ao Firebase; se o Firebase falhasse naquele minuto, o push sumia.
--    Agora ele é "reservado" por 5 min, confirmado quando sai e devolvido à
--    fila quando falha (até 3 tentativas, dentro da primeira hora).
--    push_text: texto discreto para a tela bloqueada (o aviso no app continua
--    com o texto completo).
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS push_text text,
  ADD COLUMN IF NOT EXISTS push_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS push_claimed_at timestamptz;

CREATE OR REPLACE TRIGGER a_guard_notification_client_update
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.guard_notification_client_update();

-- Tela bloqueada não revela conversa com psicólogo nem crise: o push da
-- mensagem não diz quem mandou e o acompanhamento do SOS não fala do SOS.
CREATE OR REPLACE FUNCTION public.set_notification_push_text()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.push AND NEW.push_text IS NULL THEN
    IF NEW.link LIKE '/chat%' THEN
      NEW.push_text := 'Você tem uma nova mensagem. Toque para abrir.';
    ELSIF NEW.title = 'Como você está hoje?' THEN
      NEW.push_text := 'Que tal registrar como você está hoje?';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE TRIGGER set_notification_push_text
  BEFORE INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_notification_push_text();

DROP FUNCTION IF EXISTS public.claim_pending_pushes();
CREATE FUNCTION public.claim_pending_pushes()
RETURNS TABLE (id uuid, user_id uuid, title text, message text, link text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  UPDATE public.notifications n
  SET push_claimed_at = now(),
      push_attempts = n.push_attempts + 1
  WHERE n.id IN (
    SELECT p.id FROM public.notifications p
    WHERE p.push AND p.push_sent_at IS NULL
      AND p.created_at > now() - interval '1 hour'
      AND p.push_attempts < 3
      AND (p.push_claimed_at IS NULL OR p.push_claimed_at < now() - interval '5 minutes')
    ORDER BY p.created_at
    LIMIT 500
    FOR UPDATE SKIP LOCKED
  )
  RETURNING n.id, n.patient_id, n.title, COALESCE(n.push_text, n.message), n.link;
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_pending_pushes() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_pending_pushes() TO service_role;

-- Resultado do envio: os que saíram ficam como enviados; os que falharam
-- voltam para a fila na hora (a próxima rodada, em 1 minuto, tenta de novo).
CREATE OR REPLACE FUNCTION public.finish_pushes(p_sent uuid[], p_failed uuid[])
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  UPDATE public.notifications SET push_sent_at = now()
  WHERE id = ANY (COALESCE(p_sent, '{}'::uuid[])) AND push_sent_at IS NULL;
  UPDATE public.notifications SET push_claimed_at = NULL
  WHERE id = ANY (COALESCE(p_failed, '{}'::uuid[])) AND push_sent_at IS NULL;
$function$;

REVOKE ALL ON FUNCTION public.finish_pushes(uuid[], uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finish_pushes(uuid[], uuid[]) TO service_role;

-- 4. Lista do sino: por pessoa, das mais novas para as mais antigas.
CREATE INDEX IF NOT EXISTS notifications_patient_created_idx
  ON public.notifications (patient_id, created_at DESC);

-- 5. Limpeza diária: avisos lidos com mais de 90 dias e qualquer aviso com
--    mais de 180 dias; registros técnicos de envio com mais de 30 dias.
CREATE OR REPLACE FUNCTION public.purge_old_notifications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM public.notifications
  WHERE (status = 'read' AND created_at < now() - interval '90 days')
     OR created_at < now() - interval '180 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  DELETE FROM public.notification_logs WHERE created_at < now() - interval '30 days';
  RETURN v_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.purge_old_notifications() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'purge-old-notifications';
  PERFORM cron.schedule('purge-old-notifications', '50 4 * * *', 'SELECT public.purge_old_notifications();');
END;
$$;

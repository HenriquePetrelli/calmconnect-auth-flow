-- Chat: o aviso de mensagem nova abre a conversa certa, e as fotos das
-- conversas apagadas (rotina dos 3 meses) também somem do armazenamento.

-- 1. Aviso de mensagem nova com o link da conversa (antes abria só a lista).
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_paciente_id uuid;
  v_psicologo_id uuid;
  v_recipient_id uuid;
  v_sender_name text;
  v_message text;
  v_link text := '/chat?c=' || NEW.conversa_id::text;
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
  v_message := 'Você recebeu uma nova mensagem de ' || COALESCE(v_sender_name, 'alguém') || ' no chat.';

  -- Um aviso por conversa a cada 30 minutos (não um por mensagem).
  IF EXISTS (
    SELECT 1 FROM public.notifications
    WHERE patient_id = v_recipient_id
      AND title = 'Nova mensagem'
      AND (link = v_link OR (link = '/chat' AND message = v_message))
      AND status = 'unread'
      AND created_at > now() - interval '30 minutes'
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (patient_id, title, message, status, push, link)
  VALUES (v_recipient_id, 'Nova mensagem', v_message, 'unread', true, v_link);

  RETURN NEW;
END;
$function$;

-- 2. Rotina diária: apaga do armazenamento as fotos das conversas que a
--    rotina dos 3 meses já apagou (o banco não apaga arquivos sozinho; a
--    política de privacidade promete que as mensagens somem após 3 meses).
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.unschedule('chat-photos-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'chat-photos-cleanup');

SELECT cron.schedule(
  'chat-photos-cleanup',
  '40 4 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://ihrrgmmsfuvlasmzdmwf.supabase.co/functions/v1/chat-cleanup',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlocnJnbW1zZnV2bGFzbXpkbXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1NDMzMDcsImV4cCI6MjA2OTExOTMwN30.6hRDCL5alu-Bs4kT4jKYJW3G3zmeBJDZB5udruQzOFU"}'::jsonb
      || jsonb_build_object('x-cron-secret', public.internal_cron_secret()),
    body := '{}'::jsonb
  );
  $cron$
);

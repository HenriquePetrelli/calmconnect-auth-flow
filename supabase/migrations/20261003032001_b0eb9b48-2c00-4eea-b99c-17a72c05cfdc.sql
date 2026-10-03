-- lovable-cron-fallback-reviewed: lembretes de consulta (a cada 10 min) dependem do relógio ("falta 1h") e pushes (a cada 1 min) precisam sair quase em tempo real; não há gatilho por evento que cubra a janela de 1h, e realtime não dispara envio FCM no servidor.
-- Consultas e chat: correções de segurança, cancelamento, lembretes, push e
-- contador de não lidas. Comparado com apps de referência (Zenklub, Vittude,
-- Psicologia Viva, Doctoralia): cancelar com antecedência, lembrete antes da
-- consulta, push de mensagem e de mudança na consulta e chat aberto enquanto
-- o tratamento continua são o padrão.

-- ===========================================================================
-- 1. CONSULTAS: o cliente não pode mais criar/alterar consultas direto no banco
-- ===========================================================================
-- Antes, as policies deixavam o paciente inserir consultas (pulando a cota do
-- Premium, a checagem de conflito e a agenda do psicólogo, que ficam na edge
-- function `appointments`) e atualizar qualquer coluna das próprias consultas
-- (ex.: status = 'scheduled', confirmando sozinho; trocar o psicólogo ou o
-- horário). O psicólogo também podia mudar qualquer coluna (inclusive o
-- paciente). Agora: criar só pela edge function; pelo cliente, só as
-- transições da chamada de vídeo (entrar e encerrar).

DROP POLICY IF EXISTS "Patients can create appointments" ON public.appointments;

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid,
  ADD COLUMN IF NOT EXISTS cancellation_reason text;

CREATE OR REPLACE FUNCTION public.guard_appointment_client_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_duration integer := COALESCE(NEW.duration, 50);
BEGIN
  -- Edge functions (service_role), cron e funções SECURITY DEFINER (dono
  -- postgres) seguem livres; a regra vale só para chamadas diretas do app.
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  IF NEW.patient_id IS DISTINCT FROM OLD.patient_id
     OR NEW.psychologist_id IS DISTINCT FROM OLD.psychologist_id
     OR NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at
     OR NEW.duration IS DISTINCT FROM OLD.duration
     OR NEW.appointment_type IS DISTINCT FROM OLD.appointment_type
     OR NEW.notes IS DISTINCT FROM OLD.notes
     OR NEW.session_summary IS DISTINCT FROM OLD.session_summary
     OR NEW.proposed_scheduled_at IS DISTINCT FROM OLD.proposed_scheduled_at
     OR NEW.proposal_notes IS DISTINCT FROM OLD.proposal_notes
     OR NEW.video_room_id IS DISTINCT FROM OLD.video_room_id
     OR NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at
     OR NEW.cancelled_by IS DISTINCT FROM OLD.cancelled_by
     OR NEW.cancellation_reason IS DISTINCT FROM OLD.cancellation_reason
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Alteração não permitida nesta consulta' USING ERRCODE = '42501';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- Entrar na chamada: só de consulta confirmada e dentro da janela
    -- (10 min antes do início até 15 min depois do fim).
    IF OLD.status IN ('scheduled', 'confirmed') AND NEW.status = 'in_progress' THEN
      IF now() < OLD.scheduled_at - interval '10 minutes'
         OR now() > OLD.scheduled_at + make_interval(mins => v_duration + 15) THEN
        RAISE EXCEPTION 'A sala da consulta ainda não está aberta' USING ERRCODE = '42501';
      END IF;
    -- Encerrar a chamada.
    ELSIF OLD.status = 'in_progress' AND NEW.status = 'completed' THEN
      NULL;
    ELSE
      RAISE EXCEPTION 'Mudança de status não permitida (% → %)', OLD.status, NEW.status USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_appointment_client_update ON public.appointments;
CREATE TRIGGER guard_appointment_client_update
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_appointment_client_update();

-- ===========================================================================
-- 2. NOTIFICAÇÕES: push e link
-- ===========================================================================
-- `push` marca as notificações que também vão para o celular (consultas e
-- chat); a edge function `notification-push` pega as pendentes a cada minuto.
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS push boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS push_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS link text;

CREATE INDEX IF NOT EXISTS notifications_push_pending_idx
  ON public.notifications (created_at)
  WHERE push AND push_sent_at IS NULL;

CREATE OR REPLACE FUNCTION public.claim_pending_pushes()
RETURNS TABLE (id uuid, user_id uuid, title text, message text, link text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.notifications n
  SET push_sent_at = now()
  WHERE n.id IN (
    SELECT p.id FROM public.notifications p
    WHERE p.push AND p.push_sent_at IS NULL
      AND p.created_at > now() - interval '1 hour'
    ORDER BY p.created_at
    LIMIT 500
    FOR UPDATE SKIP LOCKED
  )
  RETURNING n.id, n.patient_id, n.title, n.message, n.link;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_pending_pushes() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_pending_pushes() TO service_role;

-- Data/hora no horário de Brasília para as mensagens ("12/10 às 14:00").
CREATE OR REPLACE FUNCTION public.format_br_datetime(p_at timestamptz)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT to_char(p_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM "às" HH24:MI');
$$;

-- ===========================================================================
-- 3. NOVA SOLICITAÇÃO: avisa o psicólogo (antes só aparecia se ele abrisse o painel)
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.notify_new_appointment_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_patient_name text;
BEGIN
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;
  SELECT full_name INTO v_patient_name FROM public.profiles WHERE user_id = NEW.patient_id;
  INSERT INTO public.notifications (patient_id, appointment_id, title, message, status, push, link)
  VALUES (
    NEW.psychologist_id,
    NEW.id,
    'Nova solicitação de consulta',
    COALESCE(v_patient_name, 'Um paciente') || ' pediu uma consulta para ' || public.format_br_datetime(NEW.scheduled_at) || '. Confirme em até 24h.',
    'unread',
    true,
    '/psychologist-dashboard'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_new_appointment_request ON public.appointments;
CREATE TRIGGER notify_new_appointment_request
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_appointment_request();

-- ===========================================================================
-- 4. CANCELAR CONSULTA (paciente ou psicólogo)
-- ===========================================================================
-- Paciente: cancela a qualquer momento antes do início. A consulta do mês
-- volta se o pedido ainda não tinha sido confirmado ou se faltam 24h ou mais
-- (regra comum no mercado). Psicólogo: pode cancelar uma consulta confirmada
-- (imprevisto); a consulta do mês sempre volta para o paciente.
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
  v_reason text := NULLIF(left(btrim(COALESCE(p_reason, '')), 500), '');
BEGIN
  SELECT * INTO a FROM public.appointments WHERE id = p_appointment_id FOR UPDATE;
  IF NOT FOUND OR v_uid IS NULL OR (a.patient_id <> v_uid AND a.psychologist_id <> v_uid) THEN
    RAISE EXCEPTION 'Consulta não encontrada' USING ERRCODE = '42501';
  END IF;

  IF a.status NOT IN ('pending', 'scheduled', 'confirmed', 'reschedule_proposed') THEN
    RAISE EXCEPTION 'Esta consulta não pode mais ser cancelada' USING ERRCODE = 'P0001';
  END IF;
  IF a.scheduled_at <= now() THEN
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
    UPDATE public.subscribers SET appointments_used_this_month = false WHERE user_id = a.patient_id;
  END IF;

  v_other := CASE WHEN v_by_patient THEN a.psychologist_id ELSE a.patient_id END;
  SELECT full_name INTO v_name FROM public.profiles WHERE user_id = v_uid;
  INSERT INTO public.notifications (patient_id, appointment_id, title, message, status, push, link)
  VALUES (
    v_other,
    a.id,
    'Consulta cancelada',
    COALESCE(v_name, CASE WHEN v_by_patient THEN 'O paciente' ELSE 'O psicólogo' END)
      || ' cancelou a consulta de ' || public.format_br_datetime(a.scheduled_at) || '.'
      || CASE WHEN v_reason IS NOT NULL THEN ' Motivo: ' || rtrim(v_reason, '.') || '.' ELSE '' END
      || CASE WHEN NOT v_by_patient AND a.appointment_type = 'regular' THEN ' Sua consulta do mês foi devolvida: você pode agendar outro horário.' ELSE '' END,
    'unread',
    true,
    CASE WHEN v_by_patient THEN '/psychologist-dashboard' ELSE '/appointments' END
  );

  RETURN jsonb_build_object('cancelled', true, 'refunded', v_refund AND a.appointment_type = 'regular');
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_appointment(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_appointment(uuid, text) TO authenticated;

-- ===========================================================================
-- 5. LEMBRETES: 24h e 1h antes (paciente e psicólogo)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.appointment_reminders_sent (
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('24h', '1h')),
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (appointment_id, kind)
);
GRANT ALL ON public.appointment_reminders_sent TO service_role;
ALTER TABLE public.appointment_reminders_sent ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.queue_appointment_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r record;
  v_count integer := 0;
  v_when text;
BEGIN
  FOR r IN
    WITH due AS (
      SELECT a.id, a.patient_id, a.psychologist_id, a.scheduled_at,
             CASE WHEN a.scheduled_at <= now() + interval '1 hour' THEN '1h' ELSE '24h' END AS kind
      FROM public.appointments a
      WHERE a.status IN ('scheduled', 'confirmed')
        AND a.scheduled_at > now()
        AND (
          a.scheduled_at <= now() + interval '1 hour'
          OR a.scheduled_at BETWEEN now() + interval '22 hours' AND now() + interval '24 hours'
        )
    ),
    claimed AS (
      INSERT INTO public.appointment_reminders_sent (appointment_id, kind)
      SELECT id, kind FROM due
      ON CONFLICT DO NOTHING
      RETURNING appointment_id, kind
    )
    SELECT d.*, pp.full_name AS patient_name, ps.full_name AS psychologist_name
    FROM claimed c
    JOIN due d ON d.id = c.appointment_id AND d.kind = c.kind
    LEFT JOIN public.profiles pp ON pp.user_id = d.patient_id
    LEFT JOIN public.profiles ps ON ps.user_id = d.psychologist_id
  LOOP
    v_when := CASE WHEN r.kind = '1h'
      THEN 'às ' || to_char(r.scheduled_at AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI') || ' (daqui a pouco)'
      ELSE CASE WHEN (r.scheduled_at AT TIME ZONE 'America/Sao_Paulo')::date = (now() AT TIME ZONE 'America/Sao_Paulo')::date
                THEN 'hoje' ELSE 'amanhã' END
           || ', ' || public.format_br_datetime(r.scheduled_at) END;

    INSERT INTO public.notifications (patient_id, appointment_id, title, message, status, push, link)
    VALUES
      (r.patient_id, r.id,
       CASE WHEN r.kind = '1h' THEN 'Sua consulta começa em breve' ELSE 'Lembrete de consulta' END,
       'Sua consulta com ' || COALESCE(r.psychologist_name, 'o psicólogo') || ' é ' || v_when || '. A sala abre 10 minutos antes.'
         || CASE WHEN r.kind = '24h' THEN ' Se precisar cancelar, faça isso até 24h antes para não perder a consulta do mês.' ELSE '' END,
       'unread', true, '/appointments'),
      (r.psychologist_id, r.id,
       CASE WHEN r.kind = '1h' THEN 'Consulta em breve' ELSE 'Lembrete de consulta' END,
       'Consulta com ' || COALESCE(r.patient_name, 'paciente') || ' ' || v_when || '.',
       'unread', true, '/psychologist-dashboard');
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.queue_appointment_reminders() FROM PUBLIC, anon, authenticated;

-- ===========================================================================
-- 6. CHAT: regras aplicadas no banco
-- ===========================================================================
-- Antes o paciente podia criar conversa com qualquer psicólogo (a regra
-- pode_criar_conversa existia, mas não era usada), reabrir conversa "somente
-- leitura" e trocar o psicólogo/paciente de uma conversa.
DROP POLICY IF EXISTS "Pacientes podem criar conversas" ON public.conversas;
CREATE POLICY "Pacientes podem criar conversas" ON public.conversas
  FOR INSERT WITH CHECK (
    paciente_id = auth.uid()
    AND status = 'ativa'
    AND public.pode_criar_conversa(auth.uid(), psicologo_id)
  );

CREATE OR REPLACE FUNCTION public.guard_conversa_client_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;
  IF NEW.paciente_id IS DISTINCT FROM OLD.paciente_id
     OR NEW.psicologo_id IS DISTINCT FROM OLD.psicologo_id
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.data_inicio IS DISTINCT FROM OLD.data_inicio
     OR NEW.data_fim IS DISTINCT FROM OLD.data_fim THEN
    RAISE EXCEPTION 'Alteração não permitida nesta conversa' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_conversa_client_update ON public.conversas;
CREATE TRIGGER guard_conversa_client_update
  BEFORE UPDATE ON public.conversas
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_conversa_client_update();

-- Conversa acompanha o tratamento: a cada consulta concluída, a conversa
-- daquele par volta a ficar ativa por mais 30 dias (antes ficava "somente
-- leitura" 1 mês depois de criada, mesmo com consultas toda semana).
CREATE OR REPLACE FUNCTION public.reopen_conversa_on_completed_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    UPDATE public.conversas
    SET status = 'ativa', data_inicio = now(), data_fim = NULL
    WHERE paciente_id = NEW.patient_id AND psicologo_id = NEW.psychologist_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reopen_conversa_on_completed_appointment ON public.appointments;
CREATE TRIGGER reopen_conversa_on_completed_appointment
  AFTER UPDATE OF status ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.reopen_conversa_on_completed_appointment();

-- Nova mensagem: vira push e não repete uma notificação por mensagem (10
-- mensagens seguidas = 1 notificação enquanto a anterior não foi lida).
-- O conteúdo da mensagem continua fora da notificação (privacidade).
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
  v_message text;
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

  IF EXISTS (
    SELECT 1 FROM public.notifications
    WHERE patient_id = v_recipient_id
      AND title = 'Nova mensagem'
      AND message = v_message
      AND status = 'unread'
      AND created_at > now() - interval '30 minutes'
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (patient_id, title, message, status, push, link)
  VALUES (v_recipient_id, 'Nova mensagem', v_message, 'unread', true, '/chat');

  RETURN NEW;
END;
$$;

-- Lista de conversas numa consulta só (antes eram 2 consultas por conversa),
-- com o nome do outro participante, a última mensagem e quantas não lidas.
CREATE OR REPLACE FUNCTION public.listar_conversas()
RETURNS TABLE (
  id uuid,
  paciente_id uuid,
  psicologo_id uuid,
  status text,
  data_inicio timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  outro_nome text,
  ultima_conteudo text,
  ultima_tipo text,
  ultima_em timestamptz,
  ultima_autor_id uuid,
  nao_lidas integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.id, c.paciente_id, c.psicologo_id, c.status, c.data_inicio, c.created_at, c.updated_at,
         p.full_name,
         m.conteudo, m.tipo, m.created_at, m.autor_id,
         (SELECT count(*)::int FROM public.mensagens u
           WHERE u.conversa_id = c.id AND u.autor_id <> auth.uid() AND u.lida_em IS NULL)
  FROM public.conversas c
  LEFT JOIN public.profiles p
    ON p.user_id = CASE WHEN c.paciente_id = auth.uid() THEN c.psicologo_id ELSE c.paciente_id END
  LEFT JOIN LATERAL (
    SELECT conteudo, tipo, created_at, autor_id FROM public.mensagens
    WHERE conversa_id = c.id ORDER BY created_at DESC LIMIT 1
  ) m ON true
  WHERE c.paciente_id = auth.uid() OR c.psicologo_id = auth.uid()
  ORDER BY COALESCE(m.created_at, c.updated_at) DESC;
$$;

REVOKE ALL ON FUNCTION public.listar_conversas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listar_conversas() TO authenticated;

-- ===========================================================================
-- 7. AGENDAMENTOS (pg_cron)
-- ===========================================================================
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname IN ('appointment-reminders', 'notification-push');

SELECT cron.schedule('appointment-reminders', '*/10 * * * *', $cron$SELECT public.queue_appointment_reminders();$cron$);

SELECT cron.schedule(
  'notification-push',
  '* * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://ihrrgmmsfuvlasmzdmwf.supabase.co/functions/v1/notification-push',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlocnJnbW1zZnV2bGFzbXpkbXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1NDMzMDcsImV4cCI6MjA2OTExOTMwN30.6hRDCL5alu-Bs4kT4jKYJW3G3zmeBJDZB5udruQzOFU"}'::jsonb,
    body := '{}'::jsonb
  );
  $cron$
);
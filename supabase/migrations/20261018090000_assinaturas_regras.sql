-- Assinaturas: regras no servidor (varredura de funcionamento).
--
-- 1. E-mail reaproveitado não herda a linha de outra pessoa. Quando alguém
--    trocava o e-mail da conta e outra pessoa se cadastrava com o e-mail
--    antigo, a criação da linha da pessoa nova (check-subscription, webhook,
--    plano da empresa) caía no "ON CONFLICT (email)" e tomava a linha da
--    primeira: cliente do Stripe, uso do mês e plano trocavam de dono. Agora,
--    antes de gravar, a linha antiga passa para o e-mail atual da dona.
-- 2. Aviso quando o plano termina (fim do período, arrependimento, cobrança
--    recusada até o fim, saída da empresa). Antes o plano sumia em silêncio e
--    a pessoa só descobria ao tentar usar o SOS.
-- 3. Cancelamento imediato (arrependimento com reembolso ou pagamento em
--    atraso): as consultas futuras pedidas com o plano são canceladas, e o
--    psicólogo é avisado. Antes ficavam marcadas: consulta de graça, paga ao
--    psicólogo pelo repasse.

CREATE OR REPLACE FUNCTION public.free_subscriber_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  v_target text;
BEGIN
  IF NEW.user_id IS NULL OR NEW.email IS NULL THEN
    RETURN NEW;
  END IF;
  FOR r IN
    SELECT s.id, s.user_id, u.email AS current_email
    FROM public.subscribers s
    LEFT JOIN auth.users u ON u.id = s.user_id
    WHERE s.email = NEW.email
      AND s.user_id IS NOT NULL
      AND s.user_id <> NEW.user_id
  LOOP
    v_target := r.current_email;
    IF v_target IS NULL
       OR v_target = NEW.email
       OR EXISTS (SELECT 1 FROM public.subscribers x WHERE x.email = v_target) THEN
      v_target := 'linha-antiga+' || r.id::text || '@invalid.local';
    END IF;
    UPDATE public.subscribers SET email = v_target, updated_at = now() WHERE id = r.id;
  END LOOP;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.free_subscriber_email() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS a0_free_subscriber_email ON public.subscribers;
CREATE TRIGGER a0_free_subscriber_email
  BEFORE INSERT ON public.subscribers
  FOR EACH ROW EXECUTE FUNCTION public.free_subscriber_email();

-- Aviso de fim do plano.
CREATE OR REPLACE FUNCTION public.notify_plan_ended()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.user_id IS NULL OR NOT OLD.subscribed OR NEW.subscribed THEN
    RETURN NEW;
  END IF;
  -- Um aviso só, mesmo se várias rotinas encerrarem o plano no mesmo dia.
  IF EXISTS (
    SELECT 1 FROM public.notifications
    WHERE patient_id = NEW.user_id AND title = 'Seu plano terminou' AND created_at > now() - interval '1 day'
  ) THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.notifications (patient_id, title, message, status, push, link)
  VALUES (
    NEW.user_id,
    'Seu plano terminou',
    'Seu plano ' || COALESCE(OLD.subscription_tier, '') || ' terminou e você está no Plano Grátis. '
      || 'O diário, os hábitos e os exercícios continuam disponíveis. Para voltar a ter SOS e consultas, escolha um plano.',
    'unread',
    false,
    '/subscription-plans'
  );
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.notify_plan_ended() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS notify_plan_ended ON public.subscribers;
CREATE TRIGGER notify_plan_ended
  AFTER UPDATE OF subscribed ON public.subscribers
  FOR EACH ROW EXECUTE FUNCTION public.notify_plan_ended();

-- Cancelamento imediato: consultas futuras sem plano que as cubra.
CREATE OR REPLACE FUNCTION public.cancel_appointments_after_plan_loss(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  v_count integer := 0;
  v_premium boolean;
BEGIN
  -- Ainda tem Premium (ex.: pela empresa): nada muda.
  SELECT COALESCE(bool_or(subscribed AND lower(COALESCE(subscription_tier, '')) = 'premium'), false)
    INTO v_premium
  FROM public.subscribers WHERE user_id = p_user_id;
  IF v_premium THEN
    RETURN 0;
  END IF;

  FOR r IN
    SELECT a.id, a.psychologist_id,
           CASE WHEN a.status = 'reschedule_proposed' AND a.proposed_scheduled_at IS NOT NULL
                THEN a.proposed_scheduled_at ELSE a.scheduled_at END AS starts_at
    FROM public.appointments a
    WHERE a.patient_id = p_user_id
      AND a.appointment_type = 'regular'
      AND a.status IN ('pending', 'scheduled', 'confirmed', 'reschedule_proposed')
      AND CASE WHEN a.status = 'reschedule_proposed' AND a.proposed_scheduled_at IS NOT NULL
               THEN a.proposed_scheduled_at ELSE a.scheduled_at END > now()
    FOR UPDATE
  LOOP
    UPDATE public.appointments
    SET status = 'cancelled',
        cancelled_at = now(),
        cancellation_reason = 'Plano cancelado pelo paciente'
    WHERE id = r.id;

    INSERT INTO public.notifications (patient_id, appointment_id, title, message, status, push, link)
    VALUES (
      r.psychologist_id, r.id, 'Consulta cancelada',
      'A consulta de ' || public.format_br_datetime(r.starts_at) || ' foi cancelada: o paciente cancelou o plano. O horário ficou livre.',
      'unread', true, '/psicologo/consultas'
    );
    v_count := v_count + 1;
  END LOOP;

  IF v_count > 0 THEN
    INSERT INTO public.notifications (patient_id, title, message, status, push, link)
    VALUES (
      p_user_id, 'Consultas canceladas',
      CASE WHEN v_count = 1 THEN 'Sua consulta agendada foi cancelada junto com o plano.'
           ELSE 'Suas ' || v_count || ' consultas agendadas foram canceladas junto com o plano.' END,
      'unread', false, '/appointments'
    );
  END IF;
  RETURN v_count;
END;
$function$;
REVOKE ALL ON FUNCTION public.cancel_appointments_after_plan_loss(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_appointments_after_plan_loss(uuid) TO service_role;

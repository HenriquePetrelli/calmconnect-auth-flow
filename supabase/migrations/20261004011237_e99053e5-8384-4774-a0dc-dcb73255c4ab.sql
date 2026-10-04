-- lovable-cron-fallback-reviewed: o fim de um plano cancelado depende do relógio (data de fim do período pago); o webhook do Stripe avisa, mas se a entrega falhar nada mais encerra o plano. A rotina horária é a garantia.
-- Plano cancelado: segue até o fim do período pago e depois vira plano grátis.
--
-- 1. `subscribers.cancel_at_period_end` guarda que a assinatura foi cancelada
--    e não renova. O app mostra "Plano cancelado - Plus disponível até dd/mm/aaaa".
-- 2. Rotina de hora em hora: plano do Stripe cancelado cujo período pago
--    acabou vira grátis, mesmo que o aviso do Stripe (webhook) não chegue.
--    Antes, sem o webhook, o plano só caía quando a pessoa abria o app.

ALTER TABLE public.subscribers
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;

-- O app não grava a marca de cancelamento (mesma regra das outras colunas do plano).
CREATE OR REPLACE FUNCTION public.guard_subscriber_client_write()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$
BEGIN
  IF current_user <> 'authenticated' OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.subscribed := false;
    NEW.subscription_tier := NULL;
    NEW.subscription_end := NULL;
    NEW.plan_limits := '{"appointments": 0, "sos_uses": 0}'::jsonb;
    NEW.entitlement_source := NULL;
    NEW.organization_id := NULL;
    NEW.stripe_customer_id := NULL;
    NEW.sos_used_this_month := false;
    NEW.appointments_used_this_month := false;
    NEW.cancel_at_period_end := false;
    RETURN NEW;
  END IF;
  NEW.user_id := OLD.user_id;
  NEW.subscribed := OLD.subscribed;
  NEW.subscription_tier := OLD.subscription_tier;
  NEW.subscription_end := OLD.subscription_end;
  NEW.plan_limits := OLD.plan_limits;
  NEW.entitlement_source := OLD.entitlement_source;
  NEW.organization_id := OLD.organization_id;
  NEW.stripe_customer_id := OLD.stripe_customer_id;
  NEW.sos_used_this_month := OLD.sos_used_this_month;
  NEW.sos_last_used := OLD.sos_last_used;
  NEW.appointments_used_this_month := OLD.appointments_used_this_month;
  NEW.appointments_last_used := OLD.appointments_last_used;
  NEW.cancel_at_period_end := OLD.cancel_at_period_end;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_subscriber_client_write() FROM PUBLIC, anon, authenticated;

-- Encerra os planos do Stripe cancelados cujo período pago já acabou. O
-- gatilho apply_organization_entitlement continua valendo: quem também tem
-- plano pela empresa fica com o plano da empresa.
CREATE OR REPLACE FUNCTION public.expire_cancelled_subscriptions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.subscribers
  SET subscribed = false,
      subscription_tier = NULL,
      subscription_end = NULL,
      plan_limits = '{"appointments": 0, "sos_uses": 0}'::jsonb,
      cancel_at_period_end = false,
      entitlement_source = 'stripe',
      updated_at = now()
  WHERE cancel_at_period_end
    AND COALESCE(entitlement_source, 'stripe') = 'stripe'
    AND subscription_end IS NOT NULL
    AND subscription_end <= now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_cancelled_subscriptions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_cancelled_subscriptions() TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'expire-cancelled-subscriptions';
SELECT cron.schedule('expire-cancelled-subscriptions', '7 * * * *', $cron$SELECT public.expire_cancelled_subscriptions();$cron$);
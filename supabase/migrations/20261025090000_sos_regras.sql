-- SOS: regras no servidor (varredura de funcionamento).
--
-- 1. Plano vencido não pede SOS. can_use_sos olhava só "assinado" e o plano;
--    um plano com a data de fim já passada continuava valendo até a rotina
--    que encerra planos rodar (de hora em hora, ou nunca, se o aviso do
--    Stripe não chegasse).
-- 2. Psicólogo em consulta agendada não aceita SOS e não conta como
--    disponível na fila (nem recebe o push do SOS): antes podia aceitar um SOS
--    no meio de uma consulta e o paciente da consulta ficava esperando.

CREATE OR REPLACE FUNCTION public.psychologist_in_consultation(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.psychologist_id = p_user_id
      AND a.status = 'in_progress'
      AND now() BETWEEN a.scheduled_at - interval '10 minutes'
                    AND a.scheduled_at + make_interval(mins => COALESCE(a.duration, 50) + 15)
  );
$function$;
REVOKE ALL ON FUNCTION public.psychologist_in_consultation(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.can_use_sos(p_user_id uuid)
 RETURNS TABLE(can_use boolean, reason text, plan_type text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rec RECORD;
  same_month boolean;
  brazil_today date;
  v_tier text;
BEGIN
  SELECT subscribed, subscription_tier, subscription_end, sos_used_this_month, sos_last_used
  INTO rec
  FROM public.subscribers
  WHERE user_id = p_user_id
  LIMIT 1;

  -- Plano vencido conta como sem plano (a rotina que encerra planos roda de hora em hora).
  IF NOT FOUND OR rec.subscribed IS FALSE OR (rec.subscription_end IS NOT NULL AND rec.subscription_end <= now()) THEN
    RETURN QUERY SELECT false, 'Usuário não possui assinatura ativa', COALESCE(rec.subscription_tier, NULL);
    RETURN;
  END IF;

  v_tier := CASE lower(COALESCE(rec.subscription_tier, '')) WHEN 'plus' THEN 'Plus' WHEN 'premium' THEN 'Premium' ELSE NULL END;
  IF v_tier IS NULL THEN
    RETURN QUERY SELECT false, 'Plano não permite uso de SOS', rec.subscription_tier;
    RETURN;
  END IF;

  brazil_today := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  same_month := rec.sos_last_used IS NOT NULL
    AND date_part('year', rec.sos_last_used) = date_part('year', brazil_today)
    AND date_part('month', rec.sos_last_used) = date_part('month', brazil_today);

  IF rec.sos_used_this_month AND same_month THEN
    RETURN QUERY SELECT false, format('Limite mensal de SOS já utilizado (%s: 1x/mês)', upper(v_tier)), v_tier;
  ELSE
    RETURN QUERY SELECT true, format('Pode usar SOS (%s: 1x/mês)', upper(v_tier)), v_tier;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.guard_sos_concurrency()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_open text[] := ARRAY['pending', 'accepted', 'in_progress'];
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = ANY (v_open) AND NEW.ended_at IS NULL THEN
      PERFORM pg_advisory_xact_lock(hashtext('sos_patient:' || NEW.patient_id::text));
      IF EXISTS (
        SELECT 1 FROM public.emergency_requests e
        WHERE e.patient_id = NEW.patient_id
          AND e.status = ANY (v_open)
          AND e.ended_at IS NULL
      ) THEN
        RAISE EXCEPTION 'SOS_ALREADY_OPEN' USING ERRCODE = '23505';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- Aceite: pendente → aceito.
  IF OLD.status = 'pending' AND NEW.status = 'accepted' AND NEW.accepted_by IS NOT NULL THEN
    IF OLD.created_at < now() - interval '10 minutes' THEN
      RAISE EXCEPTION 'Este pedido de SOS expirou e não pode mais ser aceito.' USING ERRCODE = 'P0001';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext('sos_psychologist:' || NEW.accepted_by::text));
    IF EXISTS (
      SELECT 1 FROM public.emergency_requests e
      WHERE e.accepted_by = NEW.accepted_by
        AND e.id <> NEW.id
        AND e.status IN ('accepted', 'in_progress')
        AND e.ended_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Você já está em um atendimento de emergência. Finalize-o antes de aceitar outro.' USING ERRCODE = 'P0001';
    END IF;
    -- Em consulta agendada agora: o paciente da consulta ficaria esperando.
    IF public.psychologist_in_consultation(NEW.accepted_by) THEN
      RAISE EXCEPTION 'Você está em uma consulta agora. Termine a consulta antes de aceitar um SOS.' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.count_available_psychologists()
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT count(*)::int
  FROM public.psychologist_presence pp
  JOIN public.psychologists p ON p.user_id = pp.psychologist_id
  WHERE pp.last_online > now() - interval '3 minutes'
    AND pp.current_emergency_id IS NULL
    AND NOT public.psychologist_in_consultation(pp.psychologist_id)
    AND p.approved = true
    AND p.approval_status = 'approved'
    AND (
      COALESCE(p.is_blocked, false) = false
      OR (p.blocked_until IS NOT NULL AND p.blocked_until < now())
    );
$function$;

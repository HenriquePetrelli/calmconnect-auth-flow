-- can_use_sos() compared sos_last_used (a date-only column, always stored
-- as a Brazil calendar date by the app) against CURRENT_DATE, which is
-- computed from the session's `timezone` GUC — UTC by default on Supabase.
-- For roughly 3 hours a day (21h-24h BRT) CURRENT_DATE is already the next
-- UTC day, so a SOS use late in the evening on the last day of the month
-- could be wrongly compared against next month's date, resetting the
-- monthly quota a day early. Compare against the Brazil calendar date
-- instead, consistent with how sos_last_used is written.
CREATE OR REPLACE FUNCTION public.can_use_sos(p_user_id uuid)
RETURNS TABLE(can_use boolean, reason text, plan_type text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rec RECORD;
  same_month boolean;
  brazil_today date;
BEGIN
  SELECT subscribed, subscription_tier, sos_used_this_month, sos_last_used
  INTO rec
  FROM public.subscribers
  WHERE user_id = p_user_id
  LIMIT 1;

  IF NOT FOUND OR rec.subscribed IS FALSE THEN
    RETURN QUERY SELECT false, 'Usuário não possui assinatura ativa', COALESCE(rec.subscription_tier, NULL);
    RETURN;
  END IF;

  rec.subscription_tier := COALESCE(rec.subscription_tier, '');

  brazil_today := (now() AT TIME ZONE 'America/Sao_Paulo')::date;

  same_month := CASE
    WHEN rec.sos_last_used IS NULL THEN FALSE
    ELSE (date_part('year', rec.sos_last_used) = date_part('year', brazil_today))
      AND (date_part('month', rec.sos_last_used) = date_part('month', brazil_today))
  END;

  IF lower(rec.subscription_tier) = 'plus' THEN
    IF rec.sos_used_this_month AND same_month THEN
      RETURN QUERY SELECT false, 'Limite mensal de SOS já utilizado (PLUS: 1x/mês)', 'Plus';
    ELSE
      RETURN QUERY SELECT true, 'Pode usar SOS (PLUS: 1x/mês)', 'Plus';
    END IF;
  ELSIF lower(rec.subscription_tier) = 'premium' THEN
    RETURN QUERY SELECT true, 'Pode usar SOS (PREMIUM: ilimitado)', 'Premium';
  ELSE
    RETURN QUERY SELECT false, 'Plano não permite uso de SOS', rec.subscription_tier;
  END IF;
END;
$$;

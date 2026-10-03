-- "Dias seguidos" de uso do app:
-- 1. Conta o dia no horário de Brasília (antes usava CURRENT_DATE em UTC, então
--    quem abria o app entre 21h e meia-noite ganhava o dia seguinte e podia
--    perder ou pular a sequência).
-- 2. Só a própria pessoa atualiza a sua sequência (antes qualquer usuário
--    logado podia chamar a função com o id de outro paciente).
-- A função agora é chamada sempre que o paciente abre o app (MainLayout), e
-- não só ao abrir "Meu progresso".
CREATE OR REPLACE FUNCTION public.update_patient_streak(p_patient_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  current_streak integer;
  last_date date;
  new_streak integer;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_patient_id THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.patient_statistics (patient_id)
  VALUES (p_patient_id)
  ON CONFLICT (patient_id) DO NOTHING;

  SELECT streak_days, last_active_date
  INTO current_streak, last_date
  FROM public.patient_statistics
  WHERE patient_id = p_patient_id;

  -- Já contou hoje (>= cobre datas gravadas em UTC, que podem estar um dia à frente).
  IF last_date >= today THEN
    RETURN jsonb_build_object('streak_days', COALESCE(current_streak, 0), 'already_updated', true);
  END IF;

  IF last_date = today - 1 THEN
    new_streak := COALESCE(current_streak, 0) + 1;
  ELSE
    new_streak := 1;
  END IF;

  UPDATE public.patient_statistics
  SET streak_days = new_streak,
      last_active_date = today
  WHERE patient_id = p_patient_id;

  RETURN jsonb_build_object('streak_days', new_streak, 'already_updated', false);
END;
$$;

REVOKE ALL ON FUNCTION public.update_patient_streak(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_patient_streak(uuid) TO authenticated;
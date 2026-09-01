CREATE OR REPLACE FUNCTION public.set_psychologist_availability(p_blocks jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_block jsonb;
  v_day int;
  v_start time;
  v_end time;
BEGIN
  FOR v_block IN SELECT * FROM jsonb_array_elements(COALESCE(p_blocks, '[]'::jsonb))
  LOOP
    v_day := (v_block->>'day_of_week')::int;
    v_start := (v_block->>'start_time')::time;
    v_end := (v_block->>'end_time')::time;

    IF v_day IS NULL OR v_day < 0 OR v_day > 6 THEN
      RAISE EXCEPTION 'day_of_week inválido: %', v_day;
    END IF;
    IF v_start IS NULL OR v_end IS NULL OR v_start >= v_end THEN
      RAISE EXCEPTION 'Horário de início deve ser antes do término (dia %)', v_day;
    END IF;
  END LOOP;

  DELETE FROM public.psychologist_availability WHERE psychologist_id = auth.uid();

  INSERT INTO public.psychologist_availability (psychologist_id, day_of_week, start_time, end_time, is_available)
  SELECT auth.uid(), (b->>'day_of_week')::int, (b->>'start_time')::time, (b->>'end_time')::time, true
  FROM jsonb_array_elements(COALESCE(p_blocks, '[]'::jsonb)) AS b;
END;
$$;

REVOKE ALL ON FUNCTION public.set_psychologist_availability(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_psychologist_availability(jsonb) TO authenticated;
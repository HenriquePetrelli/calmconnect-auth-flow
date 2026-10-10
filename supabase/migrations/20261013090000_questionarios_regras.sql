-- Questionários (GAD-7 e PHQ-9): quem vê, o que dá para mudar depois e o
-- compartilhamento que continua valendo.

-- 1. Depois de enviado, só o "mostrar aos meus psicólogos" muda. Antes dava
--    para trocar as respostas, o tipo e a data de um questionário antigo (a
--    data mudava quando o próximo "fica disponível" e o gráfico).
--    Compartilhamento: um questionário novo segue a escolha do anterior do
--    mesmo tipo. Antes cada resultado novo nascia escondido e o psicólogo
--    continuava vendo só o antigo, sem ninguém perceber.
CREATE OR REPLACE FUNCTION public.guard_screening_client_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := now();
    NEW.shared_with_psychologist := COALESCE(NEW.shared_with_psychologist, false) OR COALESCE((
      SELECT s.shared_with_psychologist FROM public.mental_health_screenings s
      WHERE s.user_id = NEW.user_id AND s.instrument = NEW.instrument
      ORDER BY s.created_at DESC LIMIT 1
    ), false);
  ELSE
    NEW.id := OLD.id;
    NEW.user_id := OLD.user_id;
    NEW.instrument := OLD.instrument;
    NEW.answers := OLD.answers;
    NEW.created_at := OLD.created_at;
  END IF;
  RETURN NEW;
END;
$function$;

-- Roda antes do cálculo da pontuação (gatilhos BEFORE vão em ordem alfabética).
CREATE OR REPLACE TRIGGER a_guard_screening_client_write
  BEFORE INSERT OR UPDATE ON public.mental_health_screenings
  FOR EACH ROW EXECUTE FUNCTION public.guard_screening_client_write();

-- 2. Psicólogo vê o compartilhado só se ATENDE o paciente: consulta aceita,
--    em andamento ou realizada. Antes bastava qualquer consulta, até um pedido
--    recusado, cancelado ou que nunca foi aceito, e o acesso ficava para sempre.
DROP POLICY IF EXISTS "Psychologists view shared screenings of their patients" ON public.mental_health_screenings;
CREATE POLICY "Psychologists view shared screenings of their patients"
ON public.mental_health_screenings
FOR SELECT
TO authenticated
USING (
  shared_with_psychologist
  AND EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.patient_id = mental_health_screenings.user_id
      AND a.psychologist_id = auth.uid()
      AND a.status IN ('scheduled', 'confirmed', 'in_progress', 'completed')
  )
);

-- 3. Enviar duas vezes seguidas (toque duplo, nova tentativa sem resposta)
--    não cria dois resultados: o app manda um id gerado no aparelho e um
--    limite curto segura repetições.
DROP TRIGGER IF EXISTS rate_limit_screenings ON public.mental_health_screenings;
CREATE TRIGGER rate_limit_screenings
  BEFORE INSERT ON public.mental_health_screenings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_write_rate_limit('questionarios', '10', '3600');

CREATE INDEX IF NOT EXISTS mental_health_screenings_user_created_idx
  ON public.mental_health_screenings (user_id, created_at DESC);

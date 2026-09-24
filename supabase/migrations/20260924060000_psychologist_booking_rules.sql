-- Regras de agendamento por psicólogo.
--
-- Até aqui qualquer horário livre da agenda podia ser marcado a qualquer
-- momento: dava para agendar para daqui a 10 minutos, com 30 dias de
-- antecedência fixos, e colar uma consulta na outra sem intervalo.
--   buffer_minutes    intervalo livre obrigatório entre consultas
--   min_notice_hours  antecedência mínima para o paciente marcar
--   max_advance_days  até quantos dias à frente a agenda abre
-- A tabela é legível por qualquer autenticado (o paciente precisa das
-- regras para montar os horários); só o próprio psicólogo escreve.
CREATE TABLE IF NOT EXISTS public.psychologist_booking_rules (
  psychologist_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  buffer_minutes integer NOT NULL DEFAULT 0 CHECK (buffer_minutes BETWEEN 0 AND 60),
  min_notice_hours integer NOT NULL DEFAULT 2 CHECK (min_notice_hours BETWEEN 0 AND 168),
  max_advance_days integer NOT NULL DEFAULT 30 CHECK (max_advance_days BETWEEN 1 AND 90),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.psychologist_booking_rules ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.psychologist_booking_rules TO authenticated;
GRANT ALL ON public.psychologist_booking_rules TO service_role;

CREATE POLICY "Authenticated users can read booking rules"
  ON public.psychologist_booking_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Psychologists insert their own booking rules"
  ON public.psychologist_booking_rules FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = psychologist_id);

CREATE POLICY "Psychologists update their own booking rules"
  ON public.psychologist_booking_rules FOR UPDATE
  TO authenticated
  USING (auth.uid() = psychologist_id)
  WITH CHECK (auth.uid() = psychologist_id);

CREATE TRIGGER update_psychologist_booking_rules_updated_at
BEFORE UPDATE ON public.psychologist_booking_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

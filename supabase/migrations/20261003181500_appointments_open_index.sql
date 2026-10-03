-- Índice para a verificação de consultas em aberto (finalize_stale_appointments,
-- a cada 10 min) e os lembretes: olha só as consultas ainda abertas.
-- Já aplicado direto no banco pela Lovable; registrado aqui para o repositório
-- refletir o banco (IF NOT EXISTS: não faz nada se já existir).
CREATE INDEX IF NOT EXISTS appointments_open_scheduled_idx
  ON public.appointments (scheduled_at)
  WHERE status IN ('scheduled', 'confirmed', 'in_progress');

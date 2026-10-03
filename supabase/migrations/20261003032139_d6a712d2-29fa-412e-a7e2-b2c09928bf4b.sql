-- Revoga EXECUTE direto nas funções de gatilho (só o banco deve chamá-las)
REVOKE ALL ON FUNCTION public.guard_appointment_client_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_conversa_client_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_new_appointment_request() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_new_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reopen_conversa_on_completed_appointment() FROM PUBLIC, anon, authenticated;

-- search_path fixo na função de formatação de data/hora
ALTER FUNCTION public.format_br_datetime(timestamptz) SET search_path = public;

-- appointment_reminders_sent é só do sistema (service_role); política
-- explícita deixando claro que usuários do app não têm acesso
CREATE POLICY "Lembretes enviados são internos do sistema"
  ON public.appointment_reminders_sent
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);
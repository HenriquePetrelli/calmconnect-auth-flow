-- Read receipts for the patient/psychologist chat.
-- "Delivered" isn't a distinct state in this realtime-only chat (no offline
-- queue), so we track a single transition: sent -> read.

ALTER TABLE public.mensagens ADD COLUMN IF NOT EXISTS lida_em timestamptz;

-- Marks every inbound message in a conversation as read by the caller.
-- An RPC (rather than an UPDATE RLS policy) keeps participants from being
-- able to touch any other column of a message they didn't author.
CREATE OR REPLACE FUNCTION public.marcar_mensagens_como_lidas(p_conversa_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.conversas c
    WHERE c.id = p_conversa_id
      AND (c.paciente_id = auth.uid() OR c.psicologo_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Conversa não encontrada ou acesso negado';
  END IF;

  UPDATE public.mensagens
  SET lida_em = now()
  WHERE conversa_id = p_conversa_id
    AND autor_id <> auth.uid()
    AND lida_em IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.marcar_mensagens_como_lidas(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.marcar_mensagens_como_lidas(uuid) TO authenticated;

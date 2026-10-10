-- Chat: regras no servidor (segunda varredura).
--
-- 1. Hora da mensagem é a do servidor. Antes o app (ou a API) podia mandar
--    created_at de outro dia e a mensagem entrava fora de ordem, no meio do
--    histórico, sem o outro lado perceber.
-- 2. Mensagem de texto vazia (só espaços) era aceita pela API.
-- 3. A política de privacidade diz que as mensagens são apagadas após 3 meses,
--    mas a rotina só apagava a conversa inteira 3 meses depois de aberta, e
--    cada consulta concluída "reabre" a conversa (data_inicio = agora): quem
--    tinha consultas seguidas guardava o histórico para sempre. Agora a rotina
--    também apaga cada mensagem com mais de 3 meses (as fotos saem pela função
--    chat-cleanup).
-- 4. Consulta concluída reabre a conversa também na lista de quem tinha
--    ocultado (antes a conversa reaberta continuava escondida).
-- 5. A rotina diária usa a mesma conta de "1 mês" do envio (agora - 1 mês).

CREATE OR REPLACE FUNCTION public.guard_mensagem_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  c public.conversas%ROWTYPE;
BEGIN
  -- Funções do servidor e rotinas seguem livres.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.autor_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Mensagem inválida' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO c FROM public.conversas WHERE id = NEW.conversa_id;
  IF NOT FOUND OR c.status <> 'ativa' OR c.data_inicio <= now() - interval '1 month' THEN
    RAISE EXCEPTION 'Esta conversa está somente leitura. Ela reabre na próxima consulta.' USING ERRCODE = 'P0001';
  END IF;

  IF NEW.tipo = 'imagem' THEN
    IF NEW.imagem_url IS NULL
       OR NEW.imagem_url NOT LIKE 'chat-images/' || NEW.conversa_id::text || '/' || NEW.autor_id::text || '-%' THEN
      RAISE EXCEPTION 'Foto inválida para esta conversa' USING ERRCODE = '42501';
    END IF;
    NEW.conteudo := NULL;
  ELSE
    NEW.imagem_url := NULL;
    IF NEW.conteudo IS NULL OR btrim(NEW.conteudo) = '' THEN
      RAISE EXCEPTION 'A mensagem está vazia' USING ERRCODE = '22023';
    END IF;
  END IF;

  -- Hora do servidor: a ordem da conversa não depende do relógio do aparelho.
  NEW.created_at := now();
  NEW.updated_at := now();
  -- Lida só quando o outro abrir (marcar_mensagens_como_lidas).
  NEW.lida_em := NULL;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_mensagem_insert() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.gerenciar_expiracao_conversas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.conversas
  SET status = 'somente_leitura'
  WHERE status = 'ativa'
    AND data_inicio <= now() - interval '1 month';

  -- Cada mensagem vive no máximo 3 meses, mesmo numa conversa reaberta.
  DELETE FROM public.mensagens
  WHERE created_at <= now() - interval '3 months';

  DELETE FROM public.conversas
  WHERE data_inicio <= now() - interval '3 months';
END;
$function$;
REVOKE ALL ON FUNCTION public.gerenciar_expiracao_conversas() FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_mensagens_created_at ON public.mensagens (created_at);
-- Busca do que mudou desde a última vez (mensagem nova ou lida).
CREATE INDEX IF NOT EXISTS idx_mensagens_conversa_updated ON public.mensagens (conversa_id, updated_at);

CREATE OR REPLACE FUNCTION public.reopen_conversa_on_completed_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    UPDATE public.conversas
    SET status = 'ativa', data_inicio = now(), data_fim = NULL,
        oculta_paciente_em = NULL, oculta_psicologo_em = NULL
    WHERE paciente_id = NEW.patient_id AND psicologo_id = NEW.psychologist_id;
  END IF;
  RETURN NEW;
END;
$function$;

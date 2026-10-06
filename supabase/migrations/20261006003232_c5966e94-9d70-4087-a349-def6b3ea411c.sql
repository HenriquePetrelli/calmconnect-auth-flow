-- Chat: correções da varredura de 2026-10-06.
--
-- 1. Fotos do chat: qualquer usuário logado conseguia ler (e listar) todas
--    as fotos de todas as conversas (pasta documents/chat-images, aberta
--    para leitura e envio). Agora:
--    - fotos novas ficam em chat-images/{conversa}/{autor}-{hora}.ext e só
--      os dois participantes da conversa enviam e veem;
--    - fotos antigas (chat-images/{autor}-{hora}.ext) só abrem para quem
--      participa da conversa onde o próprio autor mandou aquela foto.
-- 2. Mensagem com foto só pode apontar para a pasta da própria conversa.
-- 3. Conversa vira somente leitura 1 mês depois de (re)aberta. A rotina
--    diária mudava o status, então ainda dava para escrever por até um dia
--    a mais; agora a data é conferida em cada mensagem.
-- 4. Ocultar conversa: cada um só oculta/mostra a conversa na própria
--    lista. Antes, pela API, o paciente podia esconder a conversa da lista
--    do psicólogo (e vice-versa).
-- 5. pode_criar_conversa só responde sobre a própria pessoa (antes dizia a
--    qualquer usuário logado se um paciente teve consulta com um psicólogo).

-- ===========================================================================
-- 1. Fotos do chat só para os participantes
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.pode_ver_imagem_chat(p_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_parts text[] := string_to_array(p_name, '/');
  v_conversa uuid;
BEGIN
  IF v_uid IS NULL OR v_parts[1] IS DISTINCT FROM 'chat-images' THEN
    RETURN false;
  END IF;

  -- Formato novo: chat-images/{conversa}/{arquivo}
  IF array_length(v_parts, 1) = 3 THEN
    BEGIN
      v_conversa := v_parts[2]::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      RETURN false;
    END;
    RETURN EXISTS (
      SELECT 1 FROM public.conversas c
      WHERE c.id = v_conversa AND v_uid IN (c.paciente_id, c.psicologo_id)
    );
  END IF;

  -- Formato antigo: chat-images/{autor}-{hora}.ext, só se o próprio autor
  -- mandou essa foto numa conversa da qual quem pede participa.
  IF array_length(v_parts, 1) = 2 THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.mensagens m
      JOIN public.conversas c ON c.id = m.conversa_id
      WHERE m.tipo = 'imagem'
        AND v_uid IN (c.paciente_id, c.psicologo_id)
        AND v_parts[2] LIKE m.autor_id::text || '-%'
        AND (m.imagem_url = p_name OR m.imagem_url LIKE '%/documents/' || p_name)
    );
  END IF;

  RETURN false;
END;
$$;
REVOKE ALL ON FUNCTION public.pode_ver_imagem_chat(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode_ver_imagem_chat(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.pode_enviar_imagem_chat(p_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_parts text[] := string_to_array(p_name, '/');
  v_conversa uuid;
BEGIN
  IF v_uid IS NULL OR v_parts[1] IS DISTINCT FROM 'chat-images' OR array_length(v_parts, 1) <> 3 THEN
    RETURN false;
  END IF;
  IF v_parts[3] NOT LIKE v_uid::text || '-%' THEN
    RETURN false;
  END IF;
  BEGIN
    v_conversa := v_parts[2]::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN false;
  END;
  RETURN EXISTS (
    SELECT 1 FROM public.conversas c
    WHERE c.id = v_conversa
      AND v_uid IN (c.paciente_id, c.psicologo_id)
      AND c.status = 'ativa'
      AND c.data_inicio > now() - interval '1 month'
  );
END;
$$;
REVOKE ALL ON FUNCTION public.pode_enviar_imagem_chat(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode_enviar_imagem_chat(text) TO authenticated;

DROP POLICY IF EXISTS "Authenticated users can view chat images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload chat images" ON storage.objects;
DROP POLICY IF EXISTS "Participantes veem as fotos da conversa" ON storage.objects;
DROP POLICY IF EXISTS "Participantes enviam fotos na conversa" ON storage.objects;

CREATE POLICY "Participantes veem as fotos da conversa"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'documents' AND public.pode_ver_imagem_chat(name));

CREATE POLICY "Participantes enviam fotos na conversa"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents' AND public.pode_enviar_imagem_chat(name));

-- ===========================================================================
-- 2 e 3. Mensagem nova: conversa aberta e foto da própria conversa
-- ===========================================================================
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

  SELECT * INTO c FROM public.conversas WHERE id = NEW.conversa_id;
  IF NOT FOUND OR c.status <> 'ativa' OR c.data_inicio <= now() - interval '1 month' THEN
    RAISE EXCEPTION 'Esta conversa está somente leitura. Ela reabre na próxima consulta.' USING ERRCODE = 'P0001';
  END IF;

  IF NEW.tipo = 'imagem' THEN
    IF NEW.imagem_url IS NULL
       OR NEW.imagem_url NOT LIKE 'chat-images/' || NEW.conversa_id::text || '/' || NEW.autor_id::text || '-%' THEN
      RAISE EXCEPTION 'Foto inválida para esta conversa' USING ERRCODE = '42501';
    END IF;
  ELSE
    NEW.imagem_url := NULL;
  END IF;

  -- Lida só quando o outro abrir (marcar_mensagens_como_lidas).
  NEW.lida_em := NULL;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_mensagem_insert() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_mensagem_insert ON public.mensagens;
CREATE TRIGGER guard_mensagem_insert
  BEFORE INSERT ON public.mensagens
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_mensagem_insert();

-- ===========================================================================
-- 4. Cada um oculta a conversa só na própria lista
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.guard_conversa_client_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;
  IF NEW.paciente_id IS DISTINCT FROM OLD.paciente_id
     OR NEW.psicologo_id IS DISTINCT FROM OLD.psicologo_id
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.data_inicio IS DISTINCT FROM OLD.data_inicio
     OR NEW.data_fim IS DISTINCT FROM OLD.data_fim
     OR (NEW.oculta_paciente_em IS DISTINCT FROM OLD.oculta_paciente_em AND auth.uid() IS DISTINCT FROM OLD.paciente_id)
     OR (NEW.oculta_psicologo_em IS DISTINCT FROM OLD.oculta_psicologo_em AND auth.uid() IS DISTINCT FROM OLD.psicologo_id) THEN
    RAISE EXCEPTION 'Alteração não permitida nesta conversa' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_conversa_client_update() FROM PUBLIC, anon, authenticated;

-- ===========================================================================
-- 5. pode_criar_conversa só sobre a própria pessoa
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.pode_criar_conversa(p_paciente_id uuid, p_psicologo_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() NOT IN (p_paciente_id, p_psicologo_id) THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.patient_id = p_paciente_id
    AND a.psychologist_id = p_psicologo_id
    AND a.status = 'completed'
    AND a.scheduled_at >= (CURRENT_DATE - INTERVAL '30 days')
  );
END;
$$;
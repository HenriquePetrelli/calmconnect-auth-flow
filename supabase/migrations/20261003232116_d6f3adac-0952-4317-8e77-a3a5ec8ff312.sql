-- Correções achadas ao documentar os fluxos (docs/fluxos):
--
-- 1. Questionários: a pontuação só era recalculada quando as respostas
--    mudavam. Pela API, o próprio paciente conseguia gravar outra pontuação e
--    faixa num resultado já salvo (que o psicólogo vê, se compartilhado).
-- 2. Grupos de apoio, curtidas: qualquer usuário logado lia a tabela inteira
--    com o id de quem curtiu, e dava para saber quem interage com quais
--    grupos (ex.: depressão). A tela usa só os totais e a reação da própria
--    pessoa, que vêm por get_group_testimonials.
-- 3. Grupos de apoio, trocar a reação ("me ajudou" → "não me ajudou") não
--    funcionava: não havia política de UPDATE, a troca falhava em silêncio e
--    a tela mostrava como se tivesse dado certo.
-- 4. Grupos de apoio: o autor conseguia alterar os contadores de curtidas do
--    próprio depoimento.
-- 5. Chat: "excluir conversa" apagava para os dois lados, inclusive o
--    histórico do psicólogo. Agora oculta só para quem excluiu (como no
--    WhatsApp); a conversa volta para a lista se chegar mensagem nova.
-- 6. Diário: limite de 2 anotações por dia conferido também no banco.

-- ===========================================================================
-- 1. Pontuação dos questionários recalculada em qualquer alteração
-- ===========================================================================
DROP TRIGGER IF EXISTS score_mental_health_screening ON public.mental_health_screenings;
CREATE TRIGGER score_mental_health_screening
  BEFORE INSERT OR UPDATE ON public.mental_health_screenings
  FOR EACH ROW EXECUTE FUNCTION public.score_mental_health_screening();

-- ===========================================================================
-- 2 e 3. Curtidas: cada um vê e altera só a própria
-- ===========================================================================
DROP POLICY IF EXISTS "Usuários podem visualizar likes de depoimentos" ON public.group_testimonial_likes;
DROP POLICY IF EXISTS "Usuários veem só as próprias curtidas" ON public.group_testimonial_likes;
CREATE POLICY "Usuários veem só as próprias curtidas" ON public.group_testimonial_likes
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_super_admin());

DROP POLICY IF EXISTS "Usuários podem trocar a própria curtida" ON public.group_testimonial_likes;
CREATE POLICY "Usuários podem trocar a própria curtida" ON public.group_testimonial_likes
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ===========================================================================
-- 4. Contadores de curtidas só mudam pelo gatilho de contagem
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.guard_testimonial_client_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- O gatilho de contagem e as funções de moderação rodam como dono.
  IF current_user <> 'authenticated' OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.likes_positivos := 0;
    NEW.likes_negativos := 0;
    RETURN NEW;
  END IF;
  NEW.user_id := OLD.user_id;
  NEW.likes_positivos := OLD.likes_positivos;
  NEW.likes_negativos := OLD.likes_negativos;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS a_guard_testimonial_client_write ON public.group_testimonials;
CREATE TRIGGER a_guard_testimonial_client_write
  BEFORE INSERT OR UPDATE ON public.group_testimonials
  FOR EACH ROW EXECUTE FUNCTION public.guard_testimonial_client_write();

-- ===========================================================================
-- 5. Chat: ocultar a conversa só para quem excluiu
-- ===========================================================================
ALTER TABLE public.conversas
  ADD COLUMN IF NOT EXISTS oculta_paciente_em timestamptz,
  ADD COLUMN IF NOT EXISTS oculta_psicologo_em timestamptz;

-- Ninguém apaga a conversa do outro lado. A conversa continua sendo apagada
-- pela rotina de expiração (3 meses) e arquivada pelo admin.
DROP POLICY IF EXISTS "Pacientes podem deletar suas conversas" ON public.conversas;

CREATE OR REPLACE FUNCTION public.ocultar_conversa(p_conversa_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  c public.conversas%ROWTYPE;
BEGIN
  SELECT * INTO c FROM public.conversas WHERE id = p_conversa_id;
  IF NOT FOUND OR auth.uid() NOT IN (c.paciente_id, c.psicologo_id) THEN
    RAISE EXCEPTION 'Conversa não encontrada' USING ERRCODE = '42501';
  END IF;
  IF auth.uid() = c.paciente_id THEN
    UPDATE public.conversas SET oculta_paciente_em = now() WHERE id = c.id;
  ELSE
    UPDATE public.conversas SET oculta_psicologo_em = now() WHERE id = c.id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.ocultar_conversa(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ocultar_conversa(uuid) TO authenticated;

-- Abrir conversa com um psicólogo: devolve a que já existe (e volta a
-- mostrá-la para o paciente) ou cria uma nova. Antes, depois de excluir, o
-- psicólogo voltava à lista "disponíveis" e criar de novo falhava com
-- conversa duplicada.
CREATE OR REPLACE FUNCTION public.abrir_conversa(p_psicologo_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_id FROM public.conversas
  WHERE paciente_id = auth.uid() AND psicologo_id = p_psicologo_id;

  IF v_id IS NOT NULL THEN
    UPDATE public.conversas SET oculta_paciente_em = NULL WHERE id = v_id;
    RETURN v_id;
  END IF;

  IF NOT public.pode_criar_conversa(auth.uid(), p_psicologo_id) THEN
    RAISE EXCEPTION 'O chat abre com psicólogos com quem você teve consulta nos últimos 30 dias.' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.conversas (paciente_id, psicologo_id, status)
  VALUES (auth.uid(), p_psicologo_id, 'ativa')
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.abrir_conversa(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.abrir_conversa(uuid) TO authenticated;

-- Lista de conversas sem as que a pessoa ocultou, a menos que tenha chegado
-- mensagem depois.
CREATE OR REPLACE FUNCTION public.listar_conversas()
RETURNS TABLE (
  id uuid,
  paciente_id uuid,
  psicologo_id uuid,
  status text,
  data_inicio timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  outro_nome text,
  ultima_conteudo text,
  ultima_tipo text,
  ultima_em timestamptz,
  ultima_autor_id uuid,
  nao_lidas integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.id, c.paciente_id, c.psicologo_id, c.status, c.data_inicio, c.created_at, c.updated_at,
         p.full_name,
         m.conteudo, m.tipo, m.created_at, m.autor_id,
         (SELECT count(*)::int FROM public.mensagens u
           WHERE u.conversa_id = c.id AND u.autor_id <> auth.uid() AND u.lida_em IS NULL)
  FROM public.conversas c
  LEFT JOIN public.profiles p
    ON p.user_id = CASE WHEN c.paciente_id = auth.uid() THEN c.psicologo_id ELSE c.paciente_id END
  LEFT JOIN LATERAL (
    SELECT conteudo, tipo, created_at, autor_id FROM public.mensagens
    WHERE conversa_id = c.id ORDER BY created_at DESC LIMIT 1
  ) m ON true
  WHERE (c.paciente_id = auth.uid() OR c.psicologo_id = auth.uid())
    AND NOT COALESCE(
      CASE WHEN c.paciente_id = auth.uid() THEN c.oculta_paciente_em ELSE c.oculta_psicologo_em END
        >= COALESCE(m.created_at, c.created_at),
      false
    )
  ORDER BY COALESCE(m.created_at, c.updated_at) DESC;
$$;

REVOKE ALL ON FUNCTION public.listar_conversas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listar_conversas() TO authenticated;

-- ===========================================================================
-- 6. Diário: limite de 2 anotações por dia também no banco
-- ===========================================================================
-- Antes só a tela conferia; pela API dava para gravar quantas quisesse e
-- com data retroativa. O dia conta no horário de Brasília.
CREATE OR REPLACE FUNCTION public.enforce_journal_daily_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_day date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_count integer;
BEGIN
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;
  NEW.criado_em := now();
  SELECT count(*) INTO v_count FROM public.private_journals
  WHERE user_id = NEW.user_id
    AND (criado_em AT TIME ZONE 'America/Sao_Paulo')::date = v_day;
  IF v_count >= 2 THEN
    RAISE EXCEPTION 'Limite diário de 2 anotações atingido. Tente novamente amanhã.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_journal_daily_limit ON public.private_journals;
CREATE TRIGGER enforce_journal_daily_limit
  BEFORE INSERT ON public.private_journals
  FOR EACH ROW EXECUTE FUNCTION public.enforce_journal_daily_limit();

ALTER TABLE public.private_journals DROP CONSTRAINT IF EXISTS private_journals_texto_tamanho;
ALTER TABLE public.private_journals ADD CONSTRAINT private_journals_texto_tamanho
  CHECK (texto IS NULL OR char_length(texto) <= 10000) NOT VALID;
-- Chamada de vídeo: presença na sala só pelas regras do banco.
--
-- O app grava um batimento em participant_presence a cada 15 s. A política
-- deixava cada pessoa alterar qualquer coluna da própria linha, inclusive se
-- a mídia estava passando (media_connected/media_changed_at, que só
-- report_call_media deveria gravar) e a hora do último sinal. Com isso:
-- - o paciente marcava "sem áudio/vídeo há 1 hora" no fim de um SOS que
--   correu bem e usava "Chamar outro psicólogo": o SOS do mês voltava e o
--   atendimento saía do repasse do psicólogo;
-- - um último sinal no futuro fazia a sala nunca ser dada como abandonada e
--   impedia o paciente de chamar outro psicólogo;
-- - dava para criar linhas em salas de outras pessoas e trocar o próprio
--   papel (paciente/psicólogo), que a tela usa para achar o outro lado.
-- Agora, pelo app: só quem está na sala grava presença, o papel vem da sala,
-- o último sinal é a hora do servidor e o estado da mídia não muda.

CREATE OR REPLACE FUNCTION public.guard_participant_presence()
RETURNS trigger
LANGUAGE plpgsql
-- Sem SECURITY DEFINER: current_user precisa ser o de quem chama.
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  s record;
BEGIN
  -- Funções do servidor (report_call_media) e rotinas gravam livremente.
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.id := OLD.id;
    NEW.session_id := OLD.session_id;
    NEW.user_id := OLD.user_id;
    NEW.created_at := OLD.created_at;
    NEW.media_connected := OLD.media_connected;
    NEW.media_changed_at := OLD.media_changed_at;
  ELSE
    NEW.media_connected := false;
    NEW.media_changed_at := now();
    NEW.created_at := now();
  END IF;

  SELECT patient_id, psychologist_id INTO s FROM public.webrtc_sessions WHERE id = NEW.session_id;
  IF NOT FOUND OR NEW.user_id IS DISTINCT FROM v_uid
     OR v_uid NOT IN (COALESCE(s.patient_id, '00000000-0000-0000-0000-000000000000'::uuid),
                      COALESCE(s.psychologist_id, '00000000-0000-0000-0000-000000000000'::uuid)) THEN
    RAISE EXCEPTION 'Sala não encontrada' USING ERRCODE = '42501';
  END IF;

  NEW.user_type := CASE WHEN v_uid = s.psychologist_id THEN 'psychologist' ELSE 'patient' END;
  NEW.last_seen := now();
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.guard_participant_presence() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS a_guard_participant_presence ON public.participant_presence;
CREATE TRIGGER a_guard_participant_presence
  BEFORE INSERT OR UPDATE ON public.participant_presence
  FOR EACH ROW EXECUTE FUNCTION public.guard_participant_presence();

-- Apagar a própria presença também não é mais possível pelo app (a exclusão
-- de conta usa a chave do servidor).
DROP POLICY IF EXISTS "Users manage their own presence" ON public.participant_presence;
DROP POLICY IF EXISTS "Users insert their own presence" ON public.participant_presence;
DROP POLICY IF EXISTS "Users update their own presence" ON public.participant_presence;
DROP POLICY IF EXISTS "Users view their own presence" ON public.participant_presence;

CREATE POLICY "Users insert their own presence" ON public.participant_presence
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update their own presence" ON public.participant_presence
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view their own presence" ON public.participant_presence
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
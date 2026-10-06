-- Varredura dos fluxos restantes (contas, vídeo, notificações, documentos,
-- rotinas). Cada bloco corrige uma brecha encontrada no estado final do banco.

-- 1. Documentos dos psicólogos (CRP, diploma, RG): duas regras antigas davam
--    acesso a quem tivesse "is_super_admin": true nos metadados do usuário.
--    Esses metadados o próprio usuário edita (auth.updateUser), então
--    qualquer conta podia ler e enviar arquivos na pasta de todos. As regras
--    certas (is_super_admin() pela tabela admin_users) já existem.
DROP POLICY IF EXISTS "admin_document_access" ON storage.objects;
DROP POLICY IF EXISTS "admin_upload_documents" ON storage.objects;

-- 2. Funções que respondiam sobre qualquer usuário a quem chamasse:
--    can_use_sos(id) devolvia plano e SOS usados no mês de outra pessoa;
--    validate_route_access(id, rota) dizia o tipo de conta de qualquer um.
--    Só o servidor usa can_use_sos (função emergency-sos); a outra não é usada.
REVOKE EXECUTE ON FUNCTION public.can_use_sos(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_use_sos(uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.validate_route_access(uuid, text) FROM PUBLIC, anon, authenticated;
-- Rotina do pg_cron (roda como dono); visitantes sem login podiam disparar.
REVOKE EXECUTE ON FUNCTION public.prune_stale_psychologist_presence() FROM PUBLIC, anon, authenticated;
-- Restos sem uso que respondiam "pode" para qualquer arquivo do bucket.
REVOKE EXECUTE ON FUNCTION public.can_access_document(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_upload_document(text, text) FROM PUBLIC, anon, authenticated;

-- 3. Cadastro: o tipo de conta vem dos metadados do signUp, que o cliente
--    escolhe. Só paciente e psicólogo podem nascer assim (admin é só pela
--    tabela admin_users; psicólogo continua dependendo da aprovação).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, user_type, full_name, crp)
  VALUES (
    NEW.id,
    CASE WHEN NEW.raw_user_meta_data ->> 'user_type' = 'psychologist'
      THEN 'psychologist' ELSE 'patient' END::public.user_type,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.raw_user_meta_data ->> 'crp'
  );
  RETURN NEW;
END;
$function$;

-- 4. Inscrição do psicólogo: o próprio psicólogo criava a linha já com
--    status "approved", e o app o deixava entrar no painel sem aprovação.
--    Pelo app, a inscrição sempre nasce pendente; só o admin muda depois.
CREATE OR REPLACE FUNCTION public.guard_registration_client_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_user <> 'authenticated' OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;
  NEW.status := 'pending';
  NEW.submitted_at := now();
  NEW.reviewed_at := NULL;
  NEW.reviewed_by := NULL;
  NEW.rejection_reason := NULL;
  NEW.rejected_at := NULL;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS a_guard_registration_client_insert ON public.psychologist_registrations;
CREATE TRIGGER a_guard_registration_client_insert
  BEFORE INSERT ON public.psychologist_registrations
  FOR EACH ROW EXECUTE FUNCTION public.guard_registration_client_insert();

-- 5. Sala de vídeo: quem participava podia trocar o outro participante, o
--    pedido de SOS ligado à sala e quem encerrou; e o psicólogo podia gravar
--    a "resposta" da chamada sozinho, o que marca a chamada como conectada
--    (a consulta conta como realizada e entra no repasse sem o paciente ter
--    entrado). A resposta é sempre do paciente; o cronômetro é do psicólogo.
--    As salas são criadas só pelo servidor: o app nunca insere.
CREATE OR REPLACE FUNCTION public.guard_webrtc_client_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  NEW.id := OLD.id;
  NEW.emergency_request_id := OLD.emergency_request_id;
  NEW.created_at := OLD.created_at;
  NEW.expires_at := OLD.expires_at;
  NEW.connected_at := OLD.connected_at;

  -- Um lado vazio só pode ser preenchido por quem está chamando.
  IF OLD.patient_id IS NOT NULL OR NEW.patient_id IS DISTINCT FROM v_uid THEN
    NEW.patient_id := OLD.patient_id;
  END IF;
  IF OLD.psychologist_id IS NOT NULL OR NEW.psychologist_id IS DISTINCT FROM v_uid THEN
    NEW.psychologist_id := OLD.psychologist_id;
  END IF;

  IF NEW.answer IS NOT NULL AND NEW.answer IS DISTINCT FROM OLD.answer
     AND v_uid IS DISTINCT FROM NEW.patient_id THEN
    NEW.answer := OLD.answer;
  END IF;

  IF v_uid IS DISTINCT FROM NEW.psychologist_id THEN
    NEW.time_left_seconds := OLD.time_left_seconds;
    NEW.timer_paused := OLD.timer_paused;
    NEW.timer_updated_at := OLD.timer_updated_at;
  ELSIF OLD.time_left_seconds IS NOT NULL AND NEW.time_left_seconds > OLD.time_left_seconds THEN
    NEW.time_left_seconds := OLD.time_left_seconds;
  END IF;

  IF NEW.ended_by IS NOT NULL AND NEW.ended_by IS DISTINCT FROM OLD.ended_by THEN
    NEW.ended_by := v_uid;
    NEW.ended_by_type := CASE WHEN v_uid = NEW.psychologist_id THEN 'psychologist' ELSE 'patient' END;
  END IF;

  RETURN NEW;
END;
$function$;

-- Antes de track_call_connected (ordem alfabética): ele recalcula
-- connected_at a partir da resposta já filtrada.
DROP TRIGGER IF EXISTS a_guard_webrtc_client_update ON public.webrtc_sessions;
CREATE TRIGGER a_guard_webrtc_client_update
  BEFORE UPDATE ON public.webrtc_sessions
  FOR EACH ROW EXECUTE FUNCTION public.guard_webrtc_client_update();

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.webrtc_sessions;

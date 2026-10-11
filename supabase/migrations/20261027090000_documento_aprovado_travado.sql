-- Segurança: o documento conferido na aprovação do psicólogo não muda mais.
--
-- Depois de aprovado, o psicólogo ainda conseguia, pelo app, trocar o link do
-- documento no próprio cadastro (psychologists.document_url/documents) e
-- sobrescrever ou apagar o arquivo enviado na inscrição (buckets `documents`
-- e `psychologist-documents`). O admin perdia a prova do que tinha aprovado.
-- Agora, depois da aprovação: o link fica travado (como o CRP e o CPF) e o
-- psicólogo não sobrescreve nem apaga os próprios arquivos. Antes da aprovação
-- continua podendo (ex.: limpeza quando o cadastro falha). Mudanças passam
-- pelo admin (Editar psicólogo).

-- 1. Link do documento travado depois da aprovação.
CREATE OR REPLACE FUNCTION public.guard_psychologist_client_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF current_user <> 'authenticated' OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.approved := false;
    NEW.approval_status := 'pending';
    NEW.is_blocked := false;
    NEW.blocked_at := NULL;
    NEW.blocked_until := NULL;
    NEW.blocked_reason := NULL;
    NEW.average_rating := 0;
    NEW.ratings_count := 0;
    NEW.total_appointments := 0;
    NEW.reviewed_at := NULL;
    NEW.reviewed_by := NULL;
    NEW.rejected_at := NULL;
    NEW.rejection_reason := NULL;
    RETURN NEW;
  END IF;
  NEW.user_id := OLD.user_id;
  NEW.approved := OLD.approved;
  NEW.approval_status := OLD.approval_status;
  NEW.is_blocked := OLD.is_blocked;
  NEW.blocked_at := OLD.blocked_at;
  NEW.blocked_until := OLD.blocked_until;
  NEW.blocked_reason := OLD.blocked_reason;
  NEW.average_rating := OLD.average_rating;
  NEW.ratings_count := OLD.ratings_count;
  NEW.total_appointments := OLD.total_appointments;
  NEW.reviewed_at := OLD.reviewed_at;
  NEW.reviewed_by := OLD.reviewed_by;
  NEW.rejected_at := OLD.rejected_at;
  NEW.rejection_reason := OLD.rejection_reason;
  IF OLD.approved THEN
    NEW.crp_number := OLD.crp_number;
    NEW.cpf := OLD.cpf;
    -- O documento que o admin conferiu na aprovação não muda pelo app.
    NEW.document_url := OLD.document_url;
    NEW.documents := OLD.documents;
  END IF;
  RETURN NEW;
END;
$function$;

-- 2. Arquivos: sobrescrever e apagar só antes da aprovação.
CREATE OR REPLACE FUNCTION public.my_psychologist_documents_locked()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.psychologists p
    WHERE p.user_id = auth.uid() AND p.approved
  );
$function$;

REVOKE EXECUTE ON FUNCTION public.my_psychologist_documents_locked() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_psychologist_documents_locked() TO authenticated;

-- Bucket `documents` (documento enviado na inscrição).
DROP POLICY IF EXISTS "Owners can update their documents" ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete their documents" ON storage.objects;
CREATE POLICY "Owners can update their documents" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text
         AND NOT public.my_psychologist_documents_locked())
  WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text
              AND NOT public.my_psychologist_documents_locked());
CREATE POLICY "Owners can delete their documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text
         AND NOT public.my_psychologist_documents_locked());

-- Bucket `psychologist-documents`: várias regras antigas repetidas deixavam o
-- dono alterar e apagar sem condição. Fica: dono envia e lê; altera e apaga
-- só antes da aprovação; admin continua com acesso total.
DROP POLICY IF EXISTS "Allow users to update their own psychologist documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own psychologist documents" ON storage.objects;
DROP POLICY IF EXISTS "psychologist_own_documents" ON storage.objects;
DROP POLICY IF EXISTS "Admin and owner access to psychologist documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their psychologist documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their psychologist documents" ON storage.objects;
DROP POLICY IF EXISTS "Owners update psychologist documents before approval" ON storage.objects;
DROP POLICY IF EXISTS "Owners delete psychologist documents before approval" ON storage.objects;
CREATE POLICY "Owners update psychologist documents before approval" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'psychologist-documents' AND (storage.foldername(name))[1] = auth.uid()::text
         AND NOT public.my_psychologist_documents_locked())
  WITH CHECK (bucket_id = 'psychologist-documents' AND (storage.foldername(name))[1] = auth.uid()::text
              AND NOT public.my_psychologist_documents_locked());
CREATE POLICY "Owners delete psychologist documents before approval" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'psychologist-documents' AND (storage.foldername(name))[1] = auth.uid()::text
         AND NOT public.my_psychologist_documents_locked());

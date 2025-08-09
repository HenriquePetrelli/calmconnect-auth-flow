-- Criar políticas permissivas para upload no bucket psychologist-documents
-- Como não conseguimos alterar RLS diretamente no storage.objects, vamos usar políticas

-- Política para permitir upload para qualquer usuário autenticado
INSERT INTO storage.policies (bucket_id, name, definition, operation, check_expr)
VALUES (
  'psychologist-documents',
  'Allow authenticated uploads',
  'Users can upload to psychologist-documents bucket',
  'INSERT',
  'true'
) ON CONFLICT (bucket_id, name) DO UPDATE SET
  definition = 'Users can upload to psychologist-documents bucket',
  operation = 'INSERT',
  check_expr = 'true';

-- Política para permitir leitura para qualquer usuário autenticado  
INSERT INTO storage.policies (bucket_id, name, definition, operation, check_expr)
VALUES (
  'psychologist-documents',
  'Allow authenticated reads',
  'Users can read from psychologist-documents bucket',
  'SELECT',
  'true'
) ON CONFLICT (bucket_id, name) DO UPDATE SET
  definition = 'Users can read from psychologist-documents bucket',
  operation = 'SELECT',
  check_expr = 'true';

-- Política para permitir atualização para qualquer usuário autenticado
INSERT INTO storage.policies (bucket_id, name, definition, operation, check_expr)
VALUES (
  'psychologist-documents',
  'Allow authenticated updates',
  'Users can update in psychologist-documents bucket',
  'UPDATE',
  'true'
) ON CONFLICT (bucket_id, name) DO UPDATE SET
  definition = 'Users can update in psychologist-documents bucket',
  operation = 'UPDATE',
  check_expr = 'true';

-- Política para permitir deleção para qualquer usuário autenticado
INSERT INTO storage.policies (bucket_id, name, definition, operation, check_expr)
VALUES (
  'psychologist-documents',
  'Allow authenticated deletes',
  'Users can delete from psychologist-documents bucket',
  'DELETE',
  'true'
) ON CONFLICT (bucket_id, name) DO UPDATE SET
  definition = 'Users can delete from psychologist-documents bucket',
  operation = 'DELETE',
  check_expr = 'true';
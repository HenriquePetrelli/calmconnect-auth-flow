-- Tipo e tamanho dos arquivos conferidos também no servidor (parte que ficou
-- de fora de 20261003210511_25be134c-..., o endurecimento de segurança).
--
-- O app já recusa arquivo grande ou de outro tipo, mas só no navegador: pela
-- API dava para subir qualquer coisa (ex.: um .html ou .svg com script, ou
-- arquivos enormes). Arquivos antigos não são afetados.
--
-- Se a migração não puder mexer no schema storage, o mesmo ajuste é feito no
-- painel do Supabase: Storage → cada bucket → Edit bucket → "Restrict file
-- upload size" (10 MB) e "Allowed MIME types" (a lista abaixo).
UPDATE storage.buckets
SET file_size_limit = 10 * 1024 * 1024,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif', 'application/pdf']
WHERE id IN ('documents', 'psychologist-documents', 'payment-receipts');

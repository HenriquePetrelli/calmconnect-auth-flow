-- The 'documents' bucket currently has NO read (SELECT) policy at all —
-- the last one ("Public can read documents") was dropped in an earlier
-- migration to close an unauthenticated-read gap, but nothing replaced
-- it. Two real, currently-live problems follow from that:
--
-- 1. Psychologist verification documents uploaded through self-signup
--    (src/services/psychologist.service.ts, path `${userId}/${file}`)
--    can't be viewed by anyone — not the owning psychologist, not an
--    admin — via the normal client SDK, since RLS denies all reads.
--    Restore SELECT for the owner and for admins, mirroring the INSERT/
--    UPDATE/DELETE owner-folder policies that already exist for this
--    bucket (`(storage.foldername(name))[1] = auth.uid()::text`).
CREATE POLICY "Owners can view their own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Admins can view all documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND public.is_super_admin()
);

-- 2. Chat image uploads (src/hooks/useMensagens.ts uploadImagem) write to
--    `chat-images/{userId}-{timestamp}.{ext}` — folder is the literal
--    string "chat-images", not the uploader's own auth.uid(), so the
--    owner-folder INSERT policy above (and its existing UPDATE/DELETE
--    counterparts) rejects every image send in patient<->psychologist
--    chat. A chat image is inherently meant to be read by the other
--    participant, not just the sender, so an owner-only SELECT policy
--    would only let each side see their own uploads, not what was
--    actually shared with them. Carve out this one subfolder for any
--    authenticated user to read/write — chat image filenames combine a
--    sender id with a millisecond timestamp, which is not realistically
--    guessable, the same trust model already used elsewhere in this app
--    (e.g. FCM push tokens).
CREATE POLICY "Authenticated users can upload chat images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'chat-images'
);

CREATE POLICY "Authenticated users can view chat images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'chat-images'
);

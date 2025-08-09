-- Storage policies for 'documents' bucket to allow uploads and access

-- Allow anyone to read files from the public 'documents' bucket
CREATE POLICY IF NOT EXISTS "Public can read documents"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'documents');

-- Allow authenticated users to upload files to the 'documents' bucket
CREATE POLICY IF NOT EXISTS "Authenticated can upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Allow authenticated users to update files in the 'documents' bucket
CREATE POLICY IF NOT EXISTS "Authenticated can update documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'documents');

-- Allow authenticated users to delete files in the 'documents' bucket
CREATE POLICY IF NOT EXISTS "Authenticated can delete documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documents');
-- Create storage bucket for psychologist documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'psychologist-documents', 
  'psychologist-documents', 
  false,
  5242880, -- 5MB in bytes
  ARRAY['image/*', 'application/pdf']
);

-- Create RLS policy for document upload
CREATE POLICY "Authenticated users can upload their own documents" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'psychologist-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create RLS policy for viewing own documents
CREATE POLICY "Users can view their own documents" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (
  bucket_id = 'psychologist-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Update psychologists table RLS policies
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON psychologists;

-- Allow initial psychologist registration
CREATE POLICY "Allow psychologist registration" 
ON psychologists 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own psychologist profile
CREATE POLICY "Users can update their own psychologist profile" 
ON psychologists 
FOR UPDATE 
USING (auth.uid() = user_id);
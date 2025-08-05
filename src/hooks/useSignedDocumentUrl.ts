import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useSignedDocumentUrl = (documentPath?: string) => {
  const [signedUrl, setSignedUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchSignedUrl = async () => {
      if (!documentPath) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(false);

        const { data, error } = await supabase.storage
          .from('psychologist-documents')
          .createSignedUrl(documentPath, 3600); // Expira em 1 hora

        if (error) {
          console.error('Error creating signed URL:', error);
          throw error;
        }

        setSignedUrl(data.signedUrl);
      } catch (err) {
        console.error('Error generating signed URL:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchSignedUrl();
  }, [documentPath]);

  return { signedUrl, loading, error };
};
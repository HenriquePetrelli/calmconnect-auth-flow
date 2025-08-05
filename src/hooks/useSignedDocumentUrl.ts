import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useSignedDocumentUrl = (documentPath?: string) => {
  const [signedUrl, setSignedUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSignedUrl = async () => {
      if (!documentPath) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Tentar criar URL assinada com tempo de expiração de 1 hora
        const { data, error: urlError } = await supabase.storage
          .from('psychologist-documents')
          .createSignedUrl(documentPath, 3600);

        if (urlError) {
          console.error('Storage error creating signed URL:', urlError);
          throw new Error(`Erro ao acessar documento: ${urlError.message}`);
        }

        if (!data?.signedUrl) {
          throw new Error('URL assinada não foi gerada');
        }

        setSignedUrl(data.signedUrl);
      } catch (err) {
        console.error('Error generating signed URL:', err);
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao carregar documento';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchSignedUrl();
  }, [documentPath]);

  const retry = () => {
    if (documentPath) {
      setError(null);
      setLoading(true);
      // Trigger useEffect again by updating the dependency
      const fetchAgain = async () => {
        try {
          const { data, error: urlError } = await supabase.storage
            .from('psychologist-documents')
            .createSignedUrl(documentPath, 3600);

          if (urlError) throw new Error(`Erro ao acessar documento: ${urlError.message}`);
          if (!data?.signedUrl) throw new Error('URL assinada não foi gerada');

          setSignedUrl(data.signedUrl);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao carregar documento';
          setError(errorMessage);
        } finally {
          setLoading(false);
        }
      };
      fetchAgain();
    }
  };

  return { signedUrl, loading, error, retry };
};
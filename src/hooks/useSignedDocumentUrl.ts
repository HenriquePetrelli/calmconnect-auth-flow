import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useSignedDocumentUrl = (documentPath?: string) => {
  const [signedUrl, setSignedUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSignedUrl = async () => {
    if (!documentPath) {
      setLoading(false);
      setSignedUrl('');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: urlError } = await supabase.storage
        .from('psychologist-documents')
        .createSignedUrl(documentPath, 3600); // 1 hora de expiração

      if (urlError) {
        throw new Error(`Erro ao gerar URL assinada: ${urlError.message}`);
      }

      if (!data?.signedUrl) {
        throw new Error('URL assinada não foi gerada');
      }

      // Verificação opcional de acessibilidade
      const testResponse = await fetch(data.signedUrl, { method: 'HEAD' });
      if (!testResponse.ok) {
        throw new Error(`Documento não acessível (status ${testResponse.status})`);
      }

      setSignedUrl(data.signedUrl);
    } catch (err) {
      console.error('Error generating signed URL:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignedUrl();
  }, [documentPath]);

  const retry = () => {
    fetchSignedUrl();
  };

  return { 
    signedUrl, 
    loading, 
    error, 
    retry 
  };
};
import { useCallback, useEffect, useRef, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { chatImagePath } from '@/lib/chatImage';

/** Validade do link temporário e quando renovar (antes de vencer). */
const VALIDADE_S = 60 * 60;
const RENOVAR_MS = 50 * 60 * 1000;

/**
 * Imagem do chat: gera um link temporário (o bucket é privado).
 * Com a conversa aberta por mais de uma hora, o link vencia e a foto não
 * abria mais; agora ele é renovado antes de vencer e, se a foto falhar ao
 * carregar, uma vez na hora.
 */
const ChatImage = ({ value, alt, className }: { value: string; alt: string; className?: string }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const tentouDeNovoRef = useRef(false);
  const montadoRef = useRef(true);

  const assinar = useCallback(async () => {
    const path = chatImagePath(value);
    if (!path) {
      setFailed(true);
      return;
    }
    const { data, error } = await supabase.storage.from('documents').createSignedUrl(path, VALIDADE_S);
    if (!montadoRef.current) return;
    if (error || !data?.signedUrl) setFailed(true);
    else {
      setFailed(false);
      setUrl(data.signedUrl);
    }
  }, [value]);

  useEffect(() => {
    montadoRef.current = true;
    tentouDeNovoRef.current = false;
    void assinar();
    const timer = window.setInterval(() => void assinar(), RENOVAR_MS);
    return () => {
      montadoRef.current = false;
      window.clearInterval(timer);
    };
  }, [assinar]);

  const aoFalhar = () => {
    if (tentouDeNovoRef.current) {
      setFailed(true);
      return;
    }
    tentouDeNovoRef.current = true;
    void assinar();
  };

  if (failed) {
    return (
      <span className="flex h-24 w-40 items-center justify-center gap-2 rounded-lg bg-muted text-xs text-muted-foreground">
        <ImageOff className="h-4 w-4" aria-hidden="true" />
        Imagem indisponível
      </span>
    );
  }
  if (!url) return <span className="block h-40 w-48 animate-pulse rounded-lg bg-muted" aria-label="Carregando imagem" />;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <img src={url} alt={alt} className={className} loading="lazy" onError={aoFalhar} />
    </a>
  );
};

export default ChatImage;

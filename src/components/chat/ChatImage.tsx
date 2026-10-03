import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { chatImagePath } from '@/lib/chatImage';

/** Imagem do chat: gera um link temporário (o bucket é privado). */
const ChatImage = ({ value, alt, className }: { value: string; alt: string; className?: string }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const path = chatImagePath(value);
    if (!path) {
      setFailed(true);
      return;
    }
    supabase.storage
      .from('documents')
      .createSignedUrl(path, 60 * 60)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data?.signedUrl) setFailed(true);
        else setUrl(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [value]);

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
      <img src={url} alt={alt} className={className} loading="lazy" />
    </a>
  );
};

export default ChatImage;

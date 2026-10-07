import { useEffect, useRef, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { MicOff, SignalLow, SignalMedium } from 'lucide-react';
import { cn } from '@/lib/utils';
import { initialsOf } from '@/lib/initials';
import { useAudioLevel } from '@/hooks/useAudioLevel';
import type { NetworkQuality } from '@/lib/callNegotiation';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Peças visuais da sala de chamada (SOS e consulta), no padrão do Google Meet:
 * palco escuro e neutro, cada participante num quadro com o nome e o
 * microfone juntos no canto, e barra de controles redonda embaixo.
 * Sem gradientes: cores sólidas, iguais nos temas claro e escuro.
 */


/** `play()` devolve promessa só nos navegadores atuais; recusa (autoplay) não é erro. */
const safePlay = (el: HTMLVideoElement | null) => {
  try {
    const result = el?.play?.();
    if (result && typeof result.catch === 'function') result.catch(() => undefined);
  } catch {
    /* noop */
  }
};

/** Mostra o stream num <video> que nunca é desmontado (a imagem volta na hora). */
function StreamVideo({ stream, muted, mirrored, hidden, testId }: {
  stream: MediaStream | null;
  muted?: boolean;
  mirrored?: boolean;
  hidden?: boolean;
  testId?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== stream) el.srcObject = stream;
    if (stream) safePlay(el);
  }, [stream]);
  // A câmera religada reaproveita o mesmo stream: garante que o vídeo volte a tocar.
  useEffect(() => {
    if (!hidden && stream) safePlay(ref.current);
  }, [hidden, stream]);

  return (
    <video
      ref={ref}
      data-testid={testId}
      autoPlay
      playsInline
      muted={muted}
      className={cn(
        'absolute inset-0 h-full w-full object-cover transition-opacity duration-200',
        mirrored && '-scale-x-100',
        hidden ? 'opacity-0' : 'opacity-100',
      )}
    />
  );
}

/** Microfone ao lado do nome: desligado (vermelho) ou falando (barras animadas). */
export function MicBadge({ muted, speaking, level }: { muted: boolean; speaking: boolean; level: number }) {
  if (muted) {
    return (
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-destructive text-white"
        aria-label="Microfone desligado"
        title="Microfone desligado"
      >
        <MicOff className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    );
  }
  const bars = [0.55, 1, 0.75].map((scale) => Math.max(0.2, speaking ? Math.min(1, level * 1.6 * scale + 0.2) : 0.2));
  return (
    <span
      className={cn(
        'flex h-6 w-6 shrink-0 items-center justify-center gap-[2px] rounded-full transition-colors',
        speaking ? 'bg-primary' : 'bg-zinc-700',
      )}
      aria-label={speaking ? 'Falando' : 'Microfone ligado'}
    >
      {bars.map((height, i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-white transition-[height] duration-100"
          style={{ height: `${Math.round(height * 12)}px` }}
        />
      ))}
    </span>
  );
}

export function QualityBadge({ quality }: { quality: NetworkQuality }) {
  if (quality === 'good') return null;
  const Icon = quality === 'poor' ? SignalLow : SignalMedium;
  return (
    <span
      className={cn(
        'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white',
        quality === 'poor' ? 'bg-destructive/90' : 'bg-zinc-900/80',
      )}
      role="status"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {quality === 'poor' ? 'Conexão instável' : 'Conexão lenta'}
    </span>
  );
}

interface ParticipantTileProps {
  name: string;
  /** Nome usado nas iniciais do avatar, quando o rótulo é outro (ex.: "Você"). */
  avatarName?: string;
  stream: MediaStream | null;
  cameraOff: boolean;
  muted: boolean;
  /** Seu próprio quadro: espelhado e sem áudio (para não ouvir o próprio eco). */
  self?: boolean;
  /** Texto no lugar do vídeo (ex.: "Aguardando o psicólogo entrar..."). */
  placeholder?: ReactNode;
  topRight?: ReactNode;
  compact?: boolean;
  className?: string;
  testId?: string;
}

/** Quadro de um participante: vídeo, avatar quando a câmera está desligada e nome com microfone. */
export function ParticipantTile({
  name,
  avatarName,
  stream,
  cameraOff,
  muted,
  self,
  placeholder,
  topRight,
  compact,
  className,
  testId,
}: ParticipantTileProps) {
  const { speaking, level } = useAudioLevel(stream, !muted);
  const hasVideo = Boolean(stream?.getVideoTracks().length);
  const showAvatar = cameraOff || !hasVideo || Boolean(placeholder);

  return (
    <div
      data-testid={testId}
      className={cn(
        'relative overflow-hidden rounded-2xl bg-zinc-800 ring-2 transition-shadow',
        speaking && !muted ? 'ring-primary' : 'ring-transparent',
        className,
      )}
    >
      <StreamVideo stream={stream} muted={self} mirrored={self} hidden={showAvatar} testId={testId ? `${testId}-video` : undefined} />

      {showAvatar && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center">
          <div
            className={cn(
              'flex items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground',
              compact ? 'h-12 w-12 text-base' : 'h-24 w-24 text-3xl md:h-28 md:w-28',
            )}
            aria-hidden="true"
          >
            {initialsOf(avatarName || name)}
          </div>
          {!compact && placeholder && <div className="max-w-xs text-sm text-zinc-300">{placeholder}</div>}
        </div>
      )}

      {topRight && <div className="absolute right-3 top-3 z-10">{topRight}</div>}

      <div className={cn('absolute z-10 flex max-w-[calc(100%-1rem)] items-center gap-2', compact ? 'bottom-2 left-2' : 'bottom-3 left-3')}>
        <span
          className={cn(
            'truncate rounded-lg bg-zinc-900/75 font-medium text-white',
            compact ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
          )}
        >
          {name}
        </span>
        <MicBadge muted={muted} speaking={speaking} level={level} />
      </div>
    </div>
  );
}

interface ControlButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  /** Recurso desligado (microfone/câmera): fica vermelho, como no Meet. */
  off?: boolean;
  /** Painel aberto (ex.: contexto do paciente). */
  active?: boolean;
  disabled?: boolean;
  shortcut?: string;
}

export function ControlButton({ icon: Icon, label, onClick, off, active, disabled, shortcut }: ControlButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          aria-pressed={active ?? off}
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-full text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:opacity-50',
            off ? 'bg-destructive hover:bg-destructive/90' : active ? 'bg-primary hover:bg-primary/90' : 'bg-zinc-700 hover:bg-zinc-600',
          )}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">
        {label}
        {shortcut && <span className="ml-1.5 text-muted-foreground">{shortcut}</span>}
      </TooltipContent>
    </Tooltip>
  );
}

export interface BlockInfo {
  is_blocked?: boolean | null;
  blocked_until?: string | null;
  blocked_reason?: string | null;
  blocked_at?: string | null;
}

export const BLOCK_DURATIONS: { value: string; label: string }[] = [
  { value: '24h', label: '24 horas' },
  { value: '48h', label: '48 horas' },
  { value: '1w', label: '1 semana' },
  { value: '2w', label: '2 semanas' },
  { value: '1m', label: '1 mês' },
  { value: '1y', label: '1 ano' },
  { value: 'forever', label: 'Para sempre' },
];

export const isCurrentlyBlocked = (p?: BlockInfo | null): boolean => {
  if (!p?.is_blocked) return false;
  if (!p.blocked_until) return true;
  return new Date(p.blocked_until).getTime() > Date.now();
};

export const formatBlockPeriod = (p?: BlockInfo | null): string => {
  if (!p?.blocked_until) return 'Bloqueio permanente';
  return `Bloqueado até ${new Date(p.blocked_until).toLocaleString('pt-BR')}`;
};

export const formatRemainingTime = (blockedUntil?: string | null): string => {
  if (!blockedUntil) return 'Permanente';
  const diff = new Date(blockedUntil).getTime() - Date.now();
  if (diff <= 0) return 'Expirado';
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  const parts: string[] = [];
  if (days) parts.push(`${days} ${days === 1 ? 'dia' : 'dias'}`);
  if (hours) parts.push(`${hours}h`);
  if (!days && minutes) parts.push(`${minutes}min`);
  return parts.join(' ') || 'menos de 1 minuto';
};

const BLOCK_TOAST_ID = 'psychologist-blocked';
let lastBlockToastAt = 0;

/**
 * Exibe UM único alerta de acesso bloqueado (deduplicado por id + janela de tempo),
 * evitando toasts repetidos quando múltiplos guards detectam o bloqueio ao mesmo tempo.
 */
export const notifyBlockedAccess = async (p?: BlockInfo | null) => {
  const now = Date.now();
  if (now - lastBlockToastAt < 5000) return;
  lastBlockToastAt = now;

  const periodo = p?.blocked_until
    ? `até ${new Date(p.blocked_until).toLocaleString('pt-BR')} (${formatRemainingTime(p.blocked_until)} restantes)`
    : 'permanentemente';

  const { toast } = await import('sonner');
  toast.error('Acesso bloqueado', {
    id: BLOCK_TOAST_ID,
    description: `Seu acesso está bloqueado ${periodo}. Motivo: ${p?.blocked_reason || 'não informado'}`,
    duration: 8000,
  });
};

import { describeEndReason } from '@/lib/emergencyEndReasons';

/** Canonical `emergency_requests.status` values, translated for the UI. */
export const SOS_STATUS_LABELS: Record<string, string> = {
  pending: 'Aguardando',
  accepted: 'Aceita',
  in_progress: 'Em andamento',
  completed: 'Concluída',
  cancelled: 'Cancelada',
};

export type SosStatusTone = 'neutral' | 'active' | 'success' | 'muted';

export const sosStatusLabel = (status?: string | null): string =>
  (status && SOS_STATUS_LABELS[status]) || 'Desconhecido';

export const sosStatusTone = (status?: string | null): SosStatusTone => {
  switch (status) {
    case 'completed':
      return 'success';
    case 'accepted':
    case 'in_progress':
      return 'active';
    case 'cancelled':
      return 'muted';
    default:
      return 'neutral';
  }
};

/** Tailwind classes per tone — semantic tokens only. */
export const SOS_TONE_CLASS: Record<SosStatusTone, string> = {
  success: 'bg-primary/10 text-primary border-primary/20',
  active: 'bg-secondary/10 text-secondary border-secondary/20',
  muted: 'bg-muted text-muted-foreground border-border',
  neutral: 'bg-accent/10 text-accent-foreground border-border',
};

/** Seconds -> "12min 30s" / "45s" / "1h 05min". */
export const formatDuration = (seconds?: number | null): string => {
  if (!seconds || seconds <= 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`;
  if (m > 0) return `${m}min ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
};

/** 0..100 -> "87,5%"; treats missing/zero as "—" since it means no data yet. */
export const formatPercent = (value?: number | null): string =>
  value ? `${value.toString().replace('.', ',')}%` : '—';

/** 1..5 -> "4,8 ★"; 0 means no feedback recorded yet. */
export const formatRating = (value?: number | null): string =>
  value ? `${value.toString().replace('.', ',')} ★` : '—';

export const formatDateTime = (value?: string | null): string =>
  value ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

export const endedByLabel = (endedByType?: string | null): string => {
  switch (endedByType) {
    case 'patient':
      return 'Paciente';
    case 'psychologist':
      return 'Psicólogo';
    case 'system':
      return 'Sistema';
    default:
      return '—';
  }
};

export { describeEndReason };

export interface SosHistoryRow {
  id: string;
  created_at: string;
  accepted_at: string | null;
  ended_at: string | null;
  status: string;
  duration: number | null;
  end_reason: string | null;
  ended_by_type: string | null;
  crisis_resolved: boolean | null;
}

export const SOS_HISTORY_SELECT =
  'id, created_at, accepted_at, ended_at, status, duration, end_reason, ended_by_type, crisis_resolved';

/** Seconds between request creation and acceptance, when both are known. */
export const waitSeconds = (row: SosHistoryRow): number | null => {
  if (!row.accepted_at) return null;
  return Math.max(0, Math.round((new Date(row.accepted_at).getTime() - new Date(row.created_at).getTime()) / 1000));
};

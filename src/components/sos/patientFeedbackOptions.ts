/**
 * Structured patient feedback for SOS calls.
 *
 * Clinical outcome (did it help?) and perceived quality (rating) are kept as
 * separate metrics on purpose: an unresolved crisis is NOT a bad psychologist.
 */

export type ResolutionStatus = 'resolved' | 'partially_resolved' | 'not_resolved';
export type FeltHeard = 'yes' | 'partially' | 'no';

export const RESOLUTION_OPTIONS: { value: ResolutionStatus; label: string }[] = [
  { value: 'resolved', label: 'Sim, conseguiu me ajudar' },
  { value: 'partially_resolved', label: 'Ajudou parcialmente' },
  { value: 'not_resolved', label: 'Não conseguiu me ajudar' },
];

export const FELT_HEARD_OPTIONS: { value: FeltHeard; label: string }[] = [
  { value: 'yes', label: 'Sim' },
  { value: 'partially', label: 'Mais ou menos' },
  { value: 'no', label: 'Não' },
];

export interface ComplaintOption {
  value: string;
  label: string;
  /** Conduct-related answers flag the feedback for administrative review. */
  conduct?: boolean;
}

export const COMPLAINT_OPTIONS: ComplaintOption[] = [
  { value: 'ended_too_early', label: 'O atendimento foi encerrado antes de eu me sentir preparado', conduct: true },
  { value: 'not_helpful', label: 'Senti que o psicólogo não conseguiu me ajudar' },
  { value: 'not_listened', label: 'Senti que não fui ouvido ou compreendido' },
  { value: 'not_welcoming', label: 'O atendimento não foi acolhedor', conduct: true },
  { value: 'rude', label: 'O psicólogo foi pouco acolhedor', conduct: true },
  { value: 'disrespectful', label: 'O psicólogo foi desrespeitoso ou grosseiro', conduct: true },
  { value: 'connection', label: 'Tive problemas de conexão' },
  { value: 'audio_video', label: 'Tive problemas com áudio ou vídeo' },
  { value: 'could_not_explain', label: 'Não consegui explicar adequadamente o que estava acontecendo' },
  { value: 'other', label: 'Outro' },
];

const CONDUCT_VALUES = new Set(COMPLAINT_OPTIONS.filter((o) => o.conduct).map((o) => o.value));

export const hasConductComplaint = (categories: string[]): boolean =>
  categories.some((c) => CONDUCT_VALUES.has(c));

/** Legacy column kept in sync so older reports keep working. */
export const legacyProblemResolved = (status: ResolutionStatus | ''): string | null => {
  if (status === 'resolved') return 'yes';
  if (status === 'partially_resolved') return 'partially';
  if (status === 'not_resolved') return 'no';
  return null;
};

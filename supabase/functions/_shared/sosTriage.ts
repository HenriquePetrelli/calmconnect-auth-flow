// Triagem do SOS no servidor: mesmas chaves de src/lib/sosTriage.ts e da
// restrição do banco (emergency_requests.triage).
export const SOS_TRIAGE_KEYS = ['suicidio', 'panico', 'ansiedade', 'tristeza', 'acontecimento', 'perigo', 'outro'] as const;

export const sanitizeTriage = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const chosen = new Set(value.filter((v): v is string => typeof v === 'string'));
  return SOS_TRIAGE_KEYS.filter((k) => chosen.has(k));
};

export const isPriorityTriage = (triage: unknown): boolean =>
  Array.isArray(triage) && (triage.includes('suicidio') || triage.includes('perigo'));

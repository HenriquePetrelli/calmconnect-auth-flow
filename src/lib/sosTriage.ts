/**
 * Triagem rápida do SOS: o paciente marca (se quiser) o que está sentindo na
 * tela "Precisa de ajuda agora?". Nada é obrigatório. O pedido vai para todos
 * os psicólogos online, como sempre; a triagem só informa quem vai atender e
 * coloca na frente da fila os pedidos com risco.
 *
 * As chaves são as mesmas que o banco aceita (emergency_requests.triage).
 */
export const SOS_TRIAGE_OPTIONS = [
  { key: 'suicidio', label: 'Pensamentos de suicídio ou de me machucar' },
  { key: 'panico', label: 'Crise de pânico' },
  { key: 'ansiedade', label: 'Crise de ansiedade' },
  { key: 'tristeza', label: 'Tristeza muito forte ou desesperança' },
  { key: 'acontecimento', label: 'Passei por algo difícil agora' },
  { key: 'perigo', label: 'Estou em perigo ou sofri violência' },
  { key: 'outro', label: 'Outra coisa' },
] as const;

export type SosTriageKey = (typeof SOS_TRIAGE_OPTIONS)[number]['key'];

const KEYS = SOS_TRIAGE_OPTIONS.map((o) => o.key) as readonly string[];

/** Só as opções conhecidas, sem repetir, na ordem da lista. */
export const sanitizeTriage = (value: unknown): SosTriageKey[] => {
  if (!Array.isArray(value)) return [];
  const chosen = new Set(value.filter((v): v is string => typeof v === 'string'));
  return KEYS.filter((k) => chosen.has(k)) as SosTriageKey[];
};

export const triageLabel = (key: string): string =>
  SOS_TRIAGE_OPTIONS.find((o) => o.key === key)?.label ?? key;

/** Risco de suicídio ou de se machucar. */
export const hasSelfHarmRisk = (triage: readonly string[] | null | undefined) => Boolean(triage?.includes('suicidio'));

/** Perigo por causa de outra pessoa ou violência. */
export const hasDangerRisk = (triage: readonly string[] | null | undefined) => Boolean(triage?.includes('perigo'));

/** Vai para a frente da fila do psicólogo. */
export const isPriorityTriage = (triage: readonly string[] | null | undefined) =>
  hasSelfHarmRisk(triage) || hasDangerRisk(triage);

// A tela de confirmação e a do SOS são componentes diferentes; a escolha passa
// de uma para a outra pela sessão do navegador e é apagada ao ser usada.
const STORAGE_KEY = 'sos:triagem';

export const saveSosTriage = (triage: readonly string[]) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeTriage(triage)));
  } catch {
    // Sem armazenamento: o SOS segue sem triagem.
  }
};

export const takeSosTriage = (): SosTriageKey[] => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    return raw ? sanitizeTriage(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
};

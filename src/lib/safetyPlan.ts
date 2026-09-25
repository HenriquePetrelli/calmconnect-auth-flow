/**
 * Safety plan content model (Stanley & Brown Safety Planning Intervention),
 * shared by the patient's editor and the psychologist's read-only view.
 *
 * Suggestions exist because "list your warning signs" on a blank screen is a
 * hard question — tapping a close-enough example and editing it is easier.
 */

export type SafetyPlanListKey =
  | 'warning_signs'
  | 'coping_strategies'
  | 'distractions'
  | 'safe_environment'
  | 'reasons_to_live';

export interface SafetyPlanSection {
  key: SafetyPlanListKey;
  title: string;
  /** Question asked to the patient while filling in. */
  prompt: string;
  /** Short label for the psychologist's view. */
  shortLabel: string;
  suggestions: string[];
}

export const SAFETY_PLAN_SECTIONS: SafetyPlanSection[] = [
  {
    key: 'warning_signs',
    title: 'Sinais de alerta',
    shortLabel: 'Sinais de alerta',
    prompt: 'O que costuma acontecer com você antes de uma crise? Pensamentos, sensações, situações.',
    suggestions: [
      'Não consigo dormir',
      'Me isolo das pessoas',
      'Pensamentos repetitivos que não param',
      'Coração acelerado e falta de ar',
      'Sinto que sou um peso para os outros',
      'Brigas ou conflitos em casa',
    ],
  },
  {
    key: 'coping_strategies',
    title: 'O que eu posso fazer sozinho',
    shortLabel: 'Estratégias próprias',
    prompt: 'Coisas que ajudam você a atravessar o momento sem precisar de ninguém.',
    suggestions: [
      'Exercício de respiração do app',
      'Tomar um banho demorado',
      'Caminhar um pouco',
      'Ouvir uma música que me acalma',
      'Escrever no diário',
      'Segurar gelo ou lavar o rosto com água fria',
    ],
  },
  {
    key: 'distractions',
    title: 'Pessoas e lugares que me distraem',
    shortLabel: 'Distrações',
    prompt: 'Onde você pode ir, ou com quem pode estar, para mudar o foco — mesmo sem falar do que sente.',
    suggestions: [
      'Ir à casa de um amigo',
      'Ficar num café ou praça movimentada',
      'Ligar para alguém só para conversar',
      'Brincar com meu animal de estimação',
    ],
  },
  {
    key: 'safe_environment',
    title: 'Como deixar o ambiente mais seguro',
    shortLabel: 'Ambiente seguro',
    prompt: 'O que você pode afastar ou pedir para alguém guardar durante uma crise.',
    suggestions: [
      'Pedir para alguém guardar meus remédios',
      'Não ficar sozinho em casa',
      'Tirar objetos cortantes do quarto',
      'Evitar álcool',
    ],
  },
  {
    key: 'reasons_to_live',
    title: 'Minhas razões para seguir',
    shortLabel: 'Razões para seguir',
    prompt: 'O que é importante para você e vale a pena proteger.',
    suggestions: ['Minha família', 'Meus amigos', 'Meu animal de estimação', 'Meus planos para o futuro', 'Minha fé'],
  },
];

export const MAX_ITEMS_PER_SECTION = 20;
export const MAX_ITEM_LENGTH = 200;

export type SafetyPlanLists = Record<SafetyPlanListKey, string[]>;

export const emptySafetyPlan = (): SafetyPlanLists => ({
  warning_signs: [],
  coping_strategies: [],
  distractions: [],
  safe_environment: [],
  reasons_to_live: [],
});

/** Adds an item unless empty or already present (case-insensitive). */
export const addItem = (list: string[], raw: string): string[] => {
  const item = raw.trim().slice(0, MAX_ITEM_LENGTH);
  if (!item) return list;
  if (list.some((existing) => existing.toLowerCase() === item.toLowerCase())) return list;
  if (list.length >= MAX_ITEMS_PER_SECTION) return list;
  return [...list, item];
};

/** How many of the plan's parts have something in them (contacts count as one). */
export const countFilledSections = (plan: SafetyPlanLists, contactsCount: number): number =>
  SAFETY_PLAN_SECTIONS.filter((s) => plan[s.key].length > 0).length + (contactsCount > 0 ? 1 : 0);

export const TOTAL_PLAN_PARTS = SAFETY_PLAN_SECTIONS.length + 1;

/** Accepts Brazilian phone formats; keeps digits, +, spaces, parens, dashes. */
export const isValidPhone = (phone: string): boolean => {
  const trimmed = phone.trim();
  if (!/^[0-9+() -]{8,20}$/.test(trimmed)) return false;
  return trimmed.replace(/\D/g, '').length >= 8;
};

/** `tel:` href with only what a dialer understands. */
export const telHref = (phone: string): string => `tel:${phone.replace(/[^0-9+]/g, '')}`;

// --- Invite on the home screen (P3) ---------------------------------------
// Offered on the home screen, never on the SOS screen: someone who just
// pressed the emergency button is in crisis and must not be handed a form.

export const SAFETY_PLAN_INVITE_KEY = 'soliv-safety-plan-invite-dismissed-at';
export const SAFETY_PLAN_INVITE_SNOOZE_DAYS = 14;

export const isInviteSnoozed = (dismissedAtIso: string | null, now: number = Date.now()): boolean => {
  if (!dismissedAtIso) return false;
  const at = new Date(dismissedAtIso).getTime();
  if (Number.isNaN(at)) return false;
  return now - at < SAFETY_PLAN_INVITE_SNOOZE_DAYS * 24 * 60 * 60 * 1000;
};

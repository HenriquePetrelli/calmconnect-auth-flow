// Meus hábitos: catálogo, contas e marcos. Tudo aqui é puro (sem Supabase)
// para ser testado sem o app.
//
// Referências de mercado: QuitNow! e Smoke Free (tempo sem fumar, cigarros
// evitados, dinheiro economizado, vida recuperada e marcos de saúde da OMS),
// I Am Sober (contador de dias, dinheiro, marcos de 1 dia a 1 ano, recaída sem
// apagar a história) e Waterllama/WaterMinder (meta pelo peso, copos rápidos,
// sequência de dias e lembretes só enquanto a meta não foi batida).

export type HabitKind = "water" | "sleep" | "movement" | "quit_smoking" | "quit_alcohol" | "quit_custom";
export type DailyHabitKind = Extract<HabitKind, "water" | "sleep" | "movement">;
export type QuitHabitKind = Extract<HabitKind, "quit_smoking" | "quit_alcohol" | "quit_custom">;

export interface HabitSettings {
  // Água
  cup_sizes?: number[];
  weight_kg?: number;
  // Cigarro
  cigarettes_per_day?: number;
  cigarettes_per_pack?: number;
  pack_price?: number;
  // Álcool
  drinks_per_week?: number;
  price_per_drink?: number;
  // Outro hábito
  daily_cost?: number;
  // Todos os de parar
  reason?: string;
}

export interface UserHabit {
  id: string;
  user_id: string;
  kind: HabitKind;
  title: string | null;
  daily_goal: number | null;
  quit_started_at: string | null;
  best_streak_seconds: number;
  settings: HabitSettings;
  reminders_enabled: boolean;
  reminder_start: string;
  reminder_end: string;
  reminder_interval_minutes: number | null;
  timezone: string;
  archived_at: string | null;
  created_at: string;
}

export type HabitEventKind = "intake" | "relapse" | "craving";

export interface HabitEvent {
  id: string;
  habit_id: string;
  kind: HabitEventKind;
  amount: number | null;
  local_date: string;
  occurred_at: string;
  details: Record<string, unknown>;
}

export const MAX_ACTIVE_HABITS = 10;

export interface HabitCatalogEntry {
  kind: HabitKind;
  group: "daily" | "quit";
  title: string;
  description: string;
  /** Unidade da meta diária (hábitos do dia). */
  unit?: "ml" | "h" | "min";
  defaultGoal?: number;
  goalStep?: number;
  goalMin?: number;
  goalMax?: number;
  /** Botões de registro rápido (hábitos do dia). */
  quickAmounts?: number[];
  defaultSettings: HabitSettings;
  /** Lembrete padrão sugerido ao criar. */
  defaultReminder: { start: string; end: string; interval: number | null };
}

export const HABIT_CATALOG: Record<HabitKind, HabitCatalogEntry> = {
  water: {
    kind: "water",
    group: "daily",
    title: "Beber água",
    description: "Meta diária de água, copos rápidos e lembretes ao longo do dia.",
    unit: "ml",
    defaultGoal: 2000,
    goalStep: 50,
    goalMin: 500,
    goalMax: 6000,
    quickAmounts: [200, 300, 500],
    defaultSettings: { cup_sizes: [200, 300, 500] },
    defaultReminder: { start: "08:00", end: "22:00", interval: 120 },
  },
  sleep: {
    kind: "sleep",
    group: "daily",
    title: "Dormir bem",
    description: "Anote quantas horas dormiu e acompanhe a regularidade do sono.",
    unit: "h",
    defaultGoal: 8,
    goalStep: 0.5,
    goalMin: 4,
    goalMax: 12,
    quickAmounts: [6, 7, 8],
    defaultSettings: {},
    defaultReminder: { start: "08:30", end: "09:30", interval: null },
  },
  movement: {
    kind: "movement",
    group: "daily",
    title: "Movimentar o corpo",
    description: "Caminhada, dança, alongamento: some os minutos do dia.",
    unit: "min",
    // OMS: 150 minutos por semana, cerca de 30 por dia em 5 dias.
    defaultGoal: 30,
    goalStep: 5,
    goalMin: 5,
    goalMax: 240,
    quickAmounts: [10, 20, 30],
    defaultSettings: {},
    defaultReminder: { start: "18:00", end: "19:00", interval: null },
  },
  quit_smoking: {
    kind: "quit_smoking",
    group: "quit",
    title: "Parar de fumar",
    description: "Tempo sem fumar, cigarros evitados, dinheiro economizado e como o corpo se recupera.",
    defaultSettings: { cigarettes_per_day: 10, cigarettes_per_pack: 20, pack_price: 12 },
    defaultReminder: { start: "09:00", end: "21:00", interval: null },
  },
  quit_alcohol: {
    kind: "quit_alcohol",
    group: "quit",
    title: "Parar de beber",
    description: "Dias sem álcool, doses evitadas, dinheiro e calorias que ficaram de fora.",
    defaultSettings: { drinks_per_week: 10, price_per_drink: 10 },
    defaultReminder: { start: "09:00", end: "21:00", interval: null },
  },
  quit_custom: {
    kind: "quit_custom",
    group: "quit",
    title: "Largar outro hábito",
    description: "Refrigerante, apostas, redes sociais à noite… você escolhe o nome.",
    defaultSettings: { daily_cost: 0 },
    defaultReminder: { start: "09:00", end: "21:00", interval: null },
  },
};

export const DAILY_HABIT_KINDS: DailyHabitKind[] = ["water", "sleep", "movement"];
export const QUIT_HABIT_KINDS: QuitHabitKind[] = ["quit_smoking", "quit_alcohol", "quit_custom"];

export const isQuitHabit = (kind: HabitKind): kind is QuitHabitKind => kind.startsWith("quit_");

export const habitTitle = (habit: Pick<UserHabit, "kind" | "title">): string =>
  habit.kind === "quit_custom" && habit.title ? `Sem ${habit.title.toLowerCase()}` : HABIT_CATALOG[habit.kind].title;

/** "sem fumar", "sem álcool", "sem refrigerante": completa "12 dias ___". */
export const quitLabel = (habit: Pick<UserHabit, "kind" | "title">): string => {
  if (habit.kind === "quit_smoking") return "sem fumar";
  if (habit.kind === "quit_alcohol") return "sem álcool";
  return `sem ${(habit.title ?? "").toLowerCase()}`;
};

// ---------------------------------------------------------------- datas

const DAY_SECONDS = 86_400;

/** "YYYY-MM-DD" no fuso do aparelho. */
export const localDateString = (date: Date = new Date()): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const addDays = (isoDate: string, days: number): string => {
  const [y, m, d] = isoDate.split("-").map(Number);
  return localDateString(new Date(y, m - 1, d + days));
};

export const elapsedSeconds = (startIso: string, now: Date = new Date()): number =>
  Math.max(0, Math.floor((now.getTime() - new Date(startIso).getTime()) / 1000));

export interface DurationParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export const splitDuration = (totalSeconds: number): DurationParts => ({
  days: Math.floor(totalSeconds / DAY_SECONDS),
  hours: Math.floor((totalSeconds % DAY_SECONDS) / 3600),
  minutes: Math.floor((totalSeconds % 3600) / 60),
  seconds: totalSeconds % 60,
});

export const formatDurationShort = (totalSeconds: number): string => {
  const { days, hours, minutes } = splitDuration(totalSeconds);
  if (days >= 1) return `${days} ${days === 1 ? "dia" : "dias"}`;
  if (hours >= 1) return `${hours} h ${minutes} min`;
  return `${minutes} min`;
};

// ------------------------------------------------------------- números

export const formatBRL = (value: number): string =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const formatNumber = (value: number, maxFractionDigits = 0): string =>
  value.toLocaleString("pt-BR", { maximumFractionDigits: maxFractionDigits });

/** 1500 ml → "1,5 L"; 7.5 h → "7,5 h"; 30 min → "30 min". */
export const formatAmount = (unit: "ml" | "h" | "min", value: number): string => {
  if (unit === "ml") return value >= 1000 ? `${formatNumber(value / 1000, 2)} L` : `${formatNumber(value)} ml`;
  if (unit === "h") return `${formatNumber(value, 1)} h`;
  return `${formatNumber(value)} min`;
};

// ------------------------------------------------------------------ água

/** 35 ml por kg, arredondado a 50 ml, entre 1,5 e 4 litros. */
export const waterGoalFromWeight = (weightKg: number): number => {
  if (!Number.isFinite(weightKg) || weightKg <= 0) return HABIT_CATALOG.water.defaultGoal!;
  const raw = Math.round((weightKg * 35) / 50) * 50;
  return Math.min(4000, Math.max(1500, raw));
};

// ---------------------------------------------------- hábitos do dia

export const totalsByDate = (events: HabitEvent[]): Map<string, number> => {
  const totals = new Map<string, number>();
  for (const event of events) {
    if (event.kind !== "intake" || event.amount == null) continue;
    totals.set(event.local_date, (totals.get(event.local_date) ?? 0) + Number(event.amount));
  }
  return totals;
};

/**
 * Dias seguidos batendo a meta. Se hoje ainda não bateu, conta até ontem —
 * a sequência só "quebra" quando um dia inteiro passa sem a meta.
 */
export const goalStreak = (totals: Map<string, number>, goal: number, today: string): number => {
  let day = (totals.get(today) ?? 0) >= goal ? today : addDays(today, -1);
  let streak = 0;
  while ((totals.get(day) ?? 0) >= goal) {
    streak += 1;
    day = addDays(day, -1);
  }
  return streak;
};

/** Maior sequência de dias batendo a meta dentro dos dias informados. */
export const bestGoalStreak = (totals: Map<string, number>, goal: number, today: string, days = 60): number => {
  let best = 0;
  let run = 0;
  for (let i = days - 1; i >= 0; i--) {
    if ((totals.get(addDays(today, -i)) ?? 0) >= goal) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }
  return best;
};

export interface DayProgress {
  date: string;
  total: number;
  reached: boolean;
}

export const lastDays = (totals: Map<string, number>, goal: number, today: string, count = 7): DayProgress[] =>
  Array.from({ length: count }, (_, i) => {
    const date = addDays(today, i - (count - 1));
    const total = totals.get(date) ?? 0;
    return { date, total, reached: total >= goal };
  });

// ------------------------------------------------------ largar hábitos

export interface QuitStats {
  seconds: number;
  days: number;
  moneySaved: number;
  /** Cigarros ou doses que deixaram de ser consumidos. */
  unitsAvoided: number;
  /** Só cigarro: minutos de vida recuperados (estimativa). */
  lifeRegainedMinutes?: number;
  /** Só álcool: calorias que ficaram de fora (estimativa). */
  caloriesAvoided?: number;
}

/**
 * Estimativa usada por apps como o QuitNow!: cada cigarro tira cerca de
 * 11 minutos de vida (Shaw, Mitchell e Dorling, BMJ 2000).
 */
export const MINUTES_OF_LIFE_PER_CIGARETTE = 11;
/** Uma dose padrão (lata de cerveja, taça de vinho ou dose de destilado): ~150 kcal. */
export const KCAL_PER_DRINK = 150;

const positive = (value: number | undefined, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;

export const quitStats = (habit: Pick<UserHabit, "kind" | "quit_started_at" | "settings">, now: Date = new Date()): QuitStats => {
  const seconds = habit.quit_started_at ? elapsedSeconds(habit.quit_started_at, now) : 0;
  const daysExact = seconds / DAY_SECONDS;
  const days = Math.floor(daysExact);
  const s = habit.settings ?? {};

  if (habit.kind === "quit_smoking") {
    const perDay = positive(s.cigarettes_per_day, 0);
    const perPack = positive(s.cigarettes_per_pack, 20);
    const packPrice = positive(s.pack_price, 0);
    const unitsAvoided = Math.floor(daysExact * perDay);
    return {
      seconds,
      days,
      unitsAvoided,
      moneySaved: (daysExact * perDay * packPrice) / perPack,
      lifeRegainedMinutes: unitsAvoided * MINUTES_OF_LIFE_PER_CIGARETTE,
    };
  }

  if (habit.kind === "quit_alcohol") {
    const perDay = positive(s.drinks_per_week, 0) / 7;
    const unitsAvoided = Math.floor(daysExact * perDay);
    return {
      seconds,
      days,
      unitsAvoided,
      moneySaved: daysExact * perDay * positive(s.price_per_drink, 0),
      caloriesAvoided: unitsAvoided * KCAL_PER_DRINK,
    };
  }

  return { seconds, days, unitsAvoided: 0, moneySaved: daysExact * positive(s.daily_cost, 0) };
};

/** Marcos de dias sem, como no I Am Sober: de 1 dia a 5 anos. */
export const QUIT_DAY_MILESTONES = [1, 3, 7, 14, 21, 30, 60, 90, 120, 180, 270, 365, 500, 730, 1095, 1825];

export const milestoneLabel = (days: number): string => {
  if (days === 1) return "1 dia";
  if (days === 7) return "1 semana";
  if (days === 14) return "2 semanas";
  if (days === 21) return "3 semanas";
  if (days === 30) return "1 mês";
  if (days % 365 === 0) return days === 365 ? "1 ano" : `${days / 365} anos`;
  if (days % 30 === 0 && days < 365) return `${days / 30} meses`;
  return `${days} dias`;
};

export const nextMilestone = (days: number): { target: number; previous: number; progress: number } | null => {
  const target = QUIT_DAY_MILESTONES.find((m) => m > days);
  if (target === undefined) return null;
  const previous = [...QUIT_DAY_MILESTONES].reverse().find((m) => m <= days) ?? 0;
  return { target, previous, progress: (days - previous) / (target - previous) };
};

export const reachedMilestones = (days: number): number[] => QUIT_DAY_MILESTONES.filter((m) => m <= days);

export interface HealthMilestone {
  afterSeconds: number;
  when: string;
  text: string;
}

const MIN = 60;
const HOUR = 3600;
const WEEK = 7 * DAY_SECONDS;
const YEAR = 365 * DAY_SECONDS;

/**
 * O que acontece com o corpo depois do último cigarro, segundo a OMS
 * ("Tobacco: health benefits of smoking cessation") e o INCA. Nos intervalos,
 * o marco só conta como alcançado no fim do intervalo.
 */
export const SMOKING_HEALTH_MILESTONES: HealthMilestone[] = [
  { afterSeconds: 20 * MIN, when: "20 minutos", text: "A frequência cardíaca e a pressão arterial começam a baixar." },
  { afterSeconds: 12 * HOUR, when: "12 horas", text: "O monóxido de carbono no sangue volta ao normal." },
  { afterSeconds: 2 * DAY_SECONDS, when: "2 dias", text: "O olfato e o paladar começam a melhorar." },
  { afterSeconds: 12 * WEEK, when: "2 a 12 semanas", text: "A circulação melhora e o pulmão funciona melhor." },
  { afterSeconds: 9 * 30 * DAY_SECONDS, when: "1 a 9 meses", text: "Tosse e falta de ar diminuem." },
  { afterSeconds: YEAR, when: "1 ano", text: "O risco de doença coronariana cai pela metade." },
  { afterSeconds: 5 * YEAR, when: "5 anos", text: "O risco de AVC começa a se igualar ao de quem nunca fumou." },
  { afterSeconds: 10 * YEAR, when: "10 anos", text: "O risco de câncer de pulmão cai para cerca da metade." },
  { afterSeconds: 15 * YEAR, when: "15 anos", text: "O risco de doença coronariana fica igual ao de quem nunca fumou." },
];

export const healthMilestoneProgress = (seconds: number) =>
  SMOKING_HEALTH_MILESTONES.map((milestone) => ({
    ...milestone,
    reached: seconds >= milestone.afterSeconds,
    progress: Math.min(1, seconds / milestone.afterSeconds),
  }));

// ----------------------------------------------------------- vontades

export const CRAVING_TRIGGERS = [
  "Estresse",
  "Ansiedade",
  "Tédio",
  "Depois de comer",
  "Com café",
  "Com amigos",
  "Bebendo",
  "Tristeza",
  "Hábito do horário",
] as const;

/** Vontades registradas por gatilho, da mais comum para a menos. */
export const cravingTriggerRanking = (events: HabitEvent[]): { trigger: string; count: number }[] => {
  const counts = new Map<string, number>();
  for (const event of events) {
    if (event.kind !== "craving") continue;
    const triggers = Array.isArray(event.details?.triggers) ? (event.details.triggers as string[]) : [];
    for (const trigger of triggers) counts.set(trigger, (counts.get(trigger) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([trigger, count]) => ({ trigger, count }))
    .sort((a, b) => b.count - a.count || a.trigger.localeCompare(b.trigger));
};

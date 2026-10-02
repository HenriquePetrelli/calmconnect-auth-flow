// Meus hábitos: catálogo, contas e marcos. Tudo aqui é puro (sem Supabase)
// para ser testado sem o app.
//
// Referências de mercado: QuitNow! e Smoke Free (tempo sem fumar, cigarros
// evitados, dinheiro economizado, vida recuperada e marcos de saúde da OMS),
// I Am Sober (contador de dias, dinheiro, marcos de 1 dia a 1 ano, recaída sem
// apagar a história) e Waterllama/WaterMinder (meta pelo peso, copos rápidos,
// sequência de dias e lembretes só enquanto a meta não foi batida).

export type HabitKind =
  | "water"
  | "sleep"
  | "movement"
  | "caffeine"
  | "meals"
  | "medication"
  | "screen_time"
  | "joy"
  | "quit_smoking"
  | "quit_alcohol"
  | "quit_custom";
export type DailyHabitKind = Exclude<HabitKind, "quit_smoking" | "quit_alcohol" | "quit_custom">;
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
  // Cafeína: depois deste horário, a cafeína atrapalha o sono.
  cutoff_time?: string;
  // Remédio: horários das doses ("08:00").
  times?: string[];
  // Telas: hora de dormir (o lembrete chega 1 hora antes).
  bedtime?: string;
  // Algo que me faz bem: atividades favoritas.
  activities?: string[];
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

export type HabitEventKind = "intake" | "relapse" | "craving" | "check";

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

export type HabitUnit = "ml" | "h" | "min" | "mg" | "count";

export interface HabitCatalogEntry {
  kind: HabitKind;
  group: "daily" | "quit";
  title: string;
  /** Nome curto (resumo da Home, padrões). */
  shortName: string;
  description: string;
  /** Unidade da meta diária (hábitos do dia). */
  unit?: HabitUnit;
  /** "reach": chegar à meta (água). "limit": ficar abaixo do limite (cafeína). */
  goalType?: "reach" | "limit";
  /** Unidade "count": como chamar cada registro ("refeição", "refeições"). */
  countNoun?: [string, string];
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
    shortName: "Água",
    goalType: "reach",
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
    shortName: "Sono",
    goalType: "reach",
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
    shortName: "Movimento",
    goalType: "reach",
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
  caffeine: {
    kind: "caffeine",
    group: "daily",
    title: "Menos cafeína",
    shortName: "Cafeína",
    description: "Café, energético, chá e refrigerante: some a cafeína do dia e fique abaixo do limite.",
    unit: "mg",
    goalType: "limit",
    // Até 400 mg por dia é a referência geral para adultos (FDA, EFSA).
    defaultGoal: 400,
    goalStep: 10,
    goalMin: 50,
    goalMax: 1000,
    defaultSettings: { cutoff_time: "14:00" },
    defaultReminder: { start: "13:30", end: "14:30", interval: null },
  },
  meals: {
    kind: "meals",
    group: "daily",
    title: "Comer nos horários",
    shortName: "Refeições",
    description: "Marque as refeições do dia, sem calorias. Ficar muitas horas sem comer piora a ansiedade.",
    unit: "count",
    countNoun: ["refeição", "refeições"],
    goalType: "reach",
    defaultGoal: 3,
    goalStep: 1,
    goalMin: 1,
    goalMax: 6,
    defaultSettings: {},
    defaultReminder: { start: "12:30", end: "13:30", interval: null },
  },
  medication: {
    kind: "medication",
    group: "daily",
    title: "Tomar o remédio",
    shortName: "Remédio",
    description: "Lembrete em cada horário e o histórico das doses. Os horários são os que o seu médico indicou.",
    unit: "count",
    countNoun: ["dose", "doses"],
    goalType: "reach",
    defaultGoal: 1,
    goalStep: 1,
    goalMin: 1,
    goalMax: 6,
    defaultSettings: { times: ["08:00"] },
    defaultReminder: { start: "00:00", end: "23:59", interval: null },
  },
  screen_time: {
    kind: "screen_time",
    group: "daily",
    title: "Menos tela",
    shortName: "Tela",
    description: "Tempo de celular e redes sociais no dia, com limite, e nada de tela 1 hora antes de dormir.",
    unit: "min",
    goalType: "limit",
    defaultGoal: 120,
    goalStep: 15,
    goalMin: 15,
    goalMax: 960,
    quickAmounts: [15, 30, 60],
    defaultSettings: { bedtime: "23:00" },
    defaultReminder: { start: "22:00", end: "23:00", interval: null },
  },
  joy: {
    kind: "joy",
    group: "daily",
    title: "Algo que me faz bem",
    shortName: "Algo que me faz bem",
    description: "Uma atividade de que você gosta por dia: ler, ouvir música, cozinhar, caminhar.",
    unit: "count",
    countNoun: ["atividade", "atividades"],
    goalType: "reach",
    defaultGoal: 1,
    goalStep: 1,
    goalMin: 1,
    goalMax: 5,
    defaultSettings: { activities: ["Ler", "Ouvir música", "Caminhar", "Cozinhar"] },
    defaultReminder: { start: "19:00", end: "20:00", interval: null },
  },
  quit_smoking: {
    kind: "quit_smoking",
    group: "quit",
    title: "Parar de fumar",
    shortName: "Cigarro",
    description: "Tempo sem fumar, cigarros evitados, dinheiro economizado e como o corpo se recupera.",
    defaultSettings: { cigarettes_per_day: 10, cigarettes_per_pack: 20, pack_price: 12 },
    defaultReminder: { start: "09:00", end: "21:00", interval: null },
  },
  quit_alcohol: {
    kind: "quit_alcohol",
    group: "quit",
    title: "Parar de beber",
    shortName: "Álcool",
    description: "Dias sem álcool, doses evitadas, dinheiro e calorias que ficaram de fora.",
    defaultSettings: { drinks_per_week: 10, price_per_drink: 10 },
    defaultReminder: { start: "09:00", end: "21:00", interval: null },
  },
  quit_custom: {
    kind: "quit_custom",
    group: "quit",
    title: "Largar outro hábito",
    shortName: "Outro hábito",
    description: "Refrigerante, apostas, redes sociais à noite… você escolhe o nome.",
    defaultSettings: { daily_cost: 0 },
    defaultReminder: { start: "09:00", end: "21:00", interval: null },
  },
};

export const DAILY_HABIT_KINDS: DailyHabitKind[] = ["water", "sleep", "movement", "meals", "caffeine", "screen_time", "joy", "medication"];
export const QUIT_HABIT_KINDS: QuitHabitKind[] = ["quit_smoking", "quit_alcohol", "quit_custom"];

export const isQuitHabit = (kind: HabitKind): kind is QuitHabitKind => kind.startsWith("quit_");

export const habitTitle = (habit: Pick<UserHabit, "kind" | "title">): string => {
  if (habit.kind === "quit_custom" && habit.title) return `Sem ${habit.title.toLowerCase()}`;
  if (habit.kind === "medication" && habit.title) return habit.title;
  return HABIT_CATALOG[habit.kind].title;
};

/** Hábitos com limite (cafeína, tela): menos é melhor. */
export const isLimitHabit = (kind: HabitKind): boolean => HABIT_CATALOG[kind].goalType === "limit";

/** Hábitos que podem existir mais de uma vez ao mesmo tempo. */
export const allowsMultiple = (kind: HabitKind): boolean => kind === "quit_custom" || kind === "medication";

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

/** 1500 ml → "1,5 L"; 7.5 h → "7,5 h"; 30 min → "30 min"; 80 mg → "80 mg". */
export const formatAmount = (unit: Exclude<HabitUnit, "count">, value: number): string => {
  if (unit === "ml") return value >= 1000 ? `${formatNumber(value / 1000, 2)} L` : `${formatNumber(value)} ml`;
  if (unit === "h") return `${formatNumber(value, 1)} h`;
  if (unit === "mg") return `${formatNumber(value)} mg`;
  if (value >= 120 && value % 60 === 0) return `${formatNumber(value / 60)} h`;
  return `${formatNumber(value)} min`;
};

/** Quantidade de um hábito do dia na unidade dele ("2 refeições", "80 mg"). */
export const formatHabitAmount = (kind: HabitKind, value: number): string => {
  const catalog = HABIT_CATALOG[kind];
  if (catalog.unit === "count") {
    const [one, many] = catalog.countNoun ?? ["vez", "vezes"];
    return `${formatNumber(value)} ${value === 1 ? one : many}`;
  }
  return formatAmount(catalog.unit ?? "min", value);
};

// ------------------------------------------------------ registro rápido

export interface QuickItem {
  /** Identifica o botão (e o registro, nos que valem uma vez por dia). */
  key: string;
  label: string;
  amount: number;
  details?: Record<string, unknown>;
  /** Vale uma vez por dia (refeição, dose): tocar de novo desfaz. */
  once?: boolean;
}

/**
 * Cafeína aproximada por porção, como em tabelas de referência (FDA, EFSA,
 * Mayo Clinic). Os valores variam com a marca e o preparo.
 */
export const CAFFEINE_DRINKS = [
  { key: "coffee", label: "Café (xícara)", mg: 80 },
  { key: "espresso", label: "Expresso", mg: 65 },
  { key: "energy", label: "Energético (lata)", mg: 80 },
  { key: "black_tea", label: "Chá preto ou mate", mg: 40 },
  { key: "cola", label: "Refrigerante de cola", mg: 35 },
  { key: "pre_workout", label: "Pré-treino (dose)", mg: 200 },
] as const;

export const MEALS = [
  { key: "breakfast", label: "Café da manhã" },
  { key: "lunch", label: "Almoço" },
  { key: "snack", label: "Lanche" },
  { key: "dinner", label: "Jantar" },
] as const;

export const JOY_ACTIVITIES = [
  "Ler",
  "Ouvir música",
  "Caminhar",
  "Cozinhar",
  "Ver um filme ou série",
  "Desenhar ou pintar",
  "Tocar um instrumento",
  "Cuidar de plantas",
  "Brincar com o pet",
  "Jogar",
  "Fazer um hobby",
  "Tomar um banho demorado",
  "Encontrar alguém",
  "Escrever",
] as const;

/** Como a pessoa estava antes de comer (opcional; liga comida e emoção, sem julgar). */
export const MEAL_FEELINGS = ["Com fome", "Ansioso(a)", "Entediado(a)", "Triste", "Tranquilo(a)"] as const;

/** Como a pessoa ficou depois de uma atividade de que gosta. */
export const JOY_FEELINGS = [
  { key: "better", label: "Melhor" },
  { key: "same", label: "Igual" },
  { key: "worse", label: "Pior" },
] as const;

const TIME_RE = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
export const isValidTime = (value: string) => TIME_RE.test(value);

/** Horários do remédio, válidos, sem repetição e em ordem. */
export const medicationTimes = (habit: Pick<UserHabit, "settings">): string[] =>
  [...new Set((habit.settings.times ?? []).filter(isValidTime))].sort();

/** "23:00" menos 60 minutos → "22:00". */
export const shiftTime = (time: string, minutes: number): string => {
  const [h, m] = time.split(":").map(Number);
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

/** Botões de registro do hábito. `all` traz todos (tela de detalhe); senão, os principais. */
export const quickItemsFor = (habit: Pick<UserHabit, "kind" | "settings">, all = false): QuickItem[] => {
  const catalog = HABIT_CATALOG[habit.kind];
  switch (habit.kind) {
    case "water": {
      const cups = habit.settings.cup_sizes?.length ? habit.settings.cup_sizes : catalog.quickAmounts ?? [];
      return cups.slice(0, 3).map((ml) => ({ key: `ml-${ml}`, label: formatAmount("ml", ml), amount: ml }));
    }
    case "caffeine":
      return CAFFEINE_DRINKS.slice(0, all ? undefined : 3).map((d) => ({
        key: d.key,
        label: d.label,
        amount: d.mg,
        details: { drink: d.key },
      }));
    case "meals":
      return MEALS.map((m) => ({ key: m.key, label: m.label, amount: 1, details: { meal: m.key }, once: m.key !== "snack" }));
    case "medication":
      return medicationTimes(habit).map((t) => ({ key: t, label: t, amount: 1, details: { slot: t }, once: true }));
    case "joy": {
      const favorites = habit.settings.activities?.length ? habit.settings.activities : [...JOY_ACTIVITIES].slice(0, 4);
      const list = all ? [...new Set([...favorites, ...JOY_ACTIVITIES])] : favorites.slice(0, 3);
      return list.map((a) => ({ key: a, label: a, amount: 1, details: { activity: a } }));
    }
    default:
      return (catalog.quickAmounts ?? []).slice(0, 3).map((n) => ({
        key: `n-${n}`,
        label: formatHabitAmount(habit.kind, n),
        amount: n,
      }));
  }
};

/** O registro de hoje que corresponde a um botão "uma vez por dia" (se houver). */
export const onceEventFor = (events: HabitEvent[], item: QuickItem, today: string): HabitEvent | undefined => {
  if (!item.once || !item.details) return undefined;
  const [field, value] = Object.entries(item.details)[0];
  return events.find((e) => e.kind === "intake" && e.local_date === today && e.details?.[field] === value);
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

/** Meta do dia cumprida: chegou à meta ou, nos de limite, ficou dentro dele. */
export const dayOk = (kind: HabitKind, total: number, goal: number): boolean =>
  isLimitHabit(kind) ? total <= goal : total >= goal;

/**
 * Dias seguidos dentro do limite (cafeína, tela), contando só dias inteiros
 * (até ontem) desde que o hábito começou. Na tela, dia sem registro não conta
 * (não dá para saber); na cafeína, conta como zero.
 */
export const limitStreak = (
  totals: Map<string, number>,
  limit: number,
  today: string,
  since: string,
  requireLog: boolean,
): number => {
  let day = addDays(today, -1);
  let streak = 0;
  while (day >= since) {
    const total = totals.get(day);
    if (requireLog && total === undefined) break;
    if ((total ?? 0) > limit) break;
    streak += 1;
    day = addDays(day, -1);
  }
  return streak;
};

/** Sequência do hábito do dia, qualquer que seja o tipo. */
export const habitStreak = (habit: Pick<UserHabit, "kind" | "created_at">, totals: Map<string, number>, goal: number, today: string): number =>
  isLimitHabit(habit.kind)
    ? limitStreak(totals, goal, today, localDateString(new Date(habit.created_at)), habit.kind === "screen_time")
    : goalStreak(totals, goal, today);

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

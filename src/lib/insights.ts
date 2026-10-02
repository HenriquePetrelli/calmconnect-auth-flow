// Seus padrões: cruza o humor do dia (1 a 5) com os hábitos registrados e
// mostra só associações positivas e claras ("nos dias em que você dormiu 7 h
// ou mais, seu humor foi melhor"). É correlação, não causa, e a tela diz isso.
// Remédio fica de fora de propósito: não cabe ao app sugerir relação entre
// tomar o remédio e o humor.

import { addDays, localDateString, totalsByDate, type HabitEvent, type HabitKind, type UserHabit } from '@/lib/habits';

export interface Insight {
  key: string;
  text: string;
  /** Diferença de humor (pontos de 1 a 5) entre os dois grupos de dias. */
  diff: number;
  /** Quantos dias entraram na comparação. */
  days: number;
}

/** Mínimo de dias em cada grupo e diferença mínima para mostrar algo. */
export const MIN_DAYS_EACH = 3;
export const MIN_DIFF = 0.5;

const avg = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;
const fmt = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

interface Factor {
  kind: HabitKind;
  key: string;
  /** "dormiu 7 horas ou mais" — completa "Nos dias em que você ___". */
  phrase: string;
  /** true: dia "bom" para o hábito; false: o contrário; null: dia fora da comparação. */
  classify: (total: number | undefined, goal: number) => boolean | null;
}

const FACTORS: Factor[] = [
  { kind: 'sleep', key: 'sleep', phrase: 'dormiu 7 horas ou mais', classify: (t) => (t === undefined ? null : t >= 7) },
  { kind: 'movement', key: 'movement', phrase: 'se movimentou 20 minutos ou mais', classify: (t) => (t ?? 0) >= 20 },
  { kind: 'water', key: 'water', phrase: 'bateu a meta de água', classify: (t, goal) => (t ?? 0) >= goal },
  { kind: 'caffeine', key: 'caffeine', phrase: 'ficou dentro do limite de cafeína', classify: (t, goal) => (t ?? 0) <= goal },
  { kind: 'screen_time', key: 'screen_time', phrase: 'ficou dentro do limite de tela', classify: (t, goal) => (t === undefined ? null : t <= goal) },
  { kind: 'joy', key: 'joy', phrase: 'fez algo que te faz bem', classify: (t) => (t ?? 0) >= 1 },
  { kind: 'meals', key: 'meals', phrase: 'fez todas as refeições', classify: (t, goal) => (t ?? 0) >= goal },
];

/**
 * Padrões a partir do humor (data → valor) e dos hábitos. Só dias com humor
 * registrado e a partir do dia em que o hábito começou entram na conta.
 */
export const computeInsights = (
  moodByDate: Map<string, number>,
  habits: UserHabit[],
  events: HabitEvent[],
  today: string = localDateString(),
): Insight[] => {
  const insights: Insight[] = [];

  for (const factor of FACTORS) {
    const habit = habits.find((h) => h.kind === factor.kind);
    if (!habit || habit.daily_goal == null) continue;
    const goal = Number(habit.daily_goal);
    const since = localDateString(new Date(habit.created_at));
    const totals = totalsByDate(events.filter((e) => e.habit_id === habit.id));
    const good: number[] = [];
    const other: number[] = [];
    for (const [date, mood] of moodByDate) {
      if (date < since || date > today) continue;
      const verdict = factor.classify(totals.get(date), goal);
      if (verdict === null) continue;
      (verdict ? good : other).push(mood);
    }
    if (good.length < MIN_DAYS_EACH || other.length < MIN_DAYS_EACH) continue;
    const diff = avg(good) - avg(other);
    if (diff < MIN_DIFF) continue;
    insights.push({
      key: factor.key,
      text: `Nos dias em que você ${factor.phrase}, seu humor foi melhor: média ${fmt(avg(good))} contra ${fmt(avg(other))} (de 1 a 5).`,
      diff,
      days: good.length + other.length,
    });
  }

  // O que você contou depois das atividades de que gosta.
  const joyHabit = habits.find((h) => h.kind === 'joy');
  if (joyHabit) {
    const better = new Map<string, number>();
    for (const e of events) {
      if (e.habit_id !== joyHabit.id || e.details?.feeling !== 'better' || typeof e.details?.activity !== 'string') continue;
      better.set(e.details.activity, (better.get(e.details.activity) ?? 0) + 1);
    }
    const [top] = [...better.entries()].sort((a, b) => b[1] - a[1]);
    if (top && top[1] >= MIN_DAYS_EACH) {
      insights.push({
        key: 'joy_activity',
        text: `${top[0]} deixou você melhor ${top[1]} vezes. Vale guardar para os dias difíceis.`,
        diff: MIN_DIFF,
        days: top[1],
      });
    }
  }

  // Comer com ansiedade, repetidamente: sugere o exercício (sem julgar).
  const mealsHabit = habits.find((h) => h.kind === 'meals');
  if (mealsHabit) {
    const since = addDays(today, -13);
    const anxious = events.filter(
      (e) => e.habit_id === mealsHabit.id && e.local_date >= since && e.details?.feeling === 'Ansioso(a)',
    ).length;
    if (anxious >= MIN_DAYS_EACH) {
      insights.push({
        key: 'meals_anxious',
        text: `Em ${anxious} refeições das últimas 2 semanas você comeu ansioso(a). O exercício "Comer com atenção" pode ajudar.`,
        diff: MIN_DIFF,
        days: anxious,
      });
    }
  }

  return insights.sort((a, b) => b.diff - a.diff);
};

/** Quantos dias têm humor e algum hábito registrado (para dizer quanto falta). */
export const daysWithData = (moodByDate: Map<string, number>, events: HabitEvent[]): number => {
  const habitDays = new Set(events.map((e) => e.local_date));
  return [...moodByDate.keys()].filter((date) => habitDays.has(date)).length;
};

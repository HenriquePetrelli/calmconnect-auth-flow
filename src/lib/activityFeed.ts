// Histórico unificado: as atividades de antes (respiração, sons, diário,
// grupos, consultas…) mais os hábitos, os questionários, os desafios e o
// "comer com atenção". Puro, para ser testado.

import {
  HABIT_CATALOG,
  formatHabitAmount,
  habitTitle,
  isQuitHabit,
  type HabitEvent,
  type HabitKind,
  type UserHabit,
} from '@/lib/habits';
import { INSTRUMENTS, SEVERITY_LABEL, type Instrument, type Severity } from '@/lib/screenings';

export type FeedCategory = 'activity' | 'habit' | 'questionnaire';

/** Chave do ícone: tipo de hábito ou tipo de atividade. */
export type FeedIcon =
  | HabitKind
  | 'breathing'
  | 'sound'
  | 'journal'
  | 'group'
  | 'appointment'
  | 'sos'
  | 'mood'
  | 'mindful'
  | 'challenge'
  | 'questionnaire'
  | 'craving'
  | 'relapse'
  | 'other';

export interface FeedItem {
  id: string;
  name: string;
  detail?: string;
  date: string;
  category: FeedCategory;
  icon: FeedIcon;
}

const ACTIVITY_RULES: { prefix: string; icon: FeedIcon }[] = [
  { prefix: 'Respiração', icon: 'breathing' },
  { prefix: 'Sons Terapêuticos', icon: 'sound' },
  { prefix: 'Diário', icon: 'journal' },
  { prefix: 'Grupo de Apoio', icon: 'group' },
  { prefix: 'SOS', icon: 'sos' },
  { prefix: 'Consulta', icon: 'appointment' },
  { prefix: 'Registro de Humor', icon: 'mood' },
  { prefix: 'Comer com Atenção', icon: 'mindful' },
  { prefix: 'Desafio', icon: 'challenge' },
];

export const iconForActivity = (name: string): FeedIcon =>
  ACTIVITY_RULES.find((rule) => name.startsWith(rule.prefix))?.icon ?? 'other';

export interface FeedInput {
  activities: { name: string; date: string }[];
  habits: UserHabit[];
  events: HabitEvent[];
  screenings: { id: string; instrument: Instrument; score: number; severity: Severity; created_at: string }[];
}

export const buildFeed = ({ activities, habits, events, screenings }: FeedInput): FeedItem[] => {
  const items: FeedItem[] = activities.map((activity, i) => {
    const [name, ...rest] = activity.name.split(': ');
    return {
      id: `a-${i}-${activity.date}`,
      name: rest.length > 0 && iconForActivity(activity.name) !== 'other' ? name : activity.name,
      detail: rest.length > 0 && iconForActivity(activity.name) !== 'other' ? rest.join(': ') : undefined,
      date: activity.date,
      category: 'activity',
      icon: iconForActivity(activity.name),
    };
  });

  const habitById = new Map(habits.map((h) => [h.id, h]));

  // Registros do dia somados por hábito: "Beber água · 1,8 L" (e não um item por copo).
  const daily = new Map<string, { habit: UserHabit; date: string; total: number; last: string }>();
  for (const event of events) {
    const habit = habitById.get(event.habit_id);
    if (!habit) continue;
    if (event.kind === 'intake' && !isQuitHabit(habit.kind)) {
      const key = `${habit.id}|${event.local_date}`;
      const entry = daily.get(key) ?? { habit, date: event.local_date, total: 0, last: event.occurred_at };
      entry.total += Number(event.amount ?? 0);
      if (event.occurred_at > entry.last) entry.last = event.occurred_at;
      daily.set(key, entry);
    } else if (event.kind === 'craving' || event.kind === 'relapse') {
      items.push({
        id: `e-${event.id}`,
        name: event.kind === 'craving' ? 'Vontade registrada' : 'Recomeço da contagem',
        detail: habitTitle(habit),
        date: event.occurred_at,
        category: 'habit',
        icon: event.kind,
      });
    } else if (event.kind === 'check' && event.details?.item === 'offline_before_bed') {
      items.push({
        id: `e-${event.id}`,
        name: 'Sem tela antes de dormir',
        detail: habitTitle(habit),
        date: event.occurred_at,
        category: 'habit',
        icon: 'screen_time',
      });
    }
  }
  for (const [key, entry] of daily) {
    const goal = entry.habit.daily_goal ?? HABIT_CATALOG[entry.habit.kind].defaultGoal ?? 0;
    const count = HABIT_CATALOG[entry.habit.kind].unit === 'count';
    items.push({
      id: `d-${key}`,
      name: habitTitle(entry.habit),
      detail: count
        ? `${entry.total} de ${formatHabitAmount(entry.habit.kind, goal)}`
        : formatHabitAmount(entry.habit.kind, entry.total),
      date: entry.last,
      category: 'habit',
      icon: entry.habit.kind,
    });
  }

  for (const screening of screenings) {
    items.push({
      id: `s-${screening.id}`,
      name: `Questionário: ${INSTRUMENTS[screening.instrument].title}`,
      detail: `${SEVERITY_LABEL[screening.severity]} · ${screening.score} de ${INSTRUMENTS[screening.instrument].maxScore}`,
      date: screening.created_at,
      category: 'questionnaire',
      icon: 'questionnaire',
    });
  }

  return items.sort((a, b) => b.date.localeCompare(a.date));
};

export const FEED_FILTERS: { key: 'all' | FeedCategory; label: string }[] = [
  { key: 'all', label: 'Tudo' },
  { key: 'activity', label: 'Atividades' },
  { key: 'habit', label: 'Hábitos' },
  { key: 'questionnaire', label: 'Questionários' },
];

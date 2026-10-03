// Quais conquistas a pessoa já alcançou, a partir dos dados do app. Puro (sem
// Supabase) para ser testado; useAchievements busca os dados e desbloqueia.

import {
  HABIT_CATALOG,
  goalStreak,
  habitStreak,
  isQuitHabit,
  localDateString,
  quitStats,
  totalsByDate,
  type HabitEvent,
  type UserHabit,
} from '@/lib/habits';

export interface AchievementInput {
  stats: {
    total_guided_breathing_time: number;
    total_therapeutic_sound_time: number;
    total_scheduled_consultations: number;
    streak_days: number;
  } | null;
  journalCount: number;
  /** Todos os hábitos, inclusive os tirados da lista. */
  habits: UserHabit[];
  events: HabitEvent[];
  /** Metas da semana atual. */
  weekGoals: { completed: boolean; type: string }[];
  screeningInstruments: string[];
  now?: Date;
}

export interface AchievementProgress {
  current: number;
  target: number;
  /** Unidade mostrada junto ao número ("min", "dias"…). */
  unit?: string;
}

/** Números que alimentam as regras (calculados uma vez). */
const metrics = (input: AchievementInput) => {
  const now = input.now ?? new Date();
  const today = localDateString(now);
  const stats = input.stats;
  const eventsOf = (id: string) => input.events.filter((e) => e.habit_id === id);
  const daily = input.habits.filter((h) => !isQuitHabit(h.kind) && h.daily_goal != null);
  const streakOf = (h: UserHabit) => habitStreak(h, totalsByDate(eventsOf(h.id)), Number(h.daily_goal), today);
  return {
    breathing: stats?.total_guided_breathing_time ?? 0,
    sounds: stats?.total_therapeutic_sound_time ?? 0,
    consultations: stats?.total_scheduled_consultations ?? 0,
    streak: stats?.streak_days ?? 0,
    journal: input.journalCount,
    habits: input.habits.length,
    habitStreak: Math.max(0, ...daily.filter((h) => h.kind !== 'medication').map(streakOf)),
    medicationStreak: Math.max(
      0,
      ...daily
        .filter((h) => h.kind === 'medication')
        .map((h) => goalStreak(totalsByDate(eventsOf(h.id)), Number(h.daily_goal ?? HABIT_CATALOG.medication.defaultGoal), today)),
    ),
    bestQuitDays: Math.max(
      0,
      ...input.habits
        .filter((h) => isQuitHabit(h.kind))
        .map((h) => Math.max(h.archived_at ? 0 : quitStats(h, now).days, Math.floor(h.best_streak_seconds / 86_400))),
    ),
    challengeDone: input.weekGoals.some((g) => g.type === 'challenge' && g.completed),
    weekDone: input.weekGoals.filter((g) => g.completed).length,
    weekTotal: input.weekGoals.length,
    instruments: ['gad7', 'phq9'].filter((i) => input.screeningInstruments.includes(i)).length,
    stats: stats != null,
  };
};

export const unlockedTitles = (input: AchievementInput): string[] => {
  const m = metrics(input);
  const titles: string[] = [];

  if (m.stats) {
    if (m.breathing > 0) titles.push('Primeiro Passo');
    if (m.breathing >= 5) titles.push('Respirador Experiente');
    if (m.consultations >= 3) titles.push('Comprometido com a Terapia');
    if (m.streak >= 7) titles.push('Mestre do Humor');
    if (m.streak >= 30) titles.push('Cuidado Constante');
    if (m.sounds > 0) titles.push('Primeiro Som');
    if (m.sounds >= 5) titles.push('Ouvinte Dedicado');
  }
  if (m.journal >= 7) titles.push('Escritor Consciente');

  // Hábitos
  if (m.habits > 0) titles.push('Novo Hábito');
  if (m.habitStreak >= 7) titles.push('Uma Semana no Ritmo');
  if (m.medicationStreak >= 7) titles.push('Remédio em Dia');
  if (m.bestQuitDays >= 7) titles.push('Uma Semana Sem');
  if (m.bestQuitDays >= 30) titles.push('Um Mês Sem');

  // Metas da semana e desafios
  if (m.challengeDone) titles.push('Desafio Concluído');
  if (m.weekTotal > 0 && m.weekDone === m.weekTotal) titles.push('Semana Completa');

  // Questionários
  if (m.instruments === 2) titles.push('Autoconhecimento');

  return titles;
};

/** Quanto falta em cada conquista que tem etapas (as de "fazer uma vez" ficam de fora). */
export const achievementProgress = (input: AchievementInput): Record<string, AchievementProgress> => {
  const m = metrics(input);
  const cap = (current: number, target: number, unit?: string): AchievementProgress => ({
    current: Math.min(Math.max(0, Math.floor(current)), target),
    target,
    unit,
  });
  return {
    'Respirador Experiente': cap(m.breathing, 5, 'min'),
    'Ouvinte Dedicado': cap(m.sounds, 5, 'min'),
    'Comprometido com a Terapia': cap(m.consultations, 3, 'consultas'),
    'Mestre do Humor': cap(m.streak, 7, 'dias'),
    'Cuidado Constante': cap(m.streak, 30, 'dias'),
    'Escritor Consciente': cap(m.journal, 7, 'anotações'),
    'Uma Semana no Ritmo': cap(m.habitStreak, 7, 'dias'),
    'Remédio em Dia': cap(m.medicationStreak, 7, 'dias'),
    'Uma Semana Sem': cap(m.bestQuitDays, 7, 'dias'),
    'Um Mês Sem': cap(m.bestQuitDays, 30, 'dias'),
    'Autoconhecimento': cap(m.instruments, 2, 'questionários'),
    ...(m.weekTotal > 0 ? { 'Semana Completa': cap(m.weekDone, m.weekTotal, 'metas') } : {}),
  };
};

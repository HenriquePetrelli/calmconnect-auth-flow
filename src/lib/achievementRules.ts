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

export const unlockedTitles = (input: AchievementInput): string[] => {
  const titles: string[] = [];
  const { stats } = input;
  const now = input.now ?? new Date();
  const today = localDateString(now);

  if (stats) {
    if (stats.total_guided_breathing_time > 0) titles.push('Primeiro Passo');
    if (stats.total_guided_breathing_time >= 5) titles.push('Respirador Experiente');
    if (stats.total_scheduled_consultations >= 3) titles.push('Comprometido com a Terapia');
    if (stats.streak_days >= 7) titles.push('Mestre do Humor');
    if (stats.streak_days >= 30) titles.push('Cuidado Constante');
    if (stats.total_therapeutic_sound_time > 0) titles.push('Primeiro Som');
    if (stats.total_therapeutic_sound_time >= 5) titles.push('Ouvinte Dedicado');
  }
  if (input.journalCount >= 7) titles.push('Escritor Consciente');

  // Hábitos
  if (input.habits.length > 0) titles.push('Novo Hábito');
  const eventsOf = (id: string) => input.events.filter((e) => e.habit_id === id);
  const daily = input.habits.filter((h) => !isQuitHabit(h.kind) && h.daily_goal != null);
  const streakOf = (h: UserHabit) => habitStreak(h, totalsByDate(eventsOf(h.id)), Number(h.daily_goal), today);
  if (daily.some((h) => h.kind !== 'medication' && streakOf(h) >= 7)) titles.push('Uma Semana no Ritmo');
  if (
    daily.some(
      (h) =>
        h.kind === 'medication' &&
        goalStreak(totalsByDate(eventsOf(h.id)), Number(h.daily_goal ?? HABIT_CATALOG.medication.defaultGoal), today) >= 7,
    )
  ) {
    titles.push('Remédio em Dia');
  }
  const bestQuitDays = Math.max(
    0,
    ...input.habits
      .filter((h) => isQuitHabit(h.kind))
      .map((h) => Math.max(h.archived_at ? 0 : quitStats(h, now).days, Math.floor(h.best_streak_seconds / 86_400))),
  );
  if (bestQuitDays >= 7) titles.push('Uma Semana Sem');
  if (bestQuitDays >= 30) titles.push('Um Mês Sem');

  // Metas da semana e desafios
  if (input.weekGoals.some((g) => g.type === 'challenge' && g.completed)) titles.push('Desafio Concluído');
  if (input.weekGoals.length > 0 && input.weekGoals.every((g) => g.completed)) titles.push('Semana Completa');

  // Questionários
  if (input.screeningInstruments.includes('gad7') && input.screeningInstruments.includes('phq9')) {
    titles.push('Autoconhecimento');
  }

  return titles;
};

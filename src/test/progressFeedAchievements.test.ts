import { describe, it, expect } from 'vitest';
import { achievementProgress, unlockedTitles, type AchievementInput } from '@/lib/achievementRules';
import { buildFeed, iconForActivity } from '@/lib/activityFeed';
import { addDays, localDateString, type HabitEvent, type UserHabit } from '@/lib/habits';

const now = new Date('2026-09-30T12:00:00');
const today = localDateString(now);

const habit = (over: Partial<UserHabit>): UserHabit => ({
  id: 'h1',
  user_id: 'u',
  kind: 'water',
  title: null,
  daily_goal: 2000,
  quit_started_at: null,
  best_streak_seconds: 0,
  settings: {},
  reminders_enabled: false,
  reminder_start: '08:00',
  reminder_end: '22:00',
  reminder_interval_minutes: null,
  timezone: 'America/Sao_Paulo',
  archived_at: null,
  created_at: now.toISOString(),
  ...over,
});

const intake = (habit_id: string, local_date: string, amount: number, occurred_at = `${local_date}T10:00:00.000Z`): HabitEvent => ({
  id: `${habit_id}-${local_date}-${amount}-${occurred_at}`,
  habit_id,
  kind: 'intake',
  amount,
  local_date,
  occurred_at,
  details: {},
});

const base: AchievementInput = { stats: null, journalCount: 0, habits: [], events: [], weekGoals: [], screeningInstruments: [], now };

describe('conquistas', () => {
  it('sem dados, nenhuma conquista', () => {
    expect(unlockedTitles(base)).toEqual([]);
  });

  it('mantém as regras antigas', () => {
    const titles = unlockedTitles({
      ...base,
      stats: { total_guided_breathing_time: 5, total_therapeutic_sound_time: 1, total_scheduled_consultations: 3, streak_days: 7 },
      journalCount: 7,
    });
    expect(titles).toEqual(
      expect.arrayContaining(['Primeiro Passo', 'Respirador Experiente', 'Comprometido com a Terapia', 'Mestre do Humor', 'Primeiro Som', 'Escritor Consciente']),
    );
    expect(titles).not.toContain('Cuidado Constante');
    expect(titles).not.toContain('Ouvinte Dedicado');
  });

  it('hábito novo e sete dias seguidos na meta', () => {
    const water = habit({});
    const events = Array.from({ length: 7 }, (_, i) => intake('h1', addDays(today, -i), 2000));
    const titles = unlockedTitles({ ...base, habits: [water], events });
    expect(titles).toContain('Novo Hábito');
    expect(titles).toContain('Uma Semana no Ritmo');
    expect(unlockedTitles({ ...base, habits: [water], events: events.slice(0, 3) })).not.toContain('Uma Semana no Ritmo');
  });

  it('remédio em dia conta à parte', () => {
    const med = habit({ id: 'm', kind: 'medication', title: 'Sertralina', daily_goal: 1 });
    const events = Array.from({ length: 7 }, (_, i) => intake('m', addDays(today, -i), 1));
    const titles = unlockedTitles({ ...base, habits: [med], events });
    expect(titles).toContain('Remédio em Dia');
    expect(titles).not.toContain('Uma Semana no Ritmo');
  });

  it('uma semana e um mês sem, inclusive pelo recorde', () => {
    const smoking = habit({ id: 's', kind: 'quit_smoking', daily_goal: null, quit_started_at: new Date(now.getTime() - 8 * 86_400_000).toISOString() });
    const week = unlockedTitles({ ...base, habits: [smoking] });
    expect(week).toContain('Uma Semana Sem');
    expect(week).not.toContain('Um Mês Sem');
    const record = habit({ id: 'a', kind: 'quit_alcohol', daily_goal: null, archived_at: now.toISOString(), best_streak_seconds: 31 * 86_400 });
    expect(unlockedTitles({ ...base, habits: [record] })).toEqual(expect.arrayContaining(['Uma Semana Sem', 'Um Mês Sem']));
  });

  it('metas da semana, desafio e questionários', () => {
    const titles = unlockedTitles({
      ...base,
      weekGoals: [
        { completed: true, type: 'challenge' },
        { completed: true, type: 'breathing' },
      ],
      screeningInstruments: ['gad7', 'phq9'],
    });
    expect(titles).toEqual(expect.arrayContaining(['Desafio Concluído', 'Semana Completa', 'Autoconhecimento']));
    const partial = unlockedTitles({ ...base, weekGoals: [{ completed: true, type: 'challenge' }, { completed: false, type: 'x' }], screeningInstruments: ['gad7'] });
    expect(partial).toContain('Desafio Concluído');
    expect(partial).not.toContain('Semana Completa');
    expect(partial).not.toContain('Autoconhecimento');
  });
});

describe('progresso das conquistas', () => {
  it('mostra quanto falta, sem passar da meta', () => {
    const progress = achievementProgress({
      ...base,
      stats: { total_guided_breathing_time: 3, total_therapeutic_sound_time: 12, total_scheduled_consultations: 1, streak_days: 12 },
      journalCount: 2,
      weekGoals: [
        { completed: true, type: 'breathing' },
        { completed: false, type: 'mood' },
      ],
      screeningInstruments: ['phq9'],
    });
    expect(progress['Respirador Experiente']).toEqual({ current: 3, target: 5, unit: 'min' });
    expect(progress['Ouvinte Dedicado'].current).toBe(5);
    expect(progress['Cuidado Constante']).toMatchObject({ current: 12, target: 30 });
    expect(progress['Semana Completa']).toMatchObject({ current: 1, target: 2 });
    expect(progress['Autoconhecimento']).toMatchObject({ current: 1, target: 2 });
    expect(progress['Novo Hábito']).toBeUndefined();
    expect(achievementProgress(base)['Semana Completa']).toBeUndefined();
  });
});

describe('histórico unificado', () => {
  it('separa nome e detalhe das atividades conhecidas', () => {
    const feed = buildFeed({
      activities: [
        { name: 'Respiração: 4-7-8', date: '2026-09-29T10:00:00.000Z' },
        { name: 'Desafio de 7 dias: Dia 1', date: '2026-09-29T11:00:00.000Z' },
        { name: 'Algo: novo', date: '2026-09-29T09:00:00.000Z' },
      ],
      habits: [],
      events: [],
      screenings: [],
    });
    expect(feed.map((i) => [i.name, i.detail, i.icon])).toEqual([
      ['Desafio de 7 dias', 'Dia 1', 'challenge'],
      ['Respiração', '4-7-8', 'breathing'],
      ['Algo: novo', undefined, 'other'],
    ]);
    expect(iconForActivity('Comer com Atenção')).toBe('mindful');
  });

  it('soma os registros do dia por hábito e inclui vontades, recomeços e questionários', () => {
    const water = habit({});
    const meals = habit({ id: 'ml', kind: 'meals', daily_goal: 3 });
    const smoking = habit({ id: 's', kind: 'quit_smoking', daily_goal: null });
    const feed = buildFeed({
      activities: [],
      habits: [water, meals, smoking],
      events: [
        intake('h1', '2026-09-29', 500, '2026-09-29T10:00:00.000Z'),
        intake('h1', '2026-09-29', 300, '2026-09-29T15:00:00.000Z'),
        intake('h1', '2026-09-28', 250),
        intake('ml', '2026-09-29', 1),
        { ...intake('s', '2026-09-29', 0), id: 'c', kind: 'craving' },
        { ...intake('s', '2026-09-27', 0), id: 'r', kind: 'relapse' },
      ],
      screenings: [{ id: 'q', instrument: 'gad7', score: 6, severity: 'mild', created_at: '2026-09-30T08:00:00.000Z' }],
    });
    expect(feed[0]).toMatchObject({ category: 'questionnaire', icon: 'questionnaire' });
    expect(feed[0].detail).toContain('6 de 21');
    const waterItems = feed.filter((i) => i.icon === 'water');
    expect(waterItems).toHaveLength(2);
    expect(waterItems[0].date).toBe('2026-09-29T15:00:00.000Z');
    expect(feed.find((i) => i.icon === 'meals')?.detail).toBe('1 de 3 refeições');
    expect(feed.find((i) => i.icon === 'craving')?.name).toBe('Vontade registrada');
    expect(feed.find((i) => i.icon === 'relapse')?.name).toBe('Recomeço da contagem');
    const dates = feed.map((i) => i.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });
});

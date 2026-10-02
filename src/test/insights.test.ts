import { describe, it, expect } from 'vitest';
import { computeInsights, daysWithData } from '@/lib/insights';
import type { HabitEvent, UserHabit } from '@/lib/habits';

const habit = (id: string, kind: UserHabit['kind'], daily_goal: number): UserHabit => ({
  id,
  user_id: 'u',
  kind,
  title: null,
  daily_goal,
  quit_started_at: null,
  best_streak_seconds: 0,
  settings: {},
  reminders_enabled: false,
  reminder_start: '09:00',
  reminder_end: '21:00',
  reminder_interval_minutes: null,
  timezone: 'America/Sao_Paulo',
  archived_at: null,
  created_at: '2026-09-01T12:00:00Z',
});

const ev = (habit_id: string, local_date: string, amount: number, details: Record<string, unknown> = {}): HabitEvent => ({
  id: `${habit_id}-${local_date}-${amount}-${JSON.stringify(details)}`,
  habit_id,
  kind: 'intake',
  amount,
  local_date,
  occurred_at: `${local_date}T12:00:00Z`,
  details,
});

const day = (n: number) => `2026-09-${String(n).padStart(2, '0')}`;

describe('seus padrões', () => {
  it('mostra quando dormir bem acompanha um humor melhor', () => {
    const sleep = habit('s', 'sleep', 8);
    const events = [1, 2, 3, 4, 5, 6].map((n) => ev('s', day(n), n <= 3 ? 8 : 5));
    const mood = new Map([1, 2, 3, 4, 5, 6].map((n) => [day(n), n <= 3 ? 4 : 2] as [string, number]));
    const [insight] = computeInsights(mood, [sleep], events, day(10));
    expect(insight.key).toBe('sleep');
    expect(insight.text).toContain('dormiu 7 horas ou mais');
    expect(insight.text).toContain('média 4,0 contra 2,0');
  });

  it('não mostra com poucos dias ou diferença pequena', () => {
    const sleep = habit('s', 'sleep', 8);
    const few = [ev('s', day(1), 8), ev('s', day(2), 5)];
    expect(computeInsights(new Map([[day(1), 5], [day(2), 1]]), [sleep], few, day(10))).toEqual([]);
    const events = [1, 2, 3, 4, 5, 6].map((n) => ev('s', day(n), n <= 3 ? 8 : 5));
    const flat = new Map([1, 2, 3, 4, 5, 6].map((n) => [day(n), n <= 3 ? 3.2 : 3] as [string, number]));
    expect(computeInsights(flat, [sleep], events, day(10))).toEqual([]);
  });

  it('não mostra associação "ao contrário" (mais tela, humor melhor)', () => {
    const screen = habit('t', 'screen_time', 60);
    const events = [1, 2, 3, 4, 5, 6].map((n) => ev('t', day(n), n <= 3 ? 30 : 200));
    const mood = new Map([1, 2, 3, 4, 5, 6].map((n) => [day(n), n <= 3 ? 2 : 4] as [string, number]));
    expect(computeInsights(mood, [screen], events, day(10))).toEqual([]);
  });

  it('cafeína: dia sem registro conta como zero (dentro do limite)', () => {
    const caffeine = habit('c', 'caffeine', 200);
    const events = [4, 5, 6].map((n) => ev('c', day(n), 400));
    const mood = new Map([1, 2, 3, 4, 5, 6].map((n) => [day(n), n <= 3 ? 4 : 2] as [string, number]));
    expect(computeInsights(mood, [caffeine], events, day(10))[0].key).toBe('caffeine');
  });

  it('atividade que deixa a pessoa melhor e refeições com ansiedade', () => {
    const joy = habit('j', 'joy', 1);
    const meals = habit('m', 'meals', 3);
    const events = [
      ...[1, 2, 3].map((n) => ev('j', day(n), 1, { activity: 'Caminhar', feeling: 'better' })),
      ...[8, 9, 10].map((n) => ev('m', day(n), 1, { meal: 'lunch', feeling: 'Ansioso(a)' })),
    ];
    const keys = computeInsights(new Map(), [joy, meals], events, day(10)).map((i) => i.key);
    expect(keys).toEqual(expect.arrayContaining(['joy_activity', 'meals_anxious']));
  });

  it('conta dias com humor e hábito', () => {
    expect(daysWithData(new Map([[day(1), 3], [day(2), 4]]), [ev('s', day(2), 7)])).toBe(1);
  });
});

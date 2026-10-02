import { describe, it, expect } from 'vitest';
import {
  dayOk,
  formatHabitAmount,
  habitStreak,
  habitTitle,
  isLimitHabit,
  limitStreak,
  medicationTimes,
  onceEventFor,
  quickItemsFor,
  shiftTime,
  totalsByDate,
  type HabitEvent,
} from '@/lib/habits';

const event = (local_date: string, amount: number, details: Record<string, unknown> = {}): HabitEvent => ({
  id: `${local_date}-${amount}-${JSON.stringify(details)}`,
  habit_id: 'h',
  kind: 'intake',
  amount,
  local_date,
  occurred_at: `${local_date}T12:00:00Z`,
  details,
});

describe('novos hábitos do dia', () => {
  it('formata cada unidade', () => {
    expect(formatHabitAmount('caffeine', 160)).toBe('160 mg');
    expect(formatHabitAmount('meals', 1)).toBe('1 refeição');
    expect(formatHabitAmount('meals', 3)).toBe('3 refeições');
    expect(formatHabitAmount('medication', 2)).toBe('2 doses');
    expect(formatHabitAmount('screen_time', 90)).toBe('90 min');
    expect(formatHabitAmount('screen_time', 120)).toBe('2 h');
  });

  it('cafeína e tela são de limite: menos é melhor', () => {
    expect(isLimitHabit('caffeine')).toBe(true);
    expect(isLimitHabit('screen_time')).toBe(true);
    expect(isLimitHabit('water')).toBe(false);
    expect(dayOk('caffeine', 400, 400)).toBe(true);
    expect(dayOk('caffeine', 401, 400)).toBe(false);
    expect(dayOk('meals', 2, 3)).toBe(false);
  });

  it('sequência no limite conta dias inteiros desde o início do hábito', () => {
    const totals = totalsByDate([event('2026-10-01', 300), event('2026-10-02', 500), event('2026-10-04', 100)]);
    // Hoje é 06/10: 05 (0 mg) e 04 (100 mg) dentro; 03 (0) dentro; 02 passou.
    expect(limitStreak(totals, 400, '2026-10-06', '2026-09-01', false)).toBe(3);
    // Não conta antes de o hábito existir.
    expect(limitStreak(totals, 400, '2026-10-06', '2026-10-05', false)).toBe(1);
    // Tela: dia sem registro interrompe (não dá para saber).
    expect(limitStreak(totals, 400, '2026-10-06', '2026-09-01', true)).toBe(0);
    expect(limitStreak(totals, 400, '2026-10-05', '2026-09-01', true)).toBe(1);
  });

  it('habitStreak escolhe a regra pelo tipo', () => {
    const totals = totalsByDate([event('2026-10-05', 3), event('2026-10-04', 3)]);
    expect(habitStreak({ kind: 'meals', created_at: '2026-09-01T00:00:00Z' }, totals, 3, '2026-10-05')).toBe(2);
  });

  it('remédio: horários válidos, sem repetir e em ordem; um botão por horário', () => {
    const habit = { kind: 'medication' as const, settings: { times: ['20:00', '08:00', '08:00', '25:00', 'x'] } };
    expect(medicationTimes(habit)).toEqual(['08:00', '20:00']);
    const items = quickItemsFor(habit);
    expect(items.map((i) => i.label)).toEqual(['08:00', '20:00']);
    expect(items.every((i) => i.once)).toBe(true);
    expect(habitTitle({ kind: 'medication', title: 'Sertralina' })).toBe('Sertralina');
  });

  it('refeições: uma vez por dia, exceto lanche; tocar de novo encontra o registro para desfazer', () => {
    const items = quickItemsFor({ kind: 'meals', settings: {} });
    expect(items.map((i) => i.label)).toEqual(['Café da manhã', 'Almoço', 'Lanche', 'Jantar']);
    const lunch = items.find((i) => i.key === 'lunch')!;
    const snack = items.find((i) => i.key === 'snack')!;
    const events = [event('2026-10-05', 1, { meal: 'lunch' })];
    expect(onceEventFor(events, lunch, '2026-10-05')?.details.meal).toBe('lunch');
    expect(onceEventFor(events, lunch, '2026-10-06')).toBeUndefined();
    expect(snack.once).toBe(false);
  });

  it('cafeína: bebidas com mg; na tela de detalhe, todas', () => {
    const habit = { kind: 'caffeine' as const, settings: {} };
    expect(quickItemsFor(habit)).toHaveLength(3);
    expect(quickItemsFor(habit, true).length).toBeGreaterThan(3);
    expect(quickItemsFor(habit)[0]).toMatchObject({ label: 'Café (xícara)', amount: 80, details: { drink: 'coffee' } });
  });

  it('algo que me faz bem: favoritas primeiro', () => {
    const items = quickItemsFor({ kind: 'joy', settings: { activities: ['Tricô', 'Ler'] } });
    expect(items.map((i) => i.label)).toEqual(['Tricô', 'Ler']);
    expect(quickItemsFor({ kind: 'joy', settings: { activities: ['Tricô'] } }, true)[0].label).toBe('Tricô');
  });

  it('desloca horário (lembrete 1 h antes de dormir)', () => {
    expect(shiftTime('23:00', -60)).toBe('22:00');
    expect(shiftTime('00:30', -60)).toBe('23:30');
  });
});

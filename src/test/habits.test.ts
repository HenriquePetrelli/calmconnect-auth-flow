import { describe, it, expect } from 'vitest';
import {
  addDays,
  bestGoalStreak,
  cravingTriggerRanking,
  formatAmount,
  goalStreak,
  habitTitle,
  healthMilestoneProgress,
  lastDays,
  milestoneLabel,
  nextMilestone,
  quitStats,
  totalsByDate,
  waterGoalFromWeight,
  type HabitEvent,
} from '@/lib/habits';

const now = new Date('2026-09-30T12:00:00Z');
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();
const intake = (local_date: string, amount: number): HabitEvent => ({
  id: `${local_date}-${amount}`,
  habit_id: 'h',
  kind: 'intake',
  amount,
  local_date,
  occurred_at: now.toISOString(),
  details: {},
});

describe('parar de fumar', () => {
  it('calcula cigarros evitados, dinheiro e vida recuperada', () => {
    const stats = quitStats(
      { kind: 'quit_smoking', quit_started_at: daysAgo(10), settings: { cigarettes_per_day: 20, cigarettes_per_pack: 20, pack_price: 12 } },
      now,
    );
    expect(stats.days).toBe(10);
    expect(stats.unitsAvoided).toBe(200);
    expect(stats.moneySaved).toBeCloseTo(120);
    expect(stats.lifeRegainedMinutes).toBe(2200);
  });

  it('marca os marcos de saúde já alcançados', () => {
    const progress = healthMilestoneProgress(3 * 86_400);
    expect(progress.filter((m) => m.reached).map((m) => m.when)).toEqual(['20 minutos', '12 horas', '2 dias']);
    expect(progress[3].progress).toBeGreaterThan(0);
    expect(progress[3].reached).toBe(false);
  });
});

describe('parar de beber', () => {
  it('calcula dias, doses evitadas, dinheiro e calorias', () => {
    const stats = quitStats(
      { kind: 'quit_alcohol', quit_started_at: daysAgo(14), settings: { drinks_per_week: 14, price_per_drink: 10 } },
      now,
    );
    expect(stats.days).toBe(14);
    expect(stats.unitsAvoided).toBe(28);
    expect(stats.moneySaved).toBeCloseTo(280);
    expect(stats.caloriesAvoided).toBe(28 * 150);
  });

  it('não inventa valores sem os dados de consumo', () => {
    const stats = quitStats({ kind: 'quit_alcohol', quit_started_at: daysAgo(5), settings: {} }, now);
    expect(stats.moneySaved).toBe(0);
    expect(stats.unitsAvoided).toBe(0);
  });
});

describe('outro hábito', () => {
  it('soma o gasto diário e usa o nome escolhido', () => {
    const habit = { kind: 'quit_custom' as const, title: 'Refrigerante', quit_started_at: daysAgo(3), settings: { daily_cost: 6 } };
    expect(quitStats(habit, now).moneySaved).toBeCloseTo(18);
    expect(habitTitle(habit)).toBe('Sem refrigerante');
  });
});

describe('marcos de dias', () => {
  it('mostra o próximo marco e o progresso até ele', () => {
    expect(nextMilestone(0)).toEqual({ target: 1, previous: 0, progress: 0 });
    expect(nextMilestone(10)).toMatchObject({ target: 14, previous: 7 });
    expect(nextMilestone(2000)).toBeNull();
    expect(milestoneLabel(30)).toBe('1 mês');
    expect(milestoneLabel(90)).toBe('3 meses');
    expect(milestoneLabel(730)).toBe('2 anos');
  });
});

describe('água e hábitos do dia', () => {
  it('sugere a meta pelo peso, entre 1,5 e 4 litros', () => {
    expect(waterGoalFromWeight(70)).toBe(2450);
    expect(waterGoalFromWeight(30)).toBe(1500);
    expect(waterGoalFromWeight(150)).toBe(4000);
    expect(waterGoalFromWeight(NaN)).toBe(2000);
  });

  it('soma o dia e conta a sequência sem quebrar enquanto o dia não acabou', () => {
    const today = '2026-09-30';
    const totals = totalsByDate([
      intake('2026-09-27', 2000),
      intake('2026-09-28', 1500),
      intake('2026-09-28', 600),
      intake('2026-09-29', 2100),
      intake(today, 300),
    ]);
    expect(totals.get('2026-09-28')).toBe(2100);
    expect(goalStreak(totals, 2000, today)).toBe(3); // hoje ainda não bateu: conta até ontem
    totals.set(today, 2000);
    expect(goalStreak(totals, 2000, today)).toBe(4);
    expect(bestGoalStreak(totals, 2000, today, 10)).toBe(4);
    expect(lastDays(totals, 2000, today, 3).map((d) => d.reached)).toEqual([true, true, true]);
  });

  it('formata as quantidades', () => {
    expect(formatAmount('ml', 1500)).toBe('1,5 L');
    expect(formatAmount('ml', 300)).toBe('300 ml');
    expect(formatAmount('h', 7.5)).toBe('7,5 h');
    expect(formatAmount('min', 30)).toBe('30 min');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('vontades', () => {
  it('ordena os gatilhos mais comuns', () => {
    const craving = (triggers: string[]): HabitEvent => ({ ...intake('2026-09-30', 1), kind: 'craving', details: { triggers } });
    expect(cravingTriggerRanking([craving(['Estresse', 'Com café']), craving(['Estresse'])])).toEqual([
      { trigger: 'Estresse', count: 2 },
      { trigger: 'Com café', count: 1 },
    ]);
  });
});

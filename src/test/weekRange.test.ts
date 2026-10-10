import { describe, it, expect } from 'vitest';
import { getCurrentWeekRange, todayLocal } from '@/hooks/useWeeklyGoals';

describe('semana das metas (domingo a sábado, no dia do aparelho)', () => {
  it('às 22h de sábado continua na mesma semana (antes "pulava" para a seguinte depois das 21h)', () => {
    expect(getCurrentWeekRange(new Date(2026, 9, 10, 22, 30))).toEqual({ weekStart: '2026-10-04', weekEnd: '2026-10-10' });
  });

  it('domingo à noite já é a semana nova; sábado de manhã ainda é a anterior', () => {
    expect(getCurrentWeekRange(new Date(2026, 9, 11, 23, 50)).weekStart).toBe('2026-10-11');
    expect(getCurrentWeekRange(new Date(2026, 9, 10, 0, 5)).weekStart).toBe('2026-10-04');
  });

  it('virada de mês e de ano', () => {
    expect(getCurrentWeekRange(new Date(2026, 11, 31, 21, 30))).toEqual({ weekStart: '2026-12-27', weekEnd: '2027-01-02' });
  });

  it('hoje é o dia do aparelho, não o de Londres', () => {
    expect(todayLocal(new Date(2026, 9, 10, 23, 59))).toBe('2026-10-10');
  });
});

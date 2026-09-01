import { describe, it, expect } from 'vitest';
import { getWeekStartISO, weekDatesFrom } from '@/lib/psychologistAvailability';

describe('getWeekStartISO', () => {
  it('retorna a própria data quando já é segunda-feira', () => {
    expect(getWeekStartISO(new Date(2026, 8, 7))).toBe('2026-09-07'); // segunda
  });

  it('retorna a segunda anterior para os demais dias da semana', () => {
    expect(getWeekStartISO(new Date(2026, 8, 8))).toBe('2026-09-07'); // terça
    expect(getWeekStartISO(new Date(2026, 8, 12))).toBe('2026-09-07'); // sábado
  });

  it('domingo pertence à semana que começou na segunda anterior', () => {
    expect(getWeekStartISO(new Date(2026, 8, 13))).toBe('2026-09-07'); // domingo
  });

  it('lida corretamente com virada de mês', () => {
    // 2026-08-31 é uma segunda-feira; 2026-09-01 (terça) deve cair na mesma semana.
    expect(getWeekStartISO(new Date(2026, 7, 31))).toBe('2026-08-31');
    expect(getWeekStartISO(new Date(2026, 8, 1))).toBe('2026-08-31');
  });
});

describe('weekDatesFrom', () => {
  it('gera as 7 datas de segunda a domingo', () => {
    expect(weekDatesFrom('2026-09-07')).toEqual([
      '2026-09-07',
      '2026-09-08',
      '2026-09-09',
      '2026-09-10',
      '2026-09-11',
      '2026-09-12',
      '2026-09-13',
    ]);
  });

  it('lida corretamente com virada de mês', () => {
    expect(weekDatesFrom('2026-08-31')).toEqual([
      '2026-08-31',
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
      '2026-09-05',
      '2026-09-06',
    ]);
  });
});

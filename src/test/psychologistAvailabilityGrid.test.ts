import { describe, it, expect } from 'vitest';
import { halfHourGridSlots, addHalfHour } from '@/lib/psychologistAvailability';

describe('halfHourGridSlots', () => {
  it('gera os horários de meia em meia hora dentro do range, exemplo 8h-16h', () => {
    const slots = halfHourGridSlots('08:00', '16:00');
    expect(slots[0]).toBe('08:00');
    expect(slots[slots.length - 1]).toBe('15:30');
    expect(slots).toHaveLength(16);
    expect(slots).toContain('09:00');
    expect(slots).toContain('12:30');
  });

  it('não inclui um slot que ultrapassaria o fim do range', () => {
    const slots = halfHourGridSlots('08:00', '09:15');
    // 08:00-08:30 cabe, 08:30-09:00 cabe, 09:00-09:30 NÃO cabe (passa de 09:15)
    expect(slots).toEqual(['08:00', '08:30']);
  });

  it('range exato de meia hora gera um único slot', () => {
    expect(halfHourGridSlots('09:00', '09:30')).toEqual(['09:00']);
  });

  it('range vazio ou invertido não gera slots', () => {
    expect(halfHourGridSlots('', '16:00')).toEqual([]);
    expect(halfHourGridSlots('16:00', '08:00')).toEqual([]);
    expect(halfHourGridSlots('08:00', '08:00')).toEqual([]);
  });
});

describe('addHalfHour', () => {
  it('soma 30 minutos dentro da mesma hora', () => {
    expect(addHalfHour('09:00')).toBe('09:30');
  });

  it('soma 30 minutos virando a hora', () => {
    expect(addHalfHour('09:30')).toBe('10:00');
  });
});

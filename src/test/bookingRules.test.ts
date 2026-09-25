import { describe, it, expect } from 'vitest';
import { isSlotFree, respectsMinNotice, DEFAULT_BOOKING_RULES } from '@/lib/bookingRules';

const at = (h: number, m = 0) => new Date(2030, 0, 7, h, m).getTime();
const appt = (h: number, m = 0, duration = 50) => ({ scheduled_at: new Date(at(h, m)).toISOString(), duration });

describe('regras de agendamento', () => {
  it('detecta sobreposição dos dois lados, não só quem começa dentro', () => {
    expect(isSlotFree(at(8, 30), 50, [appt(9)], 0)).toBe(false); // termina 09:20, depois do início da outra
    expect(isSlotFree(at(8, 10), 50, [appt(9)], 0)).toBe(true); // termina 09:00 exato
    expect(isSlotFree(at(9, 50), 50, [appt(9)], 0)).toBe(true);
  });

  it('aplica o intervalo antes e depois', () => {
    expect(isSlotFree(at(9, 50), 50, [appt(9)], 10)).toBe(false);
    expect(isSlotFree(at(10), 50, [appt(9)], 10)).toBe(true);
    expect(isSlotFree(at(8, 10), 50, [appt(9)], 10)).toBe(false);
  });

  it('antecedência mínima', () => {
    const now = at(8);
    expect(respectsMinNotice(at(9, 50), DEFAULT_BOOKING_RULES, now)).toBe(false);
    expect(respectsMinNotice(at(10), DEFAULT_BOOKING_RULES, now)).toBe(true);
  });
});

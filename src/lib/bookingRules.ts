/**
 * Booking rules a psychologist sets for their own agenda, and the pure
 * checks that apply them. The same rules are enforced again server-side in
 * the `appointments` edge function (a mirror of `isSlotFree` lives there) —
 * the client only decides what to show.
 */

export interface BookingRules {
  /** Free minutes required between two consultations. */
  buffer_minutes: number;
  /** A slot must start at least this many hours from now. */
  min_notice_hours: number;
  /** The agenda only opens this many days ahead. */
  max_advance_days: number;
}

export const DEFAULT_BOOKING_RULES: BookingRules = {
  buffer_minutes: 0,
  min_notice_hours: 2,
  max_advance_days: 30,
};

export const BUFFER_OPTIONS = [0, 10, 15, 20, 30];
export const MIN_NOTICE_OPTIONS = [0, 1, 2, 4, 12, 24, 48];
export const MAX_ADVANCE_OPTIONS = [7, 14, 30, 60, 90];

/** Statuses that hold a slot on the psychologist's agenda. */
export const BLOCKING_STATUSES = ['pending', 'scheduled', 'confirmed', 'in_progress'];

export interface ExistingAppointment {
  scheduled_at: string;
  duration?: number | null;
}

const MINUTE = 60_000;

/**
 * True when a consultation of `durationMin` starting at `slotStartMs` doesn't
 * overlap any existing one, keeping `bufferMin` free on both sides.
 */
export function isSlotFree(
  slotStartMs: number,
  durationMin: number,
  appointments: ExistingAppointment[],
  bufferMin: number
): boolean {
  const slotEnd = slotStartMs + durationMin * MINUTE;
  return appointments.every((a) => {
    const start = new Date(a.scheduled_at).getTime();
    const end = start + (a.duration || 50) * MINUTE;
    return slotEnd + bufferMin * MINUTE <= start || slotStartMs >= end + bufferMin * MINUTE;
  });
}

/** True when the slot respects the minimum notice. */
export function respectsMinNotice(slotStartMs: number, rules: BookingRules, now: number = Date.now()): boolean {
  return slotStartMs >= now + rules.min_notice_hours * 60 * MINUTE;
}

/** Last calendar day (local) the agenda is open for, as a Date at 23:59:59.999. */
export function lastBookableDay(rules: BookingRules, now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + rules.max_advance_days, 23, 59, 59, 999);
}

export const normalizeRules = (row: Partial<BookingRules> | null | undefined): BookingRules => ({
  buffer_minutes: row?.buffer_minutes ?? DEFAULT_BOOKING_RULES.buffer_minutes,
  min_notice_hours: row?.min_notice_hours ?? DEFAULT_BOOKING_RULES.min_notice_hours,
  max_advance_days: row?.max_advance_days ?? DEFAULT_BOOKING_RULES.max_advance_days,
});

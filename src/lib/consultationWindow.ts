/**
 * When a scheduled consultation's video room can be entered.
 *
 * Before this existed the patient list only showed appointments whose start
 * was still in the future, while the "Entrar" button only unlocked once the
 * start had passed — the two conditions never held at the same time, so the
 * room was unreachable. It also never accepted `in_progress`, so whoever
 * dropped mid-call could not get back in.
 */

export const DEFAULT_CONSULTATION_MINUTES = 50;
/** The room opens this many minutes before the scheduled start. */
export const JOIN_EARLY_MINUTES = 10;
/** ...and stays enterable this many minutes after the scheduled end. */
export const CLOSE_AFTER_END_MINUTES = 15;

const JOINABLE_STATUSES = ['scheduled', 'confirmed', 'in_progress'];

export interface ConsultationLike {
  scheduled_at: string;
  status: string;
  duration?: number | null;
}

export interface ConsultationWindow {
  opensAt: number;
  startsAt: number;
  endsAt: number;
  closesAt: number;
}

export const consultationDurationMinutes = (appointment: Pick<ConsultationLike, 'duration'>): number =>
  appointment.duration && appointment.duration > 0 ? appointment.duration : DEFAULT_CONSULTATION_MINUTES;

export function getConsultationWindow(appointment: ConsultationLike): ConsultationWindow {
  const startsAt = new Date(appointment.scheduled_at).getTime();
  const endsAt = startsAt + consultationDurationMinutes(appointment) * 60_000;
  return {
    opensAt: startsAt - JOIN_EARLY_MINUTES * 60_000,
    startsAt,
    endsAt,
    closesAt: endsAt + CLOSE_AFTER_END_MINUTES * 60_000,
  };
}

/** True while the video room can be (re)entered. */
export function canJoinConsultation(appointment: ConsultationLike, now: number = Date.now()): boolean {
  if (!JOINABLE_STATUSES.includes(appointment.status)) return false;
  const { opensAt, closesAt } = getConsultationWindow(appointment);
  return now >= opensAt && now <= closesAt;
}

/**
 * True while the appointment still belongs in an "upcoming" list: until the
 * room closes, not merely until the scheduled start.
 */
export function isConsultationUpcoming(appointment: ConsultationLike, now: number = Date.now()): boolean {
  return now <= getConsultationWindow(appointment).closesAt;
}

/** Message shown to the participant who did NOT end the consultation. */
export const consultationEndedMessage = (endedByType?: string | null): string => {
  if (endedByType === 'psychologist') return 'O psicólogo encerrou a consulta.';
  if (endedByType === 'patient') return 'O paciente encerrou a consulta.';
  return 'A consulta foi encerrada.';
};

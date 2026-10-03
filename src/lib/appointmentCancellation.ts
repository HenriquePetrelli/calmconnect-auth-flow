// Regra de cancelamento (igual à função cancel_appointment do banco).
// Paciente: cancela até o início; a consulta do mês volta se o pedido ainda
// não tinha sido confirmado ou se faltam 24h ou mais. Psicólogo: a consulta
// do mês sempre volta para o paciente.

export const CANCELLABLE_STATUSES = ['pending', 'scheduled', 'confirmed', 'reschedule_proposed'];
export const FREE_CANCEL_HOURS = 24;

export interface CancellableAppointment {
  scheduled_at: string;
  status: string;
  appointment_type?: string;
}

export const canCancelAppointment = (appointment: CancellableAppointment, now: number = Date.now()): boolean =>
  CANCELLABLE_STATUSES.includes(appointment.status) && new Date(appointment.scheduled_at).getTime() > now;

export const cancellationRefunds = (
  appointment: CancellableAppointment,
  by: 'patient' | 'psychologist',
  now: number = Date.now(),
): boolean => {
  if (appointment.appointment_type === 'emergency') return false;
  if (by === 'psychologist') return true;
  if (appointment.status === 'pending' || appointment.status === 'reschedule_proposed') return true;
  return new Date(appointment.scheduled_at).getTime() - now >= FREE_CANCEL_HOURS * 60 * 60 * 1000;
};

/** Texto explicando o que acontece com a consulta do mês. */
export const cancellationNotice = (
  appointment: CancellableAppointment,
  by: 'patient' | 'psychologist',
  now: number = Date.now(),
): string => {
  if (by === 'psychologist') {
    return 'O paciente será avisado e a consulta do mês volta para ele agendar outro horário.';
  }
  if (cancellationRefunds(appointment, by, now)) {
    return 'O psicólogo será avisado e a sua consulta do mês volta: você pode agendar outro horário.';
  }
  return `Faltam menos de ${FREE_CANCEL_HOURS}h para a consulta. Se cancelar agora, ela conta como a consulta do mês. O psicólogo será avisado.`;
};

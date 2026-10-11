/** Até quantos dias depois da consulta o paciente ainda pode avaliar pelo histórico. */
export const RATING_WINDOW_DAYS = 30;

export const canRateAppointment = (
  appointment: { status: string; scheduled_at: string; video_room_id?: string | null; psychologist_id?: string | null },
  now: number = Date.now(),
): boolean =>
  appointment.status === 'completed' &&
  // Psicólogo excluído: a consulta fica no histórico, mas não há a quem avaliar.
  appointment.psychologist_id !== null &&
  !!appointment.video_room_id &&
  now - new Date(appointment.scheduled_at).getTime() <= RATING_WINDOW_DAYS * 24 * 60 * 60 * 1000;

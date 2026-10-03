/** Até quantas horas depois do horário dá para relatar problema técnico na consulta. */
export const PROBLEM_REPORT_WINDOW_HOURS = 48;

const REPORTABLE_STATUSES = ['scheduled', 'confirmed', 'in_progress', 'completed'];

/** Mesma regra do banco (report_consultation_problem). */
export const canReportConsultationProblem = (
  appointment: { status: string; scheduled_at: string },
  now: number = Date.now(),
): boolean => {
  const start = new Date(appointment.scheduled_at).getTime();
  return (
    REPORTABLE_STATUSES.includes(appointment.status) &&
    now >= start &&
    now - start <= PROBLEM_REPORT_WINDOW_HOURS * 60 * 60 * 1000
  );
};

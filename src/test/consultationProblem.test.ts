import { describe, expect, it } from 'vitest';
import { canReportConsultationProblem } from '@/lib/consultationProblem';

const at = '2026-10-04T15:00:00Z';
const start = new Date(at).getTime();
const hour = 60 * 60 * 1000;

describe('canReportConsultationProblem', () => {
  it('permite do horário da consulta até 48h depois', () => {
    expect(canReportConsultationProblem({ status: 'completed', scheduled_at: at }, start + hour)).toBe(true);
    expect(canReportConsultationProblem({ status: 'in_progress', scheduled_at: at }, start)).toBe(true);
    expect(canReportConsultationProblem({ status: 'completed', scheduled_at: at }, start + 49 * hour)).toBe(false);
  });

  it('não permite antes do horário', () => {
    expect(canReportConsultationProblem({ status: 'scheduled', scheduled_at: at }, start - hour)).toBe(false);
  });

  it('não permite em consulta cancelada, recusada ou não realizada', () => {
    for (const status of ['cancelled', 'declined', 'no_show', 'pending']) {
      expect(canReportConsultationProblem({ status, scheduled_at: at }, start + hour)).toBe(false);
    }
  });
});

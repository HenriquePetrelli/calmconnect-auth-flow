import { describe, it, expect } from 'vitest';
import {
  canJoinConsultation,
  getConsultationWindow,
  isConsultationUpcoming,
} from '@/lib/consultationWindow';

const START = new Date('2026-10-05T14:00:00-03:00').getTime();
const MIN = 60_000;
const appt = (status: string, duration?: number) => ({
  scheduled_at: new Date(START).toISOString(),
  status,
  duration,
});

describe('janela de entrada da consulta agendada', () => {
  it('abre 10 min antes e fecha 15 min depois do fim (50 min por padrão)', () => {
    const w = getConsultationWindow(appt('confirmed'));
    expect(w.opensAt).toBe(START - 10 * MIN);
    expect(w.endsAt).toBe(START + 50 * MIN);
    expect(w.closesAt).toBe(START + 65 * MIN);
  });

  it('respeita a duração gravada na consulta', () => {
    expect(getConsultationWindow(appt('confirmed', 30)).closesAt).toBe(START + 45 * MIN);
  });

  it('não libera antes da abertura nem depois do fechamento', () => {
    expect(canJoinConsultation(appt('confirmed'), START - 11 * MIN)).toBe(false);
    expect(canJoinConsultation(appt('confirmed'), START - 10 * MIN)).toBe(true);
    expect(canJoinConsultation(appt('confirmed'), START + 65 * MIN)).toBe(true);
    expect(canJoinConsultation(appt('confirmed'), START + 66 * MIN)).toBe(false);
  });

  it('aceita in_progress, para quem caiu poder voltar à sala', () => {
    expect(canJoinConsultation(appt('in_progress'), START + 20 * MIN)).toBe(true);
  });

  it('nunca libera consultas pendentes, canceladas ou concluídas', () => {
    for (const status of ['pending', 'cancelled', 'completed', 'reschedule_proposed']) {
      expect(canJoinConsultation(appt(status), START)).toBe(false);
    }
  });

  it('a consulta continua na lista de próximas enquanto a sala está aberta', () => {
    // Antes ela sumia da lista no exato minuto em que ficava acessível.
    expect(isConsultationUpcoming(appt('confirmed'), START + 5 * MIN)).toBe(true);
    expect(isConsultationUpcoming(appt('confirmed'), START + 66 * MIN)).toBe(false);
  });
});

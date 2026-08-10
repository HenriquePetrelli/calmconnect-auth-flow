import { describe, expect, it } from 'vitest';
import {
  endedByLabel,
  formatDuration,
  sosStatusLabel,
  sosStatusTone,
  waitSeconds,
  describeEndReason,
  type SosHistoryRow,
} from '@/lib/sosHistory';

const row = (over: Partial<SosHistoryRow> = {}): SosHistoryRow => ({
  id: 'r1',
  created_at: '2026-08-09T10:00:00.000Z',
  accepted_at: null,
  ended_at: null,
  status: 'pending',
  duration: null,
  end_reason: null,
  ended_by_type: null,
  crisis_resolved: null,
  ...over,
});

describe('sosHistory — rótulos de status', () => {
  it('traduz os status canônicos', () => {
    expect(sosStatusLabel('pending')).toBe('Aguardando');
    expect(sosStatusLabel('in_progress')).toBe('Em andamento');
    expect(sosStatusLabel('completed')).toBe('Concluída');
    expect(sosStatusLabel('cancelled')).toBe('Cancelada');
  });

  it('não inventa rótulo para status desconhecido', () => {
    expect(sosStatusLabel('waiting')).toBe('Desconhecido');
    expect(sosStatusLabel(null)).toBe('Desconhecido');
  });

  it('mapeia o tom visual por status', () => {
    expect(sosStatusTone('completed')).toBe('success');
    expect(sosStatusTone('accepted')).toBe('active');
    expect(sosStatusTone('cancelled')).toBe('muted');
    expect(sosStatusTone('pending')).toBe('neutral');
  });
});

describe('sosHistory — formatação', () => {
  it('formata durações em h/min/s', () => {
    expect(formatDuration(null)).toBe('—');
    expect(formatDuration(0)).toBe('—');
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(750)).toBe('12min 30s');
    expect(formatDuration(3900)).toBe('1h 05min');
  });

  it('traduz quem encerrou', () => {
    expect(endedByLabel('patient')).toBe('Paciente');
    expect(endedByLabel('psychologist')).toBe('Psicólogo');
    expect(endedByLabel('system')).toBe('Sistema');
    expect(endedByLabel(null)).toBe('—');
  });

  it('reaproveita o vocabulário canônico de motivos', () => {
    expect(describeEndReason('time_limit')).toBe('Tempo limite atingido');
    expect(describeEndReason('inventado')).toBe('Não informado');
  });
});

describe('sosHistory — tempo de espera', () => {
  it('retorna nulo quando não houve aceite', () => {
    expect(waitSeconds(row())).toBeNull();
  });

  it('calcula os segundos entre criação e aceite', () => {
    expect(waitSeconds(row({ accepted_at: '2026-08-09T10:01:30.000Z' }))).toBe(90);
  });

  it('nunca retorna valor negativo', () => {
    expect(waitSeconds(row({ accepted_at: '2026-08-09T09:59:00.000Z' }))).toBe(0);
  });
});

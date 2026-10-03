import { describe, expect, it } from 'vitest';
import { remoteAbsenceSeconds } from '@/lib/remoteAbsence';

describe('remoteAbsenceSeconds', () => {
  const joinedAt = 1_000_000;

  it('é 0 com o outro lado na sala', () => {
    expect(remoteAbsenceSeconds({ remotePresent: true, remoteLeftAt: null, joinedAt, now: joinedAt + 500_000 })).toBe(0);
  });

  it('conta desde a minha entrada quando o outro nunca entrou', () => {
    expect(remoteAbsenceSeconds({ remotePresent: false, remoteLeftAt: null, joinedAt, now: joinedAt + 95_000 })).toBe(95);
  });

  it('conta desde a saída quando o outro caiu', () => {
    expect(remoteAbsenceSeconds({ remotePresent: false, remoteLeftAt: joinedAt + 60_000, joinedAt, now: joinedAt + 90_000 })).toBe(30);
  });

  it('não conta antes do horário da consulta', () => {
    const notBefore = joinedAt + 300_000;
    expect(remoteAbsenceSeconds({ remotePresent: false, remoteLeftAt: null, joinedAt, notBefore, now: joinedAt + 200_000 })).toBe(0);
    expect(remoteAbsenceSeconds({ remotePresent: false, remoteLeftAt: null, joinedAt, notBefore, now: notBefore + 10_000 })).toBe(10);
  });
});

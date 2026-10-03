/**
 * Quanto tempo o outro participante está fora da sala, para oferecer saídas
 * (chamar outro psicólogo, avisar o outro lado) em vez de deixar a pessoa
 * esperando sem saber o que fazer.
 */
export interface RemoteAbsenceInput {
  remotePresent: boolean;
  /** Quando o outro saiu (null se nunca entrou). */
  remoteLeftAt: number | null;
  /** Quando eu entrei na sala. */
  joinedAt: number;
  /** A partir de quando faz sentido contar (ex.: horário da consulta). */
  notBefore?: number;
  now: number;
}

/** Segundos de ausência do outro lado; 0 se ele está na sala. */
export function remoteAbsenceSeconds({ remotePresent, remoteLeftAt, joinedAt, notBefore, now }: RemoteAbsenceInput): number {
  if (remotePresent) return 0;
  const since = Math.max(remoteLeftAt ?? joinedAt, notBefore ?? 0);
  return Math.max(0, Math.floor((now - since) / 1000));
}

/** Depois de quanto tempo de ausência o painel aparece. */
export const SOS_ABSENCE_THRESHOLD_SECONDS = 90;
export const CONSULTATION_ABSENCE_THRESHOLD_SECONDS = 120;

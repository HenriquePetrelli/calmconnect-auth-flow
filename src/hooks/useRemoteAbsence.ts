import { useEffect, useRef, useState } from 'react';
import { remoteAbsenceSeconds } from '@/lib/remoteAbsence';

interface UseRemoteAbsenceProps {
  remotePresent: boolean;
  remoteLeftAt: number | null;
  /** Só conta enquanto estou na sala e a chamada não acabou. */
  enabled: boolean;
  /** Não conta antes disso (ms), ex.: horário marcado da consulta. */
  notBefore?: number;
}

/** Segundos que o outro participante está fora da sala (atualiza a cada 5s). */
export const useRemoteAbsence = ({ remotePresent, remoteLeftAt, enabled, notBefore }: UseRemoteAbsenceProps) => {
  const joinedAtRef = useRef<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  if (enabled && joinedAtRef.current === null) joinedAtRef.current = Date.now();

  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(timer);
  }, [enabled]);

  if (!enabled || joinedAtRef.current === null) return 0;
  return remoteAbsenceSeconds({ remotePresent, remoteLeftAt, joinedAt: joinedAtRef.current, notBefore, now });
};

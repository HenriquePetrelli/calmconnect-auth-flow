import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseSharedCallTimerProps {
  sessionId?: string;
  userType: 'psychologist' | 'patient';
  /** Total session duration in seconds. */
  timeLimit: number;
  /** Timer only runs while both participants are actually in the room. */
  running: boolean;
  onExpire: () => void;
}

/**
 * Session timer shared between patient and psychologist.
 *
 * - The remaining time lives in `webrtc_sessions.time_left_seconds`, so a
 *   reconnection resumes EXACTLY from where it stopped.
 * - The countdown is paused whenever one of the participants drops.
 * - The psychologist is the authoritative writer (the timer is paused when he
 *   is absent, so no other writer is needed); the patient mirrors the value.
 */
export const useSharedCallTimer = ({
  sessionId,
  userType,
  timeLimit,
  running,
  onExpire,
}: UseSharedCallTimerProps) => {
  const [timeLeft, setTimeLeft] = useState<number>(timeLimit);
  const [loaded, setLoaded] = useState(false);
  const timeLeftRef = useRef(timeLimit);
  const expiredRef = useRef(false);
  const isWriter = userType === 'psychologist';

  timeLeftRef.current = timeLeft;

  const persist = useCallback(
    async (value: number, paused: boolean) => {
      if (!sessionId || !isWriter) return;
      await supabase
        .from('webrtc_sessions')
        .update({
          time_left_seconds: Math.max(0, Math.round(value)),
          timer_paused: paused,
          timer_updated_at: new Date().toISOString(),
        } as any)
        .eq('id', sessionId);
    },
    [sessionId, isWriter]
  );

  // Restore the persisted remaining time when (re)entering the room.
  useEffect(() => {
    let cancelled = false;
    if (!sessionId) return;

    const load = async () => {
      const { data } = await supabase
        .from('webrtc_sessions')
        .select('time_left_seconds')
        .eq('id', sessionId)
        .maybeSingle();

      if (cancelled) return;
      const stored = (data as any)?.time_left_seconds;
      setTimeLeft(typeof stored === 'number' ? Math.max(0, stored) : timeLimit);
      setLoaded(true);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [sessionId, timeLimit]);

  // Mirror the authoritative value for the non-writer side.
  useEffect(() => {
    if (!sessionId || isWriter) return;

    const channel = supabase
      .channel(`call-timer:${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'webrtc_sessions', filter: `id=eq.${sessionId}` },
        (payload) => {
          const value = (payload.new as any)?.time_left_seconds;
          if (typeof value !== 'number') return;
          // Only correct meaningful drift so the local countdown stays smooth.
          if (Math.abs(value - timeLeftRef.current) >= 2) {
            setTimeLeft(Math.max(0, value));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, isWriter]);

  // Countdown — only while both participants are present/connected.
  useEffect(() => {
    if (!loaded || !running) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [loaded, running]);

  // Persist progress periodically while running, and immediately when paused.
  useEffect(() => {
    if (!loaded || !isWriter) return;

    if (!running) {
      persist(timeLeftRef.current, true);
      return;
    }

    persist(timeLeftRef.current, false);
    const interval = setInterval(() => persist(timeLeftRef.current, false), 5000);
    return () => clearInterval(interval);
  }, [loaded, running, isWriter, persist]);

  // Expiration
  useEffect(() => {
    if (!loaded || expiredRef.current) return;
    if (timeLeft > 0) return;
    expiredRef.current = true;
    persist(0, true);
    onExpire();
  }, [timeLeft, loaded, persist, onExpire]);

  return { timeLeft, isPaused: !running, loaded };
};

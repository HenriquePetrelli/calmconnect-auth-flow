import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseCallPresenceProps {
  sessionId?: string;
  userType: 'psychologist' | 'patient';
  enabled?: boolean;
}

/**
 * Tracks who is currently present inside an emergency call room.
 *
 * This is used to distinguish an INVOLUNTARY drop (network loss, tab crash,
 * browser closed) from a deliberate call termination. A presence drop NEVER
 * marks the call as ended — it only surfaces a "waiting for reconnection"
 * state so the peer can come back to the same room.
 */
export const useCallPresence = ({ sessionId, userType, enabled = true }: UseCallPresenceProps) => {
  const [remotePresent, setRemotePresent] = useState(false);
  const [remoteLeftAt, setRemoteLeftAt] = useState<number | null>(null);
  const remotePresentRef = useRef(false);

  const remoteType = userType === 'patient' ? 'psychologist' : 'patient';

  useEffect(() => {
    if (!sessionId || !enabled) return;

    const channel = supabase.channel(`call-presence:${sessionId}`, {
      config: { presence: { key: userType } },
    });

    const syncPresence = () => {
      const state = channel.presenceState() as Record<string, unknown[]>;
      const present = Array.isArray(state[remoteType]) && state[remoteType].length > 0;

      if (present !== remotePresentRef.current) {
        remotePresentRef.current = present;
        setRemotePresent(present);
        setRemoteLeftAt(present ? null : Date.now());
      }
    };

    channel
      .on('presence', { event: 'sync' }, syncPresence)
      .on('presence', { event: 'join' }, syncPresence)
      .on('presence', { event: 'leave' }, syncPresence)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ userType, joinedAt: Date.now() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, userType, remoteType, enabled]);

  return { remotePresent, remoteLeftAt };
};

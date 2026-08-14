import { supabase } from '@/integrations/supabase/client';

/**
 * Broadcast bus for the SOS queue.
 *
 * Postgres realtime events respect RLS: when a pending request is cancelled the
 * psychologist can no longer read the row, so the UPDATE never reaches him and
 * the card would stay on screen forever. A broadcast channel is RLS-free and
 * lets both sides refresh their view instantly.
 */
const CHANNEL = 'sos-queue';

let notifier: ReturnType<typeof supabase.channel> | null = null;

const getNotifier = () => {
  if (!notifier) {
    notifier = supabase.channel(CHANNEL, { config: { broadcast: { self: true } } });
    notifier.subscribe();
  }
  return notifier;
};

/** Tells every listener (patients + psychologists) that the queue changed. */
export const notifySosQueueChanged = (payload: Record<string, unknown> = {}) => {
  try {
    getNotifier().send({ type: 'broadcast', event: 'queue-changed', payload });
  } catch (error) {
    console.error('[SOS] failed to broadcast queue change', error);
  }
};

/** Subscribes to queue changes. Returns an unsubscribe function. */
export const subscribeSosQueue = (onChange: () => void) => {
  const channel = supabase
    .channel(`${CHANNEL}-listener-${Math.random().toString(36).slice(2)}`)
    .on('broadcast', { event: 'queue-changed' }, () => onChange())
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

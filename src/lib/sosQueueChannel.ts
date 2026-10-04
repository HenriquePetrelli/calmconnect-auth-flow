import { supabase } from '@/integrations/supabase/client';

/**
 * Broadcast bus for the SOS queue.
 *
 * Postgres realtime events respect RLS: when a pending request is cancelled the
 * psychologist can no longer read the row, so the UPDATE never reaches him and
 * the card would stay on screen forever. A broadcast channel is RLS-free and
 * lets both sides refresh their view instantly.
 *
 * Um broadcast só chega a quem está no canal com o MESMO nome. Antes, cada tela
 * ouvia um canal próprio (`sos-queue-listener-<aleatório>`) e o aviso, enviado
 * em `sos-queue`, nunca chegava: a fila só se atualizava pela checagem
 * periódica. Agora há um canal só (o Supabase devolve o mesmo objeto para o
 * mesmo nome) e as telas se inscrevem numa lista interna.
 */
const CHANNEL = 'sos-queue';

const listeners = new Set<() => void>();
let shared: ReturnType<typeof supabase.channel> | null = null;

const getChannel = () => {
  if (!shared) {
    shared = supabase
      .channel(CHANNEL, { config: { broadcast: { self: true } } })
      .on('broadcast', { event: 'queue-changed' }, () => {
        listeners.forEach((listener) => {
          try {
            listener();
          } catch (error) {
            console.error('[SOS] queue listener failed', error);
          }
        });
      })
      .subscribe();
  }
  return shared;
};

/** Tells every listener (patients + psychologists) that the queue changed. */
export const notifySosQueueChanged = (payload: Record<string, unknown> = {}) => {
  try {
    getChannel().send({ type: 'broadcast', event: 'queue-changed', payload });
  } catch (error) {
    console.error('[SOS] failed to broadcast queue change', error);
  }
};

/** Subscribes to queue changes. Returns an unsubscribe function. */
export const subscribeSosQueue = (onChange: () => void) => {
  listeners.add(onChange);
  getChannel();
  return () => {
    listeners.delete(onChange);
  };
};

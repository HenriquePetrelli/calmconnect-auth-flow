/**
 * Pure reconnection policy for emergency calls.
 *
 * Losing the network is ALWAYS an involuntary drop: the call must stay open,
 * the session row must not be touched, and we simply retry with backoff.
 */

export const MAX_RECONNECT_ATTEMPTS = 6;
export const MAX_RECONNECT_DELAY_MS = 8000;

/** Exponential backoff (1s, 2s, 4s, 8s, capped). `attempt` is 1-based. */
export function getReconnectDelay(attempt: number): number {
  const safeAttempt = Math.max(1, attempt);
  return Math.min(1000 * 2 ** (safeAttempt - 1), MAX_RECONNECT_DELAY_MS);
}

/** A dropped connection never ends the call — it only pauses it. */
export function shouldKeepCallOpenOnDrop(): boolean {
  return true;
}

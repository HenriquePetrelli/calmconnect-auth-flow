/**
 * In-call control signalling over an RTCDataChannel.
 *
 * The database + realtime is the source of truth for a termination, but it can
 * take a second or two to propagate. A direct `CALL_ENDED` message on the peer
 * connection lets the other side tear the room down immediately, exactly like
 * Meet/Uber do, while the persisted row remains the authoritative record.
 */

import { sosLog } from './sosLogger';

export const CALL_SIGNAL_CHANNEL = 'sos-control';

export type CallSignalType = 'CALL_ENDED';

export interface CallEndedSignal {
  type: 'CALL_ENDED';
  endedByType: 'patient' | 'psychologist' | 'system';
  reason: string;
  sessionId?: string | null;
  at: number;
}

export type CallSignal = CallEndedSignal;

/** Type guard for anything arriving on the control channel. */
export function parseCallSignal(raw: unknown): CallSignal | null {
  if (typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.type !== 'CALL_ENDED') return null;
    if (!['patient', 'psychologist', 'system'].includes(parsed.endedByType)) return null;
    return {
      type: 'CALL_ENDED',
      endedByType: parsed.endedByType,
      reason: typeof parsed.reason === 'string' ? parsed.reason : 'other',
      sessionId: parsed.sessionId ?? null,
      at: typeof parsed.at === 'number' ? parsed.at : Date.now(),
    };
  } catch {
    return null;
  }
}

interface DataChannelLike {
  readyState: string;
  send: (data: string) => void;
  close?: () => void;
  onmessage: ((event: { data: unknown }) => void) | null;
  onopen?: (() => void) | null;
}

interface PeerLike {
  createDataChannel: (label: string, options?: unknown) => DataChannelLike;
  ondatachannel: ((event: { channel: DataChannelLike }) => void) | null;
}

export interface CallSignalChannel {
  /** Sends CALL_ENDED to the peer. Returns false when it could not be delivered. */
  sendCallEnded: (payload: Omit<CallEndedSignal, 'type' | 'at'>) => boolean;
  close: () => void;
}

/**
 * Attaches the control channel to a peer connection.
 *
 * Both sides create their own outgoing channel and listen for the peer's one,
 * so the signal works regardless of who is the offerer.
 */
export function attachCallSignalChannel(
  pc: PeerLike,
  onSignal: (signal: CallSignal) => void
): CallSignalChannel {
  let outgoing: DataChannelLike | null = null;
  const handled = new Set<string>();

  const dispatch = (event: { data: unknown }) => {
    const signal = parseCallSignal(event.data);
    if (!signal) return;
    // Both channels can carry the same message — deliver it only once.
    const key = `${signal.type}:${signal.at}:${signal.endedByType}`;
    if (handled.has(key)) return;
    handled.add(key);
    sosLog('SESSION', 'CALL_ENDED signal received', signal);
    onSignal(signal);
  };

  try {
    outgoing = pc.createDataChannel(CALL_SIGNAL_CHANNEL, { ordered: true } as any);
    outgoing.onmessage = dispatch;
  } catch {
    outgoing = null;
  }

  const previousHandler = pc.ondatachannel;
  pc.ondatachannel = (event) => {
    previousHandler?.(event);
    if (!event?.channel) return;
    event.channel.onmessage = dispatch;
    // Prefer an already-open inbound channel when our own is not ready.
    if (!outgoing || outgoing.readyState !== 'open') outgoing = event.channel;
  };

  return {
    sendCallEnded: (payload) => {
      if (!outgoing || outgoing.readyState !== 'open') return false;
      const signal: CallEndedSignal = { type: 'CALL_ENDED', at: Date.now(), ...payload };
      try {
        outgoing.send(JSON.stringify(signal));
        sosLog('SESSION', 'CALL_ENDED signal sent', signal);
        return true;
      } catch {
        return false;
      }
    },
    close: () => {
      try {
        outgoing?.close?.();
      } catch {
        /* noop */
      }
      outgoing = null;
    },
  };
}

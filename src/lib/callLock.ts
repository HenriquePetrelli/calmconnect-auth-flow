/**
 * Single active call lock.
 *
 * Guarantees that the same user cannot have two call screens running at the
 * same time (duplicated tabs/windows) and that a user is never inside two
 * different rooms simultaneously. The lock lives in localStorage with a
 * heartbeat so a crashed tab releases it automatically.
 */

const HEARTBEAT_MS = 3000;
const STALE_MS = 10000;

export interface CallLockValue {
  sessionId: string;
  tabId: string;
  ts: number;
}

const TAB_ID =
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const keyFor = (userId: string) => `soliv_call_lock_${userId}`;

const read = (userId: string): CallLockValue | null => {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CallLockValue;
    if (!parsed?.tabId || !parsed?.ts) return null;
    if (Date.now() - parsed.ts > STALE_MS) return null; // stale → free
    return parsed;
  } catch {
    return null;
  }
};

const write = (userId: string, sessionId: string) => {
  try {
    localStorage.setItem(
      keyFor(userId),
      JSON.stringify({ sessionId, tabId: TAB_ID, ts: Date.now() } as CallLockValue)
    );
  } catch {
    /* ignore quota / private mode errors */
  }
};

export type AcquireResult =
  | { ok: true; release: () => void }
  | { ok: false; reason: 'duplicate-tab' | 'other-room'; sessionId: string };

export const acquireCallLock = (userId: string, sessionId: string): AcquireResult => {
  const existing = read(userId);

  if (existing && existing.tabId !== TAB_ID) {
    return {
      ok: false,
      reason: existing.sessionId === sessionId ? 'duplicate-tab' : 'other-room',
      sessionId: existing.sessionId,
    };
  }

  write(userId, sessionId);

  const heartbeat = setInterval(() => write(userId, sessionId), HEARTBEAT_MS);

  const release = () => {
    clearInterval(heartbeat);
    const current = read(userId);
    if (!current || current.tabId === TAB_ID) {
      try {
        localStorage.removeItem(keyFor(userId));
      } catch {
        /* ignore */
      }
    }
  };

  window.addEventListener('pagehide', release, { once: true });

  return { ok: true, release };
};

export const getCallLock = (userId: string) => read(userId);

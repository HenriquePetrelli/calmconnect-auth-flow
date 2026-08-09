/**
 * Structured, namespaced logging for the emergency (SOS) flow.
 * Only active in development — end users never see these logs.
 */

export type SosLogScope = 'SOS' | 'WEBRTC' | 'REALTIME' | 'MEDIA' | 'TIMER' | 'SESSION';

const enabled = (() => {
  try {
    return import.meta.env?.DEV === true;
  } catch {
    return false;
  }
})();

const emit = (level: 'log' | 'warn' | 'error', scope: SosLogScope, message: string, data?: unknown) => {
  if (!enabled) return;
  const prefix = `[${scope}]`;
  if (data === undefined) console[level](prefix, message);
  else console[level](prefix, message, data);
};

export const sosLog = (scope: SosLogScope, message: string, data?: unknown) =>
  emit('log', scope, message, data);

export const sosWarn = (scope: SosLogScope, message: string, data?: unknown) =>
  emit('warn', scope, message, data);

export const sosError = (scope: SosLogScope, message: string, data?: unknown) =>
  emit('error', scope, message, data);

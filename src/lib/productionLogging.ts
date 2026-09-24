import { isDiagnosticsEnabled } from '@/lib/callDiagnostics';

type ConsoleLike = Pick<Console, 'log' | 'info' | 'debug'>;

/**
 * Silences console.log/info/debug in production builds.
 *
 * The app has hundreds of console.* calls, many printing user ids, session
 * ids and request payloads — fine while developing, but in production that
 * is health-app data sitting in the console of any shared or borrowed
 * device. warn/error stay on (they're what's useful when something breaks),
 * and verbose logging can be turned back on for support with the same
 * switch as the call diagnostics panel (?debug=1, or Ctrl+Shift+D in a call).
 */
export function silenceVerboseLogsInProduction(
  isProd: boolean,
  search: string,
  storage: Pick<Storage, 'getItem'> | null,
  target: ConsoleLike = console
): boolean {
  if (!isProd || isDiagnosticsEnabled(search, storage)) return false;
  const noop = () => {};
  target.log = noop;
  target.info = noop;
  target.debug = noop;
  return true;
}

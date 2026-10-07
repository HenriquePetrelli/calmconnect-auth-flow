const DEBUG_STORAGE_KEY = 'sos:diagnostics';

/**
 * Logs detalhados ligados para suporte: `?debug=1` no endereço (ou a marca
 * antiga guardada no navegador). Não há mais painel de diagnóstico na chamada.
 */
export function isVerboseLoggingEnabled(search: string, storage?: Pick<Storage, 'getItem'> | null): boolean {
  try {
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    const flag = params.get('debug') ?? params.get('diagnostics');
    if (flag !== null) return flag !== '0' && flag !== 'false';
  } catch {
    /* ignore malformed query strings */
  }
  try {
    return storage?.getItem(DEBUG_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

type ConsoleLike = Pick<Console, 'log' | 'info' | 'debug'>;

/**
 * Silences console.log/info/debug in production builds.
 *
 * The app has hundreds of console.* calls, many printing user ids, session
 * ids and request payloads — fine while developing, but in production that
 * is health-app data sitting in the console of any shared or borrowed
 * device. warn/error stay on (they're what's useful when something breaks),
 * and verbose logging can be turned back on for support with the same
 * switch (?debug=1).
 */
export function silenceVerboseLogsInProduction(
  isProd: boolean,
  search: string,
  storage: Pick<Storage, 'getItem'> | null,
  target: ConsoleLike = console
): boolean {
  if (!isProd || isVerboseLoggingEnabled(search, storage)) return false;
  const noop = () => {};
  target.log = noop;
  target.info = noop;
  target.debug = noop;
  return true;
}

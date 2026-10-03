/**
 * Rede de segurança contra clique duplo: uma escrita idêntica (mesmo método,
 * endereço, login e conteúdo) disparada enquanto a primeira ainda está em
 * andamento não vai de novo ao servidor; recebe a mesma resposta. Vale para
 * todo o app (agendar, enviar mensagem, avaliar, pedir SOS...), inclusive
 * telas que não travam o botão durante o envio. Leituras (GET) e uploads de
 * arquivo passam direto.
 *
 * Fica em window.fetch (e não no client do Supabase) porque o arquivo do
 * client é gerado automaticamente e seria sobrescrito.
 */

const SUPABASE_HOST = /^https:\/\/[a-z0-9-]+\.supabase\.co\//i;

type FetchFn = typeof fetch;

const headerValue = (headers: HeadersInit | undefined, name: string): string => {
  if (!headers) return '';
  if (headers instanceof Headers) return headers.get(name) ?? '';
  if (Array.isArray(headers)) return headers.find(([k]) => k.toLowerCase() === name)?.[1] ?? '';
  const entry = Object.entries(headers).find(([k]) => k.toLowerCase() === name);
  return entry?.[1] ?? '';
};

export const createDedupedFetch = (fetchImpl: FetchFn): FetchFn => {
  const inflight = new Map<string, Promise<Response>>();

  return (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const body = init?.body;

    if (method === 'GET' || method === 'HEAD' || typeof body !== 'string' || !SUPABASE_HOST.test(url)) {
      return fetchImpl(input, init);
    }

    const key = [method, url, headerValue(init?.headers, 'authorization'), body].join('\n');
    let pending = inflight.get(key);
    if (!pending) {
      pending = fetchImpl(input, init).finally(() => inflight.delete(key));
      inflight.set(key, pending);
    }
    // Cada chamador lê a própria cópia da resposta.
    return pending.then((response) => response.clone());
  };
};

export const installRequestDedupe = () => {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;
  window.fetch = createDedupedFetch(window.fetch.bind(window));
};

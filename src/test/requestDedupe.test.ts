import { describe, expect, it, vi } from 'vitest';
import { createDedupedFetch } from '@/lib/requestDedupe';

const URL_RPC = 'https://abc.supabase.co/rest/v1/rpc/cancel_appointment';

const deferred = () => {
  let resolve!: (r: Response) => void;
  const promise = new Promise<Response>((r) => (resolve = r));
  return { promise, resolve };
};

describe('createDedupedFetch', () => {
  it('junta escritas idênticas em andamento numa só requisição', async () => {
    const d = deferred();
    const impl = vi.fn(() => d.promise);
    const f = createDedupedFetch(impl as unknown as typeof fetch);
    const init = { method: 'POST', body: '{"p_appointment_id":"1"}', headers: { Authorization: 'Bearer a' } };
    const a = f(URL_RPC, init);
    const b = f(URL_RPC, init);
    d.resolve(new Response('{"ok":true}'));
    expect(await (await a).json()).toEqual({ ok: true });
    expect(await (await b).json()).toEqual({ ok: true });
    expect(impl).toHaveBeenCalledTimes(1);
  });

  it('depois que a primeira termina, a próxima vai de novo', async () => {
    const impl = vi.fn(async () => new Response('{}'));
    const f = createDedupedFetch(impl as unknown as typeof fetch);
    await f(URL_RPC, { method: 'POST', body: '{}' });
    await f(URL_RPC, { method: 'POST', body: '{}' });
    expect(impl).toHaveBeenCalledTimes(2);
  });

  it('não junta conteúdos ou logins diferentes, leituras nem outros sites', async () => {
    const impl = vi.fn(() => new Promise<Response>(() => {}));
    const f = createDedupedFetch(impl as unknown as typeof fetch);
    void f(URL_RPC, { method: 'POST', body: '{"a":1}' });
    void f(URL_RPC, { method: 'POST', body: '{"a":2}' });
    void f(URL_RPC, { method: 'POST', body: '{"a":1}', headers: { Authorization: 'Bearer outro' } });
    void f(URL_RPC, { method: 'GET' });
    void f(URL_RPC, { method: 'GET' });
    void f('https://api.stripe.com/v1/x', { method: 'POST', body: '{}' });
    void f('https://api.stripe.com/v1/x', { method: 'POST', body: '{}' });
    expect(impl).toHaveBeenCalledTimes(7);
  });

  it('erro de rede chega a todos e libera a próxima tentativa', async () => {
    const impl = vi.fn().mockRejectedValueOnce(new TypeError('offline')).mockResolvedValue(new Response('{}'));
    const f = createDedupedFetch(impl as unknown as typeof fetch);
    const init = { method: 'POST', body: '{}' };
    await expect(Promise.all([f(URL_RPC, init), f(URL_RPC, init)])).rejects.toThrow('offline');
    await expect(f(URL_RPC, init)).resolves.toBeInstanceOf(Response);
  });
});

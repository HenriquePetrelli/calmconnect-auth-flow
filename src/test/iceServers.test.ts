import { beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } } }));

import { FALLBACK_ICE_SERVERS, getIceServers, resetIceServersCache } from '@/lib/iceServers';

const turn = [{ urls: 'turn:turn.example.com:3478', username: 'u', credential: 'c' }];

describe('getIceServers', () => {
  beforeEach(() => {
    invoke.mockReset();
    resetIceServersCache();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('usa os servidores da edge function e guarda em cache', async () => {
    invoke.mockResolvedValue({ data: { iceServers: turn, ttl: 14400 }, error: null });
    expect(await getIceServers()).toEqual(turn);
    expect(await getIceServers()).toEqual(turn);
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('cai para STUN quando a função falha', async () => {
    invoke.mockResolvedValue({ data: null, error: new Error('500') });
    expect(await getIceServers()).toEqual(FALLBACK_ICE_SERVERS);
  });

  it('cai para STUN quando a resposta vem vazia', async () => {
    invoke.mockResolvedValue({ data: { iceServers: [] }, error: null });
    expect(await getIceServers()).toEqual(FALLBACK_ICE_SERVERS);
  });

  it('não segura a chamada se a função demorar', async () => {
    vi.useFakeTimers();
    invoke.mockReturnValue(new Promise(() => {}));
    const pending = getIceServers();
    await vi.advanceTimersByTimeAsync(4000);
    expect(await pending).toEqual(FALLBACK_ICE_SERVERS);
    vi.useRealTimers();
  });
});

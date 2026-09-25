import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakeDb, fakeSupabase } from './fakeSupabase';

vi.mock('@/integrations/supabase/client', () => ({ supabase: fakeSupabase }));

import { deactivateStoredPushToken, getStoredPushToken, saveActivePushToken } from '@/lib/pushToken';

beforeEach(() => {
  localStorage.clear();
  fakeDb.tables = {};
  fakeDb.writes = [];
  fakeDb.rpcHandlers = {};
});

describe('token de push do aparelho', () => {
  it('registra pela RPC (que troca o dono num aparelho compartilhado) e lembra o token', async () => {
    const rpcSpy = vi.fn(() => ({ data: null, error: null }));
    fakeDb.rpcHandlers.register_push_token = rpcSpy;

    await saveActivePushToken('token-do-aparelho', { platform: 'android' });

    expect(rpcSpy).toHaveBeenCalledWith(expect.anything(), {
      p_token: 'token-do-aparelho',
      p_device_info: { platform: 'android' },
    });
    expect(getStoredPushToken()).toBe('token-do-aparelho');
  });

  it('no logout desativa o token deste aparelho e esquece ele', async () => {
    localStorage.setItem('soliv-push-token', 'token-do-aparelho');
    fakeDb.seed('fcm_tokens', [{ token: 'token-do-aparelho', is_active: true }]);

    await deactivateStoredPushToken();

    expect(fakeDb.rows('fcm_tokens')[0].is_active).toBe(false);
    expect(getStoredPushToken()).toBeNull();
  });
});

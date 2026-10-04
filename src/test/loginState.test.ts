import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpcMock = vi.fn();
const fromMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: (...a: unknown[]) => rpcMock(...a), from: (...a: unknown[]) => fromMock(...a) },
}));

import { clearLoginState, fetchLoginState, userTypeFromLoginState, type LoginState } from '@/lib/loginState';

const base: LoginState = { is_admin: false, profile: null, patient: null, psychologist: null, registration: null, rejection: null };

describe('tipo de conta no login', () => {
  it('admin, paciente e psicólogo aprovado ou em análise', () => {
    expect(userTypeFromLoginState({ ...base, is_admin: true })).toBe('admin');
    expect(userTypeFromLoginState({ ...base, profile: { user_type: 'patient', full_name: 'A' } })).toBe('patient');
    const psi = { ...base, profile: { user_type: 'psychologist', full_name: 'B' } };
    expect(userTypeFromLoginState({ ...psi, registration: { status: 'approved', rejected_at: null, rejection_reason: null } })).toBe('psychologist');
    expect(userTypeFromLoginState({ ...psi, registration: { status: 'pending', rejected_at: null, rejection_reason: null } })).toBe('unknown');
    expect(userTypeFromLoginState(null)).toBe('unknown');
  });
});

describe('uma consulta só no login', () => {
  beforeEach(() => {
    clearLoginState();
    rpcMock.mockReset();
    fromMock.mockReset();
  });

  it('a tela de login e o controle de acesso compartilham a mesma busca', async () => {
    rpcMock.mockResolvedValue({ data: { ...base, profile: { user_type: 'patient', full_name: 'Ana' } }, error: null });
    const [a, b] = await Promise.all([fetchLoginState('u1'), fetchLoginState('u1')]);
    expect(a).toBe(b);
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith('get_login_state');
  });

  it('sem a função no banco, usa as consultas antigas em paralelo', async () => {
    rpcMock.mockImplementation((fn: string) =>
      Promise.resolve(fn === 'get_login_state' ? { data: null, error: { code: 'PGRST202' } } : { data: fn === 'is_super_admin' ? false : [], error: null }),
    );
    const single = (data: unknown) => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data }) }) }) });
    fromMock.mockImplementation((table: string) => single(table === 'profiles' ? { user_type: 'patient', full_name: 'Ana' } : null));
    const state = await fetchLoginState('u2');
    expect(userTypeFromLoginState(state)).toBe('patient');
    expect(fromMock).toHaveBeenCalledTimes(4);
  });
});

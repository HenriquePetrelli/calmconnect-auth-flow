import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const calls = vi.hoisted(() => [] as string[]);
const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  updateUser: vi.fn(),
  mfa: { listFactors: vi.fn(), challengeAndVerify: vi.fn() },
}));
const toastMock = vi.hoisted(() => vi.fn());
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ signOut: vi.fn(), user: { email: 'admin@soliv.com' } }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }));
vi.mock('@/components/ThemeToggle', () => ({ ThemeToggle: () => null }));
vi.mock('@/components/PushNotificationToggle', () => ({ PushNotificationToggle: () => null }));

import AdminProfile from '@/components/AdminProfile';

const fill = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

beforeEach(() => {
  calls.length = 0;
  toastMock.mockReset();
  [auth.signInWithPassword, auth.updateUser, auth.mfa.listFactors, auth.mfa.challengeAndVerify].forEach((fn) => fn.mockReset());
  auth.signInWithPassword.mockImplementation(async () => { calls.push('senha'); return { error: null }; });
  auth.mfa.listFactors.mockResolvedValue({ data: { all: [{ id: 'f1', factor_type: 'totp', status: 'verified' }] }, error: null });
  auth.mfa.challengeAndVerify.mockImplementation(async () => { calls.push('codigo'); return { error: null }; });
  auth.updateUser.mockImplementation(async () => { calls.push('troca'); return { error: null }; });
});

describe('troca de senha do admin com verificação em duas etapas', () => {
  it('confirma senha atual e código antes de trocar', async () => {
    render(<AdminProfile />);
    fill('Senha atual', 'Antiga123');
    fill('Nova senha', 'NovaSenha123');
    fill('Confirmar nova senha', 'NovaSenha123');
    fill('Código do app autenticador', '123456');
    fireEvent.click(screen.getByRole('button', { name: 'Trocar senha' }));
    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Senha atualizada' })));
    expect(calls).toEqual(['senha', 'codigo', 'troca']);
    expect(auth.mfa.challengeAndVerify).toHaveBeenCalledWith({ factorId: 'f1', code: '123456' });
  });

  it('sem o código não troca', async () => {
    render(<AdminProfile />);
    fill('Senha atual', 'Antiga123');
    fill('Nova senha', 'NovaSenha123');
    fill('Confirmar nova senha', 'NovaSenha123');
    fireEvent.click(screen.getByRole('button', { name: 'Trocar senha' }));
    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ description: 'Digite o código de 6 dígitos do app autenticador' })),
    );
    expect(auth.updateUser).not.toHaveBeenCalled();
  });
});

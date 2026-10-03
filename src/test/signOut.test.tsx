import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';


const signOutMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signOut: (...args: unknown[]) => signOutMock(...args),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getSession: () => Promise.resolve({ data: { session: null } }),
    },
  },
}));
vi.mock('@/lib/pushToken', () => ({ deactivateStoredPushToken: () => Promise.resolve() }));

import { AuthProvider, useAuth } from '@/contexts/AuthContext';

const LogoutButton = () => {
  const { signOut } = useAuth();
  return <button onClick={() => signOut()}>Sair</button>;
};

describe('sair da conta', () => {
  beforeEach(() => {
    signOutMock.mockReset();
    Object.defineProperty(window, 'location', { value: { href: '/psychologist-dashboard' }, writable: true });
  });

  it('se o servidor falhar, apaga a sessão local e volta para o login', async () => {
    signOutMock.mockResolvedValueOnce({ error: { status: 500, message: 'falhou' } }).mockResolvedValueOnce({ error: null });
    render(
      <AuthProvider>
        <LogoutButton />
      </AuthProvider>,
    );
    fireEvent.click(screen.getByText('Sair'));
    await waitFor(() => expect(window.location.href).toBe('/'));
    expect(signOutMock).toHaveBeenNthCalledWith(1, { scope: 'global' });
    expect(signOutMock).toHaveBeenNthCalledWith(2, { scope: 'local' });
  });

  it('quando dá certo, sai só uma vez', async () => {
    signOutMock.mockResolvedValue({ error: null });
    render(
      <AuthProvider>
        <LogoutButton />
      </AuthProvider>,
    );
    fireEvent.click(screen.getByText('Sair'));
    await waitFor(() => expect(window.location.href).toBe('/'));
    expect(signOutMock).toHaveBeenCalledTimes(1);
  });
});

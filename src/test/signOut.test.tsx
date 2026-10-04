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

describe('sair da conta sem resposta do servidor', () => {
  beforeEach(() => {
    signOutMock.mockReset();
    Object.defineProperty(window, 'location', { value: { href: '/profile' }, writable: true });
  });

  it('mostra "Saindo da conta..." na hora e sai mesmo se o servidor não responder', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    signOutMock.mockReturnValue(new Promise(() => {}));
    render(
      <AuthProvider>
        <LogoutButton />
      </AuthProvider>,
    );
    fireEvent.click(screen.getByText('Sair'));
    expect(await screen.findByText('Saindo da conta...')).toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(4000);
    await waitFor(() => expect(window.location.href).toBe('/'));
    vi.useRealTimers();
  });
});

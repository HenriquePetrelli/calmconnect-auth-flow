import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const signInWithPassword = vi.fn();
const invoke = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { signInWithPassword: (...a: unknown[]) => signInWithPassword(...a), signOut: vi.fn().mockResolvedValue({}) },
    functions: { invoke: (...a: unknown[]) => invoke(...a) },
  },
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

import DeleteAccountCard from '@/components/DeleteAccountCard';

const fill = (password: string, word: string) => {
  fireEvent.click(screen.getByRole('button', { name: /excluir minha conta/i }));
  fireEvent.change(screen.getByLabelText('Sua senha'), { target: { value: password } });
  fireEvent.change(screen.getByLabelText(/digite excluir/i), { target: { value: word } });
};

beforeEach(() => {
  signInWithPassword.mockReset();
  invoke.mockReset();
});

describe('DeleteAccountCard', () => {
  it('só libera o botão com a palavra de confirmação', () => {
    render(<DeleteAccountCard email="p@x.com" />);
    fill('senha', 'apagar');
    expect(screen.getByRole('button', { name: /^excluir conta$/i })).toBeDisabled();
  });

  it('senha errada não chega a chamar a exclusão', async () => {
    signInWithPassword.mockResolvedValue({ error: { message: 'Invalid' } });
    render(<DeleteAccountCard email="p@x.com" />);
    fill('errada', 'excluir');
    fireEvent.click(screen.getByRole('button', { name: /^excluir conta$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Senha incorreta');
    expect(invoke).not.toHaveBeenCalled();
  });

  it('com senha e confirmação, chama delete-own-account', async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    invoke.mockResolvedValue({ data: { error: 'Você tem um atendimento de emergência em andamento.' }, error: null });
    render(<DeleteAccountCard email="p@x.com" />);
    fill('certa', 'excluir');
    fireEvent.click(screen.getByRole('button', { name: /^excluir conta$/i }));

    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith('delete-own-account', { body: { confirmation: 'EXCLUIR' } })
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('atendimento de emergência');
  });
});

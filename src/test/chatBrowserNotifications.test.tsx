import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { useMensagens } from '@/hooks/useMensagens';
import { notifyNewMessage } from '@/lib/browserNotifications';

Element.prototype.scrollIntoView = vi.fn();

const MEU_ID = 'me-1';
const OUTRO_ID = 'psi-1';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: MEU_ID } }),
}));

vi.mock('@/hooks/useConversas', () => ({
  useConversas: () => ({
    conversas: [
      {
        id: 'conv-1',
        status: 'ativa',
        outro_usuario: { full_name: 'Psicóloga Exemplo', user_type: 'psychologist' },
      },
    ],
  }),
}));

vi.mock('@/hooks/useMensagens', () => ({
  useMensagens: vi.fn(),
}));

vi.mock('@/lib/browserNotifications', () => ({
  ensureNotificationPermission: vi.fn().mockResolvedValue('granted'),
  isTabInBackground: () => true,
  notifyNewMessage: vi.fn(),
}));

const baseHookReturn = {
  loading: false,
  enviando: false,
  enviarMensagem: vi.fn(),
  uploadImagem: vi.fn(),
};

const msg = (id: string, autor_id: string, conteudo: string) => ({
  id,
  conversa_id: 'conv-1',
  autor_id,
  conteudo,
  tipo: 'texto' as const,
  lida_em: null,
  created_at: '2026-08-31T10:00:00Z',
  updated_at: '2026-08-31T10:00:00Z',
});

describe('ChatInterface browser notifications', () => {
  beforeEach(() => {
    vi.mocked(notifyNewMessage).mockClear();
  });

  it('does not notify for the initially loaded history', () => {
    vi.mocked(useMensagens).mockReturnValue({
      ...baseHookReturn,
      mensagens: [msg('m1', OUTRO_ID, 'Olá, tudo bem?')],
    });

    render(<ChatInterface conversaId="conv-1" onVoltar={() => {}} />);

    expect(notifyNewMessage).not.toHaveBeenCalled();
  });

  it('notifies when a new inbound message arrives while the tab is in background', () => {
    vi.mocked(useMensagens).mockReturnValue({
      ...baseHookReturn,
      mensagens: [msg('m1', OUTRO_ID, 'Olá, tudo bem?')],
    });
    const { rerender } = render(<ChatInterface conversaId="conv-1" onVoltar={() => {}} />);

    vi.mocked(useMensagens).mockReturnValue({
      ...baseHookReturn,
      mensagens: [msg('m1', OUTRO_ID, 'Olá, tudo bem?'), msg('m2', OUTRO_ID, 'Chegou uma nova mensagem')],
    });
    rerender(<ChatInterface conversaId="conv-1" onVoltar={() => {}} />);

    expect(notifyNewMessage).toHaveBeenCalledTimes(1);
    expect(notifyNewMessage).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Psicóloga Exemplo', body: 'Chegou uma nova mensagem' })
    );
  });

  it('does not notify for messages the current user sent themselves', () => {
    vi.mocked(useMensagens).mockReturnValue({
      ...baseHookReturn,
      mensagens: [msg('m1', OUTRO_ID, 'Olá, tudo bem?')],
    });
    const { rerender } = render(<ChatInterface conversaId="conv-1" onVoltar={() => {}} />);

    vi.mocked(useMensagens).mockReturnValue({
      ...baseHookReturn,
      mensagens: [msg('m1', OUTRO_ID, 'Olá, tudo bem?'), msg('m2', MEU_ID, 'Minha resposta')],
    });
    rerender(<ChatInterface conversaId="conv-1" onVoltar={() => {}} />);

    expect(notifyNewMessage).not.toHaveBeenCalled();
  });
});

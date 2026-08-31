import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatInterface } from '@/components/chat/ChatInterface';

// jsdom doesn't implement scrollIntoView; ChatInterface calls it on mount.
Element.prototype.scrollIntoView = vi.fn();

const MEU_ID = 'me-1';

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
  useMensagens: () => ({
    mensagens: [
      {
        id: 'm1',
        conversa_id: 'conv-1',
        autor_id: MEU_ID,
        conteudo: 'Mensagem não lida ainda',
        tipo: 'texto',
        lida_em: null,
        created_at: '2026-08-31T10:00:00Z',
        updated_at: '2026-08-31T10:00:00Z',
      },
      {
        id: 'm2',
        conversa_id: 'conv-1',
        autor_id: MEU_ID,
        conteudo: 'Mensagem já lida',
        tipo: 'texto',
        lida_em: '2026-08-31T10:05:00Z',
        created_at: '2026-08-31T10:01:00Z',
        updated_at: '2026-08-31T10:01:00Z',
      },
    ],
    loading: false,
    enviando: false,
    enviarMensagem: vi.fn(),
    uploadImagem: vi.fn(),
  }),
}));

describe('ChatInterface read receipts', () => {
  it('shows a single check for unread own messages and a double check once read', () => {
    render(<ChatInterface conversaId="conv-1" onVoltar={() => {}} />);

    expect(screen.getByText('Mensagem não lida ainda')).toBeTruthy();
    expect(screen.getByText('Mensagem já lida')).toBeTruthy();
    expect(screen.getByLabelText('Enviada')).toBeTruthy();
    expect(screen.getByLabelText('Lida')).toBeTruthy();
  });
});

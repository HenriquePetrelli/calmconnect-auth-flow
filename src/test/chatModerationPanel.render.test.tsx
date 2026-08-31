import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatModerationPanel } from '@/components/admin/ChatModerationPanel';

vi.mock('@/hooks/useChatModeration', () => ({
  useChatModeration: () => ({
    metrics: {
      total_conversas: 12,
      ativas: 7,
      somente_leitura: 3,
      expiradas: 2,
      conversas_novas: 4,
      total_mensagens: 88,
      mensagens_texto: 80,
      mensagens_imagem: 8,
      avg_mensagens_por_conversa_ativa: 6.3,
    },
    conversas: [
      {
        conversa_id: 'c1',
        status: 'ativa',
        created_at: '2026-08-01T10:00:00Z',
        updated_at: '2026-08-30T10:00:00Z',
        paciente_nome: 'Paciente Um',
        psicologo_nome: 'Psicóloga Dois',
        mensagens_count: 15,
        last_message_at: '2026-08-30T10:00:00Z',
        last_message_tipo: 'texto',
      },
    ],
    loading: false,
    archivingId: null,
    arquivarConversa: vi.fn(),
    reload: vi.fn(),
  }),
}));

describe('ChatModerationPanel', () => {
  it('renders usage metrics and the conversation overview without exposing message content', () => {
    render(<ChatModerationPanel />);
    expect(screen.getByText('Conversas totais')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText('Paciente Um')).toBeTruthy();
    expect(screen.getByText('Psicóloga Dois')).toBeTruthy();
    expect(screen.getByText('Ativa')).toBeTruthy();
    // Never renders raw message text/content — only counts and metadata.
    expect(screen.queryByText(/conteudo|imagem_url/i)).toBeNull();
  });
});

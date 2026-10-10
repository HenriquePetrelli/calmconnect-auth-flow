import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act, render, screen } from '@testing-library/react';
import { fakeDb, fakeSupabase } from './fakeSupabase';

const { toastMock, conversasMock } = vi.hoisted(() => ({
  toastMock: vi.fn(),
  conversasMock: { conversas: [] as unknown[], carregado: true },
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: fakeSupabase }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }), toast: toastMock }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'me-1' } }) }));
vi.mock('@/hooks/useConversas', () => ({ useConversas: () => conversasMock }));

import { useMensagens, MENSAGENS_POR_PAGINA } from '@/hooks/useMensagens';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { prepararFoto, FotoInvalidaError } from '@/lib/chatPhoto';

Element.prototype.scrollIntoView = vi.fn();

const CONV = 'conv-1';
const iso = (minutos: number) => new Date(Date.UTC(2026, 9, 1, 0, 0) + minutos * 60_000).toISOString();
const msg = (n: number, autor = 'psi-1') => ({
  id: `m-${String(n).padStart(4, '0')}`,
  conversa_id: CONV,
  autor_id: autor,
  conteudo: `mensagem ${n}`,
  tipo: 'texto',
  imagem_url: null,
  lida_em: null,
  created_at: iso(n),
  updated_at: iso(n),
});

beforeEach(() => {
  toastMock.mockReset();
  localStorage.clear();
  fakeDb.tables = {};
  fakeDb.writes = [];
  fakeDb.failNextWith = null;
  fakeDb.offlineError = null;
  fakeDb.currentUserId = 'me-1';
  fakeDb.rpcHandlers = {};
  conversasMock.conversas = [
    { id: CONV, status: 'ativa', outro_usuario: { full_name: 'Psicóloga', user_type: 'psychologist' } },
  ];
  conversasMock.carregado = true;
});

describe('Chat — histórico', () => {
  it('abre com as mensagens mais recentes e carrega as anteriores sob pedido', async () => {
    const total = MENSAGENS_POR_PAGINA + 50;
    fakeDb.seed('mensagens', Array.from({ length: total }, (_, i) => msg(i + 1)));

    const { result } = renderHook(() => useMensagens(CONV));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.mensagens).toHaveLength(MENSAGENS_POR_PAGINA);
    // A última da tela é a mais nova da conversa (antes, passando de 1.000, sumia).
    expect(result.current.mensagens.at(-1)?.conteudo).toBe(`mensagem ${total}`);
    expect(result.current.temAnteriores).toBe(true);

    await act(async () => {
      await result.current.carregarAnteriores();
    });
    expect(result.current.mensagens).toHaveLength(total);
    expect(result.current.mensagens[0].conteudo).toBe('mensagem 1');
    expect(result.current.temAnteriores).toBe(false);
  });

  it('ao voltar a internet, busca só o que mudou (nova ou lida)', async () => {
    fakeDb.seed('mensagens', [msg(1, 'me-1'), msg(2)]);
    const { result } = renderHook(() => useMensagens(CONV));
    await waitFor(() => expect(result.current.mensagens).toHaveLength(2));

    fakeDb.rows('mensagens')[0].lida_em = iso(10);
    fakeDb.rows('mensagens')[0].updated_at = iso(10);
    fakeDb.rows('mensagens').push(msg(11));

    await act(async () => {
      window.dispatchEvent(new Event('online'));
      await new Promise((r) => setTimeout(r, 0));
    });
    await waitFor(() => expect(result.current.mensagens).toHaveLength(3));
    expect(result.current.mensagens[0].lida_em).toBe(iso(10));
  });
});

describe('Chat — aparelho compartilhado', () => {
  it('não envia mensagens não enviadas de outra conta', async () => {
    localStorage.setItem(
      `chat:pendentes:${CONV}`,
      JSON.stringify([{ ...msg(1, 'outra-conta'), id: 'p-1', conteudo: 'segredo de outra pessoa' }]),
    );
    const { result } = renderHook(() => useMensagens(CONV));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.mensagens.find((m) => m.id === 'p-1')).toBeUndefined();
    expect(fakeDb.rows('mensagens')).toHaveLength(0);
  });
});

describe('Chat — tela', () => {
  it('guarda o rascunho da conversa', async () => {
    localStorage.setItem(`chat:rascunho:${CONV}`, 'texto que eu estava escrevendo');
    render(<ChatInterface conversaId={CONV} onVoltar={() => {}} />);
    expect(await screen.findByDisplayValue('texto que eu estava escrevendo')).toBeTruthy();
  });

  it('link de conversa que não existe mais mostra aviso e caminho de volta', async () => {
    conversasMock.conversas = [];
    const voltar = vi.fn();
    render(<ChatInterface conversaId={CONV} onVoltar={voltar} />);
    expect(await screen.findByText('Conversa não encontrada')).toBeTruthy();
    screen.getByRole('button', { name: /ver minhas conversas/i }).click();
    expect(voltar).toHaveBeenCalled();
  });
});

describe('Chat — foto', () => {
  it('recusa o que não é imagem', async () => {
    const pdf = new File(['x'], 'a.pdf', { type: 'application/pdf' });
    await expect(prepararFoto(pdf)).rejects.toBeInstanceOf(FotoInvalidaError);
  });

  it('foto pequena vai como está', async () => {
    const foto = new File([new Uint8Array(1000)], 'a.jpg', { type: 'image/jpeg' });
    await expect(prepararFoto(foto)).resolves.toBe(foto);
  });

  it('acima de 10 MB, sem conseguir reduzir, explica o limite', async () => {
    const grande = new File([new Uint8Array(11 * 1024 * 1024)], 'a.jpg', { type: 'image/jpeg' });
    await expect(prepararFoto(grande)).rejects.toThrow('10 MB');
  });
});

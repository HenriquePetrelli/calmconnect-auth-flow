import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

/**
 * Banco de mentira para os avisos: guarda as linhas, responde à lista e à
 * contagem de não lidas e deixa o teste disparar os eventos do tempo real
 * (como o Supabase manda: UPDATE/DELETE só com o id em "old").
 */
type Row = { id: string; patient_id: string; title: string; message: string; status: 'read' | 'unread'; created_at: string; link?: string | null };
const db = vi.hoisted(() => ({ rows: [] as Row[], handlers: [] as Array<{ event: string; cb: (p: unknown) => void }> }));

vi.mock('@/integrations/supabase/client', () => {
  class Query {
    private filters: Array<(r: Row) => boolean> = [];
    private op: 'select' | 'update' | 'delete' = 'select';
    private head = false;
    private patch: Partial<Row> = {};
    private max = Infinity;
    select(_cols?: string, opts?: { count?: string; head?: boolean }) {
      this.head = Boolean(opts?.head);
      return this;
    }
    update(patch: Partial<Row>) {
      this.op = 'update';
      this.patch = patch;
      return this;
    }
    delete() {
      this.op = 'delete';
      return this;
    }
    eq(col: keyof Row, val: unknown) {
      this.filters.push((r) => r[col] === val);
      return this;
    }
    lt(col: keyof Row, val: string) {
      this.filters.push((r) => String(r[col]) < val);
      return this;
    }
    order() {
      return this;
    }
    limit(n: number) {
      this.max = n;
      return this;
    }
    then(resolve: (v: unknown) => void) {
      const match = (r: Row) => this.filters.every((f) => f(r));
      if (this.op === 'update') {
        db.rows = db.rows.map((r) => (match(r) ? { ...r, ...this.patch } : r));
        return resolve({ error: null });
      }
      if (this.op === 'delete') {
        db.rows = db.rows.filter((r) => !match(r));
        return resolve({ error: null });
      }
      const rows = db.rows.filter(match).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      if (this.head) return resolve({ count: rows.length, error: null });
      return resolve({ data: rows.slice(0, this.max), error: null });
    }
  }
  const channel = () => {
    const api = {
      on: (_type: string, opts: { event: string }, cb: (p: unknown) => void) => {
        db.handlers.push({ event: opts.event, cb });
        return api;
      },
      subscribe: (cb?: (s: string) => void) => {
        cb?.('SUBSCRIBED');
        return api;
      },
    };
    return api;
  };
  return {
    supabase: {
      from: () => new Query(),
      channel,
      removeChannel: vi.fn(),
    },
  };
});

vi.mock('@/contexts/AuthContext', () => {
  const value = { user: { id: 'u1' }, userType: 'patient' };
  return { useAuth: () => value };
});

vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

import { useNotifications, __resetNotificationsStore, NOTIFICATIONS_PAGE_SIZE } from '@/hooks/useNotifications';
import Notifications from '@/pages/Notifications';

const row = (i: number, status: Row['status'] = 'unread', extra: Partial<Row> = {}): Row => ({
  id: `n${i}`,
  patient_id: 'u1',
  title: `Aviso ${i}`,
  message: `Texto ${i}`,
  status,
  created_at: new Date(Date.UTC(2026, 9, 1, 12, 0, i)).toISOString(),
  ...extra,
});

const emit = (event: string, payload: unknown) => act(() => db.handlers.filter((h) => h.event === event).forEach((h) => h.cb(payload)));

/** O contador do menu, como no layout. */
const Badge = () => {
  const { unreadCount } = useNotifications();
  return <span data-testid="badge">{unreadCount}</span>;
};

const renderApp = () =>
  render(
    <MemoryRouter initialEntries={['/notifications']}>
      <Badge />
      <Routes>
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/chat" element={<div data-testid="chat-page" />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  __resetNotificationsStore();
  db.rows = [];
  db.handlers = [];
});

describe('avisos do sino', () => {
  it('marcar como lida na tela baixa o contador do menu (uma fonte só)', async () => {
    db.rows = [row(1), row(2), row(3, 'read')];
    renderApp();
    await waitFor(() => expect(screen.getByTestId('badge')).toHaveTextContent('2'));
    fireEvent.click(screen.getByRole('button', { name: 'Não lida: Aviso 2' }));
    await waitFor(() => expect(screen.getByTestId('badge')).toHaveTextContent('1'));
  });

  it('lido em outro aparelho: o tempo real só traz o id e o contador vem do servidor', async () => {
    db.rows = [row(1), row(2)];
    renderApp();
    await waitFor(() => expect(screen.getByTestId('badge')).toHaveTextContent('2'));
    db.rows = db.rows.map((r) => (r.id === 'n1' ? { ...r, status: 'read' } : r));
    emit('UPDATE', { new: db.rows.find((r) => r.id === 'n1'), old: { id: 'n1' } });
    await waitFor(() => expect(screen.getByTestId('badge')).toHaveTextContent('1'));
    db.rows = db.rows.filter((r) => r.id !== 'n2');
    emit('DELETE', { old: { id: 'n2' } });
    await waitFor(() => expect(screen.getByTestId('badge')).toHaveTextContent('0'));
    expect(screen.queryByText('Aviso 2')).not.toBeInTheDocument();
  });

  it('aviso novo aparece no topo e soma no contador', async () => {
    db.rows = [row(1, 'read')];
    renderApp();
    await screen.findByText('Aviso 1');
    const fresh = row(9);
    db.rows.push(fresh);
    emit('INSERT', { new: fresh });
    await waitFor(() => expect(screen.getByTestId('badge')).toHaveTextContent('1'));
    expect(screen.getAllByTestId('notification-item')[0]).toHaveTextContent('Aviso 9');
  });

  it('lista em páginas, com o contador de todas as não lidas', async () => {
    db.rows = Array.from({ length: NOTIFICATIONS_PAGE_SIZE + 5 }, (_, i) => row(i + 1));
    renderApp();
    await waitFor(() => expect(screen.getAllByTestId('notification-item')).toHaveLength(NOTIFICATIONS_PAGE_SIZE));
    expect(screen.getByTestId('badge')).toHaveTextContent(String(NOTIFICATIONS_PAGE_SIZE + 5));
    fireEvent.click(screen.getByRole('button', { name: 'Ver mais antigas' }));
    await waitFor(() => expect(screen.getAllByTestId('notification-item')).toHaveLength(NOTIFICATIONS_PAGE_SIZE + 5));
    expect(screen.queryByRole('button', { name: 'Ver mais antigas' })).not.toBeInTheDocument();
  });

  it('tocar no aviso abre a tela dele', async () => {
    db.rows = [row(1, 'unread', { title: 'Nova mensagem', link: '/chat?c=abc' })];
    renderApp();
    fireEvent.click(await screen.findByRole('button', { name: 'Não lida: Nova mensagem' }));
    expect(await screen.findByTestId('chat-page')).toBeInTheDocument();
  });

  it('excluir um aviso tem botão visível e "Excluir todas" pede confirmação', async () => {
    db.rows = [row(1), row(2)];
    renderApp();
    const items = await screen.findAllByTestId('notification-item');
    fireEvent.click(within(items[0]).getByRole('button', { name: 'Excluir notificação' }));
    await waitFor(() => expect(screen.getAllByTestId('notification-item')).toHaveLength(1));

    fireEvent.click(screen.getByRole('button', { name: 'Excluir todas' }));
    expect(await screen.findByText('Excluir todas as notificações?')).toBeInTheDocument();
    expect(db.rows).toHaveLength(1);
    const dialog = screen.getByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Excluir todas' }));
    await waitFor(() => expect(db.rows).toHaveLength(0));
    expect(await screen.findByText('Nenhuma notificação')).toBeInTheDocument();
  });
});

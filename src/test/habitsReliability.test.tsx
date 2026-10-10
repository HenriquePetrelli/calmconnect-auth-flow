import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { fakeDb, fakeSupabase } from './fakeSupabase';

vi.mock('@/integrations/supabase/client', () => ({ supabase: fakeSupabase }));
const user = { id: 'patient-1' };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user }) }));
const toastMock = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), warning: vi.fn() }));
vi.mock('sonner', () => ({ toast: toastMock }));
vi.mock('@/components/PageHeader', () => ({ default: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock('@/components/PatientBottomNav', () => ({ default: () => <div /> }));

import Habits from '@/pages/Habits';
import HabitSetup from '@/pages/HabitSetup';
import HabitDetail from '@/pages/HabitDetail';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/habitos" element={<Habits />} />
        <Route path="/habitos/novo/:kind" element={<HabitSetup />} />
        <Route path="/habitos/:habitId" element={<HabitDetail />} />
      </Routes>
    </MemoryRouter>,
  );

const water = {
  id: 'w1',
  user_id: 'patient-1',
  kind: 'water',
  title: null,
  daily_goal: 2000,
  quit_started_at: null,
  best_streak_seconds: 0,
  settings: { cup_sizes: [200, 300, 500] },
  reminders_enabled: false,
  reminder_start: '09:00:00',
  reminder_end: '21:00:00',
  reminder_interval_minutes: null,
  timezone: 'America/Sao_Paulo',
  archived_at: null,
  created_at: '2026-09-01T00:00:00Z',
};

const offline = { message: 'TypeError: Failed to fetch', code: '' };
const waterEvents = () => fakeDb.rows('habit_events').filter((e) => e.habit_id === 'w1');

beforeEach(() => {
  fakeDb.tables = {};
  fakeDb.writes = [];
  fakeDb.rpcHandlers = {};
  fakeDb.currentUserId = 'patient-1';
  fakeDb.failNextWith = null;
  localStorage.clear();
  toastMock.mockClear();
  toastMock.success.mockClear();
  toastMock.error.mockClear();
});

describe('hábitos: registro confiável', () => {
  it('sem internet, o copo fica salvo no aparelho e sai quando a conexão volta (uma vez só)', async () => {
    fakeDb.seed('user_habits', [water]);
    renderAt('/habitos');
    await screen.findByText('Beber água');
    fakeDb.failNextWith = offline;
    fireEvent.click(screen.getByRole('button', { name: 'Registrar 300 ml' }));
    await waitFor(() => expect(toastMock).toHaveBeenCalledWith('Sem internet agora', expect.anything()));
    expect(toastMock.error).not.toHaveBeenCalled();
    expect(waterEvents()).toHaveLength(0);
    expect(localStorage.getItem('habitos:pendentes:patient-1')).toContain('"amount":300');

    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    await waitFor(() => expect(waterEvents()).toHaveLength(1));
    expect(localStorage.getItem('habitos:pendentes:patient-1')).toBeNull();
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    await new Promise((r) => setTimeout(r, 50));
    expect(waterEvents()).toHaveLength(1);
  });

  it('registro guardado sobrevive a recarregar a página', async () => {
    fakeDb.seed('user_habits', [water]);
    localStorage.setItem(
      'habitos:pendentes:patient-1',
      JSON.stringify([
        { id: '11111111-1111-4111-8111-111111111111', habit_id: 'w1', kind: 'intake', amount: 500, local_date: new Date().toISOString().slice(0, 10), occurred_at: new Date().toISOString(), details: {} },
      ]),
    );
    renderAt('/habitos');
    await waitFor(() => expect(waterEvents()).toHaveLength(1));
    expect(waterEvents()[0].id).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('resposta perdida e nova tentativa não duplicam o registro', async () => {
    fakeDb.seed('user_habits', [water]);
    const id = '22222222-2222-4222-8222-222222222222';
    // Chegou no banco, mas o aparelho não soube (ficou guardado).
    fakeDb.seed('habit_events', [{ id, habit_id: 'w1', user_id: 'patient-1', kind: 'intake', amount: 200, local_date: '2026-10-10', occurred_at: new Date().toISOString(), details: {} }]);
    localStorage.setItem('habitos:pendentes:patient-1', JSON.stringify([{ id, habit_id: 'w1', kind: 'intake', amount: 200, local_date: '2026-10-10', occurred_at: new Date().toISOString(), details: {} }]));
    renderAt('/habitos');
    await waitFor(() => expect(localStorage.getItem('habitos:pendentes:patient-1')).toBeNull());
    expect(waterEvents()).toHaveLength(1);
  });

  it('"Desfazer" sem internet apaga o registro guardado (não é enviado depois)', async () => {
    fakeDb.seed('user_habits', [water]);
    renderAt('/habitos');
    await screen.findByText('Beber água');
    fakeDb.failNextWith = offline;
    fireEvent.click(screen.getByRole('button', { name: 'Registrar 300 ml' }));
    await waitFor(() => expect(toastMock.success).toHaveBeenCalled());
    const undo = toastMock.success.mock.calls.at(-1)?.[1]?.action;
    act(() => undo.onClick());
    await waitFor(() => expect(localStorage.getItem('habitos:pendentes:patient-1')).toBeNull());
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    await new Promise((r) => setTimeout(r, 50));
    expect(waterEvents()).toHaveLength(0);
  });
});

describe('hábitos: regras das telas', () => {
  it('pelo endereço não abre o formulário de um hábito que já está na lista', async () => {
    fakeDb.seed('user_habits', [water]);
    renderAt('/habitos/novo/water');
    expect(await screen.findByText('Esse hábito já está na sua lista.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Começar' })).not.toBeInTheDocument();
  });

  it('apaga o hábito com todo o histórico, com confirmação', async () => {
    fakeDb.seed('user_habits', [water]);
    fakeDb.seed('habit_events', [{ id: 'e1', habit_id: 'w1', user_id: 'patient-1', kind: 'intake', amount: 200, local_date: '2026-10-10', occurred_at: new Date().toISOString(), details: {} }]);
    renderAt('/habitos/w1');
    fireEvent.click(await screen.findByRole('button', { name: /Tirar da minha lista/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Apagar com o histórico' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/apagados de vez/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Apagar de vez' }));
    await waitFor(() => expect(fakeDb.rows('user_habits')).toHaveLength(0));
    expect(toastMock.success).toHaveBeenCalledWith('Hábito e histórico apagados');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { fakeDb, fakeSupabase } from './fakeSupabase';
import { localDateString } from '@/lib/habits';

vi.mock('@/integrations/supabase/client', () => ({ supabase: fakeSupabase }));
const user = { id: 'patient-1' };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user }) }));
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast: toastMock }));
vi.mock('@/components/PageHeader', () => ({ default: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock('@/components/PatientBottomNav', () => ({ default: () => <div /> }));
// A seção semanal tem os próprios testes e dependências.
vi.mock('@/components/habits/WeeklyHabitsSection', () => ({ default: () => <div>Hábitos da semana</div> }));

import Habits from '@/pages/Habits';
import HabitSetup from '@/pages/HabitSetup';
import HabitDetail from '@/pages/HabitDetail';
import HomeHabitsCard from '@/components/habits/HomeHabitsCard';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/home" element={<HomeHabitsCard />} />
        <Route path="/habitos" element={<Habits />} />
        <Route path="/habitos/novo" element={<HabitSetup />} />
        <Route path="/habitos/novo/:kind" element={<HabitSetup />} />
        <Route path="/habitos/:habitId" element={<HabitDetail />} />
        <Route path="/habitos/:habitId/editar" element={<HabitSetup />} />
      </Routes>
    </MemoryRouter>,
  );

const baseHabit = {
  user_id: 'patient-1',
  title: null,
  daily_goal: null,
  quit_started_at: null,
  best_streak_seconds: 0,
  settings: {},
  reminders_enabled: false,
  reminder_start: '09:00:00',
  reminder_end: '21:00:00',
  reminder_interval_minutes: null,
  timezone: 'America/Sao_Paulo',
  archived_at: null,
  created_at: '2026-09-01T00:00:00Z',
};

const water = { ...baseHabit, id: 'w1', kind: 'water', daily_goal: 2000, settings: { cup_sizes: [200, 300, 500] } };
const smoking = {
  ...baseHabit,
  id: 's1',
  kind: 'quit_smoking',
  quit_started_at: new Date(Date.now() - 10 * 86_400_000 - 60_000).toISOString(),
  settings: { cigarettes_per_day: 20, cigarettes_per_pack: 20, pack_price: 12, reason: 'Ter fôlego para correr' },
};

beforeEach(() => {
  fakeDb.tables = {};
  fakeDb.writes = [];
  fakeDb.rpcHandlers = {};
  fakeDb.currentUserId = 'patient-1';
  toastMock.success.mockClear();
  toastMock.error.mockClear();
});

describe('Meus hábitos', () => {
  it('convida a começar quando não há hábitos', async () => {
    renderAt('/habitos');
    expect(await screen.findByText('Comece por um hábito')).toBeInTheDocument();
  });

  it('mostra o dia da água e registra um copo com um toque', async () => {
    fakeDb.seed('user_habits', [water]);
    fakeDb.seed('habit_events', [
      { id: 'e1', habit_id: 'w1', user_id: 'patient-1', kind: 'intake', amount: 500, local_date: localDateString(), occurred_at: new Date().toISOString(), details: {} },
    ]);
    renderAt('/habitos');
    expect(await screen.findByText('Beber água')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Beber água: 25% da meta' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Registrar 300 ml' }));
    await waitFor(() => expect(fakeDb.tables.habit_events).toHaveLength(2));
    expect(fakeDb.tables.habit_events[1]).toMatchObject({ habit_id: 'w1', kind: 'intake', amount: 300, local_date: localDateString() });
    expect(await screen.findByRole('progressbar', { name: 'Beber água: 40% da meta' })).toBeInTheDocument();
    expect(toastMock.success).toHaveBeenCalledWith('+300 ml registrado', expect.objectContaining({ action: expect.any(Object) }));
  });

  it('mostra os dias sem fumar e o dinheiro economizado', async () => {
    fakeDb.seed('user_habits', [smoking]);
    renderAt('/habitos');
    expect(await screen.findByText('Parar de fumar')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s120,0\d/)).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
  });
});

describe('adicionar hábito', () => {
  it('cria o hábito de água com a meta sugerida pelo peso e lembretes', async () => {
    renderAt('/habitos/novo/water');
    fireEvent.change(await screen.findByLabelText('Seu peso (opcional)'), { target: { value: '70' } });
    fireEvent.click(screen.getByText(/Usar a meta sugerida: 2,45 L/));
    fireEvent.click(screen.getByRole('button', { name: 'Começar' }));

    await waitFor(() => expect(fakeDb.tables.user_habits).toHaveLength(1));
    expect(fakeDb.tables.user_habits[0]).toMatchObject({
      kind: 'water',
      daily_goal: 2450,
      reminders_enabled: true,
      reminder_interval_minutes: 120,
      settings: { cup_sizes: [200, 300, 500], weight_kg: 70 },
    });
  });

  it('não aceita data de parada no futuro', async () => {
    renderAt('/habitos/novo/quit_alcohol');
    fireEvent.click(await screen.findByRole('button', { name: 'Já parei antes' }));
    const date = screen.getByLabelText('Data e hora em que parou');
    fireEvent.change(date, { target: { value: '2999-01-01T10:00' } });
    // O navegador já barra pelo "max" do campo; aqui testamos a checagem do app.
    fireEvent.submit(date.closest('form')!);
    expect(await screen.findByRole('alert')).toHaveTextContent('não pode estar no futuro');
    expect(fakeDb.tables.user_habits ?? []).toHaveLength(0);
  });

  it('não oferece de novo um hábito que já está na lista', async () => {
    fakeDb.seed('user_habits', [water]);
    renderAt('/habitos/novo');
    expect(await screen.findByText('Já está na sua lista')).toBeInTheDocument();
  });
});

describe('detalhe de quem está parando', () => {
  it('mostra o motivo, os marcos de saúde e registra a vontade', async () => {
    fakeDb.seed('user_habits', [smoking]);
    renderAt('/habitos/s1');
    expect(await screen.findByText('Ter fôlego para correr')).toBeInTheDocument();
    expect(screen.getByText(/O monóxido de carbono no sangue volta ao normal/)).toBeInTheDocument();
    expect(screen.getByText('1 semana')).toBeInTheDocument(); // conquista alcançada

    fireEvent.click(screen.getByRole('button', { name: /Senti vontade/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Estresse' }));
    fireEvent.click(screen.getByRole('button', { name: 'Registrar vontade' }));
    await waitFor(() => expect(fakeDb.tables.habit_events).toHaveLength(1));
    expect(fakeDb.tables.habit_events[0]).toMatchObject({ kind: 'craving', amount: 3, details: { triggers: ['Estresse'] } });
    expect(await screen.findByText('Fazer a respiração guiada')).toBeInTheDocument();
  });

  it('recomeça a contagem na recaída, pela função do banco', async () => {
    fakeDb.seed('user_habits', [smoking]);
    const relapse = vi.fn((_db: unknown, _params: Record<string, unknown>) => ({ data: new Date().toISOString(), error: null }));
    fakeDb.rpcHandlers.register_habit_relapse = relapse;
    renderAt('/habitos/s1');
    fireEvent.click(await screen.findByRole('button', { name: 'Tive uma recaída' }));
    fireEvent.change(screen.getByLabelText('O que aconteceu? (opcional)'), { target: { value: 'Festa' } });
    fireEvent.click(screen.getByRole('button', { name: 'Recomeçar a contagem' }));
    await waitFor(() => expect(relapse).toHaveBeenCalled());
    expect(relapse.mock.calls[0][1]).toMatchObject({ p_habit_id: 's1', p_note: 'Festa', p_local_date: localDateString() });
  });
});

describe('card da Home', () => {
  it('resume o dia e registra direto da Home', async () => {
    fakeDb.seed('user_habits', [water, smoking]);
    renderAt('/home');
    expect(await screen.findByText('10 dias sem fumar')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s120,0\d economizados/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar 200 ml em Beber água' }));
    await waitFor(() => expect(fakeDb.tables.habit_events).toHaveLength(1));
  });

  it('convida a adicionar quando está vazio', async () => {
    renderAt('/home');
    expect(await screen.findByRole('button', { name: /Adicionar hábito/ })).toBeInTheDocument();
  });
});

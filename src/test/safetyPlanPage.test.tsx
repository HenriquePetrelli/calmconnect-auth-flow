import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { fakeDb, fakeSupabase } from './fakeSupabase';

vi.mock('@/integrations/supabase/client', () => ({ supabase: fakeSupabase }));
const user = { id: 'patient-1' };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user }) }));
// Stable identity, like the real useToast (a fresh fn per render would refetch in a loop).
const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/components/PageHeader', () => ({ default: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock('@/components/PatientBottomNav', () => ({ default: () => <div /> }));

import SafetyPlans from '@/pages/SafetyPlans';
import SafetyPlanEditor from '@/pages/SafetyPlanEditor';
import SafetyPlanView from '@/pages/SafetyPlanView';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/safety-plan" element={<SafetyPlans />} />
        <Route path="/safety-plan/:planId" element={<SafetyPlanEditor />} />
        <Route path="/safety-plan/:planId/ver" element={<SafetyPlanView />} />
      </Routes>
    </MemoryRouter>
  );

const plan = (id: string, title: string) => ({
  id,
  patient_id: 'patient-1',
  title,
  warning_signs: [],
  coping_strategies: [],
  distractions: [],
  safe_environment: [],
  reasons_to_live: [],
  created_at: `2026-09-2${id}T00:00:00Z`,
  updated_at: `2026-09-2${id}T00:00:00Z`,
});

beforeEach(() => {
  fakeDb.tables = {};
  fakeDb.writes = [];
  fakeDb.rpcHandlers = {};
  fakeDb.currentUserId = 'patient-1';
  toast.mockClear();
});

describe('lista de planos de segurança', () => {
  it('mostra só o título de cada plano, com editar e excluir', async () => {
    fakeDb.seed('safety_plans', [plan('1', 'Plano da noite'), plan('2', 'Plano do trabalho')]);
    renderAt('/safety-plan');

    expect(await screen.findByText('Plano da noite')).toBeInTheDocument();
    expect(screen.getByText('Plano do trabalho')).toBeInTheDocument();
    expect(screen.getByLabelText('Editar Plano da noite')).toBeInTheDocument();
    expect(screen.getByLabelText('Excluir Plano da noite')).toBeInTheDocument();
    expect(screen.getByText('2 de 10 planos')).toBeInTheDocument();
  });

  it('só exclui depois de confirmar', async () => {
    fakeDb.seed('safety_plans', [plan('1', 'Plano da noite')]);
    renderAt('/safety-plan');

    fireEvent.click(await screen.findByLabelText('Excluir Plano da noite'));
    expect(screen.getByText('Excluir "Plano da noite"?')).toBeInTheDocument();
    expect(fakeDb.rows('safety_plans')).toHaveLength(1);

    fireEvent.click(screen.getByText('Cancelar'));
    expect(fakeDb.rows('safety_plans')).toHaveLength(1);

    fireEvent.click(screen.getByLabelText('Excluir Plano da noite'));
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(fakeDb.rows('safety_plans')).toHaveLength(0));
    expect(screen.queryByText('Plano da noite')).not.toBeInTheDocument();
  });

  it('com 10 planos, o botão de cadastrar fica desativado', async () => {
    fakeDb.seed('safety_plans', Array.from({ length: 10 }, (_, i) => plan(String(i), `Plano ${i}`)));
    renderAt('/safety-plan');

    await screen.findByText('Plano 0');
    expect(screen.getByText('Cadastrar novo plano de segurança').closest('button')).toBeDisabled();
    expect(screen.getByText(/limite de 10 planos/)).toBeInTheDocument();
  });

  it('o botão de cadastrar abre a tela de cadastro separada', async () => {
    renderAt('/safety-plan');
    fireEvent.click(await screen.findByText('Cadastrar novo plano de segurança'));
    expect(await screen.findByText('Novo plano de segurança')).toBeInTheDocument();
  });
});

describe('cadastro de plano de segurança', () => {
  it('sugere o título pelo número de planos já cadastrados', async () => {
    fakeDb.seed('safety_plans', [plan('1', 'Plano da noite'), plan('2', 'Plano do trabalho')]);
    renderAt('/safety-plan/novo');

    const titleInput = await screen.findByLabelText('Título do plano');
    expect(titleInput).toHaveAttribute('placeholder', 'Plano de segurança 03');
  });

  it('salva título, itens e contatos de uma vez, e adicionar contato não apaga o que foi marcado', async () => {
    const saveSpy = vi.fn((..._args: unknown[]) => ({ data: 'new-plan-id', error: null }));
    fakeDb.rpcHandlers.save_safety_plan = saveSpy;
    renderAt('/safety-plan/novo');

    fireEvent.click(await screen.findByText('Não consigo dormir'));

    fireEvent.click(screen.getByText('Pessoas a quem posso pedir ajuda'));
    fireEvent.change(await screen.findByLabelText('Nome'), { target: { value: 'Irmã' } });
    fireEvent.change(screen.getByLabelText('Telefone'), { target: { value: '(11) 99999-0000' } });
    fireEvent.click(screen.getByText('Adicionar contato'));
    expect(await screen.findByText('(11) 99999-0000')).toBeInTheDocument();

    // O item marcado antes continua lá.
    fireEvent.click(screen.getByText('Sinais de alerta'));
    expect(await screen.findByLabelText('Remover "Não consigo dormir"')).toBeInTheDocument();

    // Título em branco → usa o sugerido.
    fireEvent.click(screen.getByText('Salvar plano'));
    await waitFor(() => expect(saveSpy).toHaveBeenCalled());
    const params = saveSpy.mock.calls[0][1] as Record<string, unknown>;
    expect(params.p_plan_id).toBeNull();
    expect(params.p_title).toBe('Plano de segurança 01');
    expect(params.p_warning_signs).toEqual(['Não consigo dormir']);
    expect(params.p_contacts).toEqual([
      { name: 'Irmã', relationship: null, phone: '(11) 99999-0000', is_primary: true },
    ]);

    // Volta para a lista.
    expect(await screen.findByText('Planos de segurança')).toBeInTheDocument();
  });

  it('edita um plano existente com o título dele', async () => {
    fakeDb.seed('safety_plans', [{ ...plan('1', 'Plano da noite'), reasons_to_live: ['Minha filha'] }]);
    fakeDb.seed('emergency_contacts', [
      { plan_id: '1', name: 'Mãe', relationship: null, phone: '11988880000', is_primary: true, created_at: '2026-09-21' },
    ]);
    const saveSpy = vi.fn((..._args: unknown[]) => ({ data: '1', error: null }));
    fakeDb.rpcHandlers.save_safety_plan = saveSpy;
    renderAt('/safety-plan/1');

    const titleInput = await screen.findByLabelText('Título do plano');
    expect(titleInput).toHaveValue('Plano da noite');
    fireEvent.change(titleInput, { target: { value: 'Plano das noites difíceis' } });
    fireEvent.click(screen.getByText('Salvar plano'));

    await waitFor(() => expect(saveSpy).toHaveBeenCalled());
    const params = saveSpy.mock.calls[0][1] as Record<string, unknown>;
    expect(params.p_plan_id).toBe('1');
    expect(params.p_title).toBe('Plano das noites difíceis');
    expect(params.p_reasons_to_live).toEqual(['Minha filha']);
    expect(params.p_contacts).toEqual([{ name: 'Mãe', relationship: null, phone: '11988880000', is_primary: true }]);
  });
});

describe('leitura do plano', () => {
  it('tocar no plano da lista abre a leitura, com razões, seções e botão de ligar', async () => {
    fakeDb.seed('safety_plans', [
      { ...plan('1', 'Plano da noite'), warning_signs: ['Não consigo dormir'], coping_strategies: ['Tomar um banho'], reasons_to_live: ['Minha filha'] },
    ]);
    fakeDb.seed('emergency_contacts', [
      { patient_id: 'patient-1', plan_id: '1', name: 'Irmã', relationship: 'Irmã', phone: '(11) 99999-0000', is_primary: true },
    ]);
    renderAt('/safety-plan');

    fireEvent.click(await screen.findByLabelText('Ver Plano da noite'));
    expect(await screen.findByText('Minhas razões para seguir')).toBeInTheDocument();
    expect(screen.getByText('Minha filha')).toBeInTheDocument();
    expect(screen.getByText('Não consigo dormir')).toBeInTheDocument();
    expect(screen.getByText('Tomar um banho')).toBeInTheDocument();
    expect(screen.getByLabelText('Ligar para Irmã')).toHaveAttribute('href', 'tel:11999990000');
    // Só as partes preenchidas aparecem; o resto vira um convite para completar.
    expect(screen.queryByText('Como deixar o ambiente mais seguro')).not.toBeInTheDocument();
    expect(screen.getByText(/4 de 6 partes preenchidas/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Editar plano/ }));
    expect(await screen.findByText('Editar plano de segurança')).toBeInTheDocument();
  });

  it('avisa quando o plano não existe mais', async () => {
    renderAt('/safety-plan/inexistente/ver');
    expect(await screen.findByText(/Este plano não existe mais/)).toBeInTheDocument();
  });
});

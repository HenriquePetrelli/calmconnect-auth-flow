import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { fakeDb, fakeSupabase } from './fakeSupabase';

vi.mock('@/integrations/supabase/client', () => ({ supabase: fakeSupabase }));
const user = { id: 'patient-1' };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user }) }));
const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/components/PageHeader', () => ({ default: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock('@/components/PatientBottomNav', () => ({ default: () => <div /> }));

import SafetyPlans from '@/pages/SafetyPlans';
import PostCrisisPlanDialog from '@/components/calls/PostCrisisPlanDialog';

const plan = (id: string, title: string, extra: Record<string, unknown> = {}) => ({
  id,
  patient_id: 'patient-1',
  title,
  warning_signs: [],
  coping_strategies: [],
  distractions: [],
  safe_environment: [],
  reasons_to_live: [],
  recommended_by: null,
  patient_edited_at: null,
  created_at: `2026-09-01T00:00:${id.padStart(2, '0')}Z`,
  updated_at: '2026-09-01T00:00:00Z',
  ...extra,
});

const suggestion = {
  id: 'sug-1',
  patient_id: 'patient-1',
  psychologist_name: 'Ana Souza',
  source_type: 'sos',
  title: 'Plano pós-crise',
  warning_signs: ['Não consigo dormir'],
  coping_strategies: ['Exercício de respiração do app'],
  distractions: [],
  safe_environment: [],
  reasons_to_live: [],
  status: 'pending',
  delivered_at: '2026-10-13T10:00:00Z',
};

const renderList = () =>
  render(
    <MemoryRouter>
      <SafetyPlans />
    </MemoryRouter>,
  );

beforeEach(() => {
  fakeDb.tables = {};
  fakeDb.writes = [];
  fakeDb.rpcHandlers = {};
  fakeDb.currentUserId = 'patient-1';
  toast.mockClear();
});

describe('plano pós-crise: paciente', () => {
  it('mostra a recomendação com o selo do psicólogo e salva nos planos', async () => {
    fakeDb.seed('safety_plans', [plan('1', 'Plano da noite')]);
    fakeDb.seed('safety_plan_suggestions', [suggestion]);
    const accept = vi.fn((_params: Record<string, unknown>) => ({ data: 'novo', error: null }));
    fakeDb.rpcHandlers.accept_safety_plan_suggestion = (_db, params) => accept(params);
    renderList();

    expect(await screen.findByText('Recomendados para você')).toBeInTheDocument();
    expect(screen.getByText('Recomendado por Ana Souza')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver o plano' }));
    expect(screen.getByText('Não consigo dormir')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Salvar nos meus planos' }));
    await waitFor(() => expect(accept).toHaveBeenCalledWith({ p_suggestion_id: 'sug-1' }));
    await waitFor(() => expect(screen.queryByText('Recomendados para você')).not.toBeInTheDocument());
  });

  it('"Agora não" tira a recomendação da tela', async () => {
    fakeDb.seed('safety_plan_suggestions', [suggestion]);
    const dismiss = vi.fn((_params: Record<string, unknown>) => ({ data: null, error: null }));
    fakeDb.rpcHandlers.dismiss_safety_plan_suggestion = (_db, params) => dismiss(params);
    renderList();

    fireEvent.click(await screen.findByRole('button', { name: 'Agora não' }));
    await waitFor(() => expect(dismiss).toHaveBeenCalledWith({ p_suggestion_id: 'sug-1' }));
    await waitFor(() => expect(screen.queryByText('Recomendado por Ana Souza')).not.toBeInTheDocument());
  });

  it('com 10 planos, pede qual substituir antes de salvar', async () => {
    fakeDb.seed('safety_plans', Array.from({ length: 10 }, (_, i) => plan(String(i + 1), `Plano ${i + 1}`)));
    fakeDb.seed('safety_plan_suggestions', [suggestion]);
    const accept = vi.fn((_params: Record<string, unknown>) => ({ data: 'novo', error: null }));
    fakeDb.rpcHandlers.accept_safety_plan_suggestion = (_db, params) => accept(params);
    renderList();

    fireEvent.click(await screen.findByRole('button', { name: 'Salvar nos meus planos' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Você já tem 10 planos')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByLabelText('Plano 3'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Substituir e salvar' }));
    await waitFor(() => expect(accept).toHaveBeenCalledWith({ p_suggestion_id: 'sug-1', p_replace_plan_id: '3' }));
  });

  it('editar antes de salvar envia a versão ajustada', async () => {
    fakeDb.seed('safety_plan_suggestions', [suggestion]);
    const accept = vi.fn((_params: Record<string, unknown>) => ({ data: 'novo', error: null }));
    fakeDb.rpcHandlers.accept_safety_plan_suggestion = (_db, params) => accept(params);
    renderList();

    fireEvent.click(await screen.findByRole('button', { name: 'Editar antes de salvar' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Título do plano'), { target: { value: 'Meu plano' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar nos meus planos' }));
    await waitFor(() =>
      expect(accept).toHaveBeenCalledWith(
        expect.objectContaining({
          p_suggestion_id: 'sug-1',
          p_title: 'Meu plano',
          p_warning_signs: ['Não consigo dormir'],
        }),
      ),
    );
  });

  it('plano salvo de uma recomendação mantém o selo e mostra "editado por você"', async () => {
    fakeDb.seed('safety_plans', [plan('1', 'Plano pós-crise', { recommended_by: 'Ana Souza', patient_edited_at: '2026-10-13T11:00:00Z' })]);
    renderList();
    expect(await screen.findByText('Recomendado por Ana Souza')).toBeInTheDocument();
    expect(screen.getByText('· editado por você')).toBeInTheDocument();
  });

  it('o rascunho do psicólogo (atendimento em andamento) não aparece', async () => {
    fakeDb.seed('safety_plan_suggestions', [{ ...suggestion, status: 'draft' }]);
    renderList();
    await screen.findByText('0 de 10 planos');
    expect(screen.queryByText('Recomendados para você')).not.toBeInTheDocument();
  });
});

describe('plano pós-crise: psicólogo na chamada', () => {
  it('preenche o formulário e salva para o atendimento', async () => {
    const save = vi.fn((_params: Record<string, unknown>) => ({ data: 'sug-1', error: null }));
    fakeDb.rpcHandlers.get_post_crisis_plan = () => ({ data: [], error: null });
    fakeDb.rpcHandlers.save_post_crisis_plan = (_db, params) => save(params);
    const onOpenChange = vi.fn();
    render(<PostCrisisPlanDialog open onOpenChange={onOpenChange} sourceType="sos" sourceId="req-1" />);

    const saveButton = await screen.findByRole('button', { name: 'Salvar plano' });
    expect(saveButton).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Não consigo dormir/ }));
    fireEvent.click(saveButton);
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({
          p_source_type: 'sos',
          p_source_id: 'req-1',
          p_title: 'Plano pós-crise',
          p_warning_signs: ['Não consigo dormir'],
        }),
      ),
    );
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it('plano já entregue e decidido fica só para leitura', async () => {
    fakeDb.rpcHandlers.get_post_crisis_plan = () => ({
      data: [{ id: 's', title: 'P', warning_signs: ['x'], coping_strategies: [], distractions: [], safe_environment: [], reasons_to_live: [], delivered: true, editable: false }],
      error: null,
    });
    render(<PostCrisisPlanDialog open onOpenChange={() => {}} sourceType="appointment" sourceId="apt-1" />);
    expect(await screen.findByText('O plano já foi entregue ao paciente e não pode mais ser alterado.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Salvar/ })).not.toBeInTheDocument();
  });
});

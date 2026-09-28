import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { fakeDb, fakeSupabase } from './fakeSupabase';

vi.mock('@/integrations/supabase/client', () => ({ supabase: fakeSupabase }));
const user = { id: 'patient-1' };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user }) }));
// Stable identity, like the real useToast (a fresh fn per render would refetch in a loop).
const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/components/PageHeader', () => ({ default: () => <div /> }));
vi.mock('@/components/PatientBottomNav', () => ({ default: () => <div /> }));

import SafetyPlan from '@/pages/SafetyPlan';

beforeEach(() => {
  fakeDb.tables = {};
  fakeDb.writes = [];
  fakeDb.currentUserId = 'patient-1';
});

describe('SafetyPlan page', () => {
  it('adicionar um contato não apaga os itens marcados e ainda não salvos', async () => {
    render(
      <MemoryRouter>
        <SafetyPlan />
      </MemoryRouter>
    );

    // A primeira parte (sinais de alerta) abre sozinha; marca uma sugestão.
    fireEvent.click(await screen.findByText('Não consigo dormir'));
    expect(screen.getByLabelText('Remover "Não consigo dormir"')).toBeInTheDocument();

    // Abre a parte de contatos e adiciona um.
    fireEvent.click(screen.getByText('Pessoas a quem posso pedir ajuda'));
    fireEvent.change(await screen.findByLabelText('Nome'), { target: { value: 'Irmã' } });
    fireEvent.change(screen.getByLabelText('Telefone'), { target: { value: '(11) 99999-0000' } });
    fireEvent.click(screen.getByText('Adicionar contato'));

    await waitFor(() => expect(fakeDb.rows('emergency_contacts')).toHaveLength(1));
    await screen.findByText('(11) 99999-0000');

    // O item marcado antes continua no rascunho, e o botão de salvar segue visível.
    fireEvent.click(screen.getByText('Sinais de alerta'));
    expect(await screen.findByLabelText('Remover "Não consigo dormir"')).toBeInTheDocument();
    expect(screen.getByText('Salvar plano')).toBeInTheDocument();
  });
});

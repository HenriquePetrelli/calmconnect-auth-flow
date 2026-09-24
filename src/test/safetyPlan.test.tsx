import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { fakeDb, fakeSupabase } from './fakeSupabase';

vi.mock('@/integrations/supabase/client', () => ({ supabase: fakeSupabase }));

import {
  addItem,
  countFilledSections,
  emptySafetyPlan,
  isInviteSnoozed,
  isValidPhone,
  telHref,
} from '@/lib/safetyPlan';
import SafetyPlanSection from '@/components/sos/SafetyPlanSection';

describe('plano de segurança — regras puras', () => {
  it('não duplica itens (ignorando maiúsculas) nem aceita vazio', () => {
    expect(addItem(['Caminhar'], '  caminhar ')).toEqual(['Caminhar']);
    expect(addItem(['Caminhar'], '   ')).toEqual(['Caminhar']);
    expect(addItem([], ' Respirar ')).toEqual(['Respirar']);
  });

  it('conta as partes preenchidas, contatos inclusos', () => {
    const plan = { ...emptySafetyPlan(), warning_signs: ['x'], reasons_to_live: ['y'] };
    expect(countFilledSections(plan, 0)).toBe(2);
    expect(countFilledSections(plan, 2)).toBe(3);
  });

  it('valida telefone brasileiro e gera tel: só com dígitos', () => {
    expect(isValidPhone('(11) 99999-0000')).toBe(true);
    expect(isValidPhone('abc')).toBe(false);
    expect(isValidPhone('1234')).toBe(false);
    expect(telHref('(11) 99999-0000')).toBe('tel:11999990000');
  });

  it('convite fica dispensado por 14 dias', () => {
    const now = Date.now();
    expect(isInviteSnoozed(null, now)).toBe(false);
    expect(isInviteSnoozed(new Date(now - 13 * 86400000).toISOString(), now)).toBe(true);
    expect(isInviteSnoozed(new Date(now - 15 * 86400000).toISOString(), now)).toBe(false);
  });
});

describe('SafetyPlanSection — exibição ao psicólogo no SOS', () => {
  beforeEach(() => {
    fakeDb.rpcHandlers = {};
  });

  it('só busca o plano (e gera registro de auditoria) quando o psicólogo pede', async () => {
    const rpcSpy = vi.fn(() => ({
      data: {
        plan: { warning_signs: ['Não consigo dormir'], coping_strategies: [], distractions: [], safe_environment: [], reasons_to_live: [], updated_at: '' },
        contacts: [{ name: 'Irmã', relationship: null, phone: '(11) 99999-0000', is_primary: true }],
      },
      error: null,
    }));
    fakeDb.rpcHandlers.get_sos_safety_plan = rpcSpy;

    render(<SafetyPlanSection requestId="req-1" />);
    expect(rpcSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /ver plano de segurança/i }));

    await waitFor(() => expect(screen.getByText('Não consigo dormir')).toBeInTheDocument());
    expect(rpcSpy).toHaveBeenCalledWith(expect.anything(), { p_request_id: 'req-1' });
    expect(screen.getByRole('link', { name: /99999-0000/ })).toHaveAttribute('href', 'tel:11999990000');
  });

  it('sem acesso (SOS encerrado ou de outro psicólogo) mostra erro, sem dados', async () => {
    fakeDb.rpcHandlers.get_sos_safety_plan = () => ({ data: null, error: null });

    render(<SafetyPlanSection requestId="req-1" />);
    fireEvent.click(screen.getByRole('button', { name: /ver plano de segurança/i }));

    expect(await screen.findByText(/não foi possível abrir o plano/i)).toBeInTheDocument();
  });
});

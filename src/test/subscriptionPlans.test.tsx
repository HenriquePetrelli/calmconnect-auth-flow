import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

type InvokeResult = { data: unknown; error: unknown };
const handlers: Record<string, (body: Record<string, unknown> | undefined) => InvokeResult> = {};
const invoke = vi.fn(async (name: string, options?: { body?: Record<string, unknown> }) =>
  handlers[name] ? handlers[name](options?.body) : { data: null, error: null },
);
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: (name: string, options?: { body?: Record<string, unknown> }) => invoke(name, options) },
    auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) },
  },
}));

const toastMock = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }));
vi.mock('@/components/PageHeader', () => ({ default: ({ title }: { title: string }) => <h1>{title}</h1> }));

const subscription = {
  subscribed: false,
  subscriptionTier: null as string | null,
  subscriptionEnd: null as string | null,
  entitlementSource: null as string | null,
  organizationName: null,
  personalSubscriptionTier: null,
  cancelAtPeriodEnd: false,
  pendingTier: null as string | null,
  pendingFrom: null as string | null,
  paymentIssue: false,
  extraSubscriptions: 0,
  checkSubscription: vi.fn(async () => {}),
};
vi.mock('@/contexts/SubscriptionContext', () => ({ useSubscription: () => subscription }));

import SubscriptionPlans from '@/pages/SubscriptionPlans';

const renderPage = () =>
  render(
    <MemoryRouter>
      <SubscriptionPlans />
    </MemoryRouter>,
  );

const subscribedTo = (tier: string, extra: Partial<typeof subscription> = {}) =>
  Object.assign(subscription, {
    subscribed: true,
    subscriptionTier: tier,
    subscriptionEnd: '2026-10-20T12:00:00.000Z',
    entitlementSource: 'stripe',
    ...extra,
  });

beforeEach(() => {
  invoke.mockClear();
  toastMock.mockClear();
  for (const key of Object.keys(handlers)) delete handlers[key];
  Object.assign(subscription, {
    subscribed: false,
    subscriptionTier: null,
    subscriptionEnd: null,
    entitlementSource: null,
    cancelAtPeriodEnd: false,
    pendingTier: null,
    pendingFrom: null,
    paymentIssue: false,
    extraSubscriptions: 0,
  });
});

const calls = (name: string) => invoke.mock.calls.filter(([fn]) => fn === name).map(([, options]) => options?.body);

describe('planos e pagamento', () => {
  it('quem não assina vai ao checkout do plano escolhido', async () => {
    handlers['create-checkout'] = () => ({ data: { url: 'https://checkout.stripe.com/x' }, error: null });
    renderPage();
    fireEvent.click(screen.getAllByRole('button', { name: 'Assinar Agora' })[1]);
    await waitFor(() => expect(calls('create-checkout')).toEqual([{ plan: 'Premium' }]));
  });

  it('subir de plano mostra a diferença e troca na mesma assinatura, sem novo checkout', async () => {
    subscribedTo('Plus');
    handlers['manage-subscription'] = (body) =>
      body?.action === 'preview_change'
        ? { data: { direction: 'upgrade', amount_due: 2505, proration_date: 1790000000, renews_on: '2026-10-20T12:00:00.000Z' }, error: null }
        : { data: { ok: true, direction: 'upgrade' }, error: null };
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Mudar para Premium' }));
    expect(await screen.findByText(/Hoje cobramos R\$\s?25,05/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(() =>
      expect(calls('manage-subscription')).toContainEqual({ action: 'change_plan', plan: 'Premium', proration_date: 1790000000 }),
    );
    expect(calls('create-checkout')).toEqual([]);
    expect(subscription.checkSubscription).toHaveBeenCalled();
  });

  it('descer de plano vale na renovação, sem cobrança agora', async () => {
    subscribedTo('Premium');
    handlers['manage-subscription'] = () => ({ data: { direction: 'downgrade', effective_on: '2026-10-20T12:00:00.000Z' }, error: null });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Mudar para Plus' }));
    expect(await screen.findByText(/Você continua no Premium até 20\/10\/2026.*Nada é cobrado agora/)).toBeInTheDocument();
  });

  it('cartão recusado na troca: avisa e nada muda', async () => {
    subscribedTo('Plus');
    handlers['manage-subscription'] = (body) =>
      body?.action === 'preview_change'
        ? { data: { direction: 'upgrade', amount_due: 100, proration_date: 1, renews_on: '2026-10-20T12:00:00.000Z' }, error: null }
        : { data: { error_code: 'payment_failed' }, error: null };
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Mudar para Premium' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'O cartão recusou a cobrança' })));
  });

  it('cancelar mostra até quando o plano continua', async () => {
    subscribedTo('Plus');
    handlers['cancel-subscription'] = (body) =>
      body?.preview
        ? { data: { refund_eligible: false, mode: 'period_end', access_until: '2026-10-20T12:00:00.000Z' }, error: null }
        : { data: { success: true, mode: 'period_end', access_until: '2026-10-20T12:00:00.000Z', refund_status: 'none' }, error: null };
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar assinatura' }));
    expect(await screen.findByText(/continua até 20\/10\/2026 e não será renovado/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Cancelamento' }));
    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ description: expect.stringContaining('até 20/10/2026') })),
    );
  });

  it('cancelamento agendado pode ser desfeito', async () => {
    subscribedTo('Plus', { cancelAtPeriodEnd: true });
    handlers['manage-subscription'] = () => ({ data: { ok: true }, error: null });
    renderPage();
    expect(screen.getByRole('note')).toHaveTextContent('continua até 20/10/2026 e não será renovado');
    expect(screen.queryByRole('button', { name: 'Cancelar assinatura' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Manter minha assinatura' }));
    await waitFor(() => expect(calls('manage-subscription')).toEqual([{ action: 'resume' }]));
  });

  it('troca para baixo agendada aparece e pode ser desfeita', async () => {
    subscribedTo('Premium', { pendingTier: 'Plus', pendingFrom: '2026-10-20T12:00:00.000Z' });
    handlers['manage-subscription'] = () => ({ data: { ok: true }, error: null });
    renderPage();
    expect(screen.getByRole('button', { name: 'Começa em 20/10/2026' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar no Premium' }));
    await waitFor(() => expect(calls('manage-subscription')).toEqual([{ action: 'keep_current' }]));
  });

  it('pagamento recusado na renovação pede para atualizar o cartão', () => {
    subscribedTo('Plus', { paymentIssue: true });
    renderPage();
    expect(screen.getAllByRole('alert')[0]).toHaveTextContent('Não conseguimos cobrar a renovação');
    expect(screen.getByRole('button', { name: 'Atualizar pagamento' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mudar para Premium' })).toBeDisabled();
  });

  it('avisa cobrança em dobro', () => {
    subscribedTo('Premium', { extraSubscriptions: 1 });
    renderPage();
    expect(screen.getByRole('alert')).toHaveTextContent('está sendo cobrado em dobro');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'a@b.com' } } }), signOut: async () => ({}) },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { full_name: 'Ana', user_type: 'patient' } }) }) }) }),
  },
}));
vi.mock('@/contexts/SubscriptionContext', () => ({
  useSubscription: () => ({ subscribed: false, subscriptionTier: null, entitlementSource: null, organizationName: null }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ signOut: vi.fn() }) }));
vi.mock('@/hooks/useWeeklyGoals', () => ({
  useWeeklyGoals: () => ({ getShowGoalModalPreference: async () => true, setShowGoalModal: async () => {} }),
}));
vi.mock('@/components/ThemeToggle', () => ({ ThemeToggle: () => null }));
vi.mock('@/components/DailyMoodToggle', () => ({ DailyMoodToggle: () => null }));
vi.mock('@/components/PushNotificationToggle', () => ({ PushNotificationToggle: () => null }));
vi.mock('@/components/EditSymptomsModal', () => ({ default: () => null }));

const company = { benefit: null as null | { tier: string; organizationName: string }, managedOrganizationIds: [] as string[] };
vi.mock('@/hooks/useCompanyBenefit', () => ({ useCompanyBenefit: () => company }));

import Profile from '@/pages/Profile';

const renderProfile = () =>
  render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>,
  );

beforeEach(() => {
  company.benefit = null;
  company.managedOrganizationIds = [];
});

describe('Perfil: benefício da empresa', () => {
  it('não aparece para quem não tem vínculo com empresa', async () => {
    renderProfile();
    expect(await screen.findByText('Termos de Uso')).toBeInTheDocument();
    expect(screen.queryByText('Benefício da empresa')).not.toBeInTheDocument();
  });

  it('aparece para o colaborador com o plano da empresa', async () => {
    company.benefit = { tier: 'Plus', organizationName: 'Empresa Teste' };
    renderProfile();
    expect(await screen.findByText('Benefício da empresa')).toBeInTheDocument();
    expect(screen.getByText('Plano Plus pela Empresa Teste')).toBeInTheDocument();
  });

  it('aparece para o gestor do RH, mesmo sem usar o plano', async () => {
    company.managedOrganizationIds = ['org-1'];
    renderProfile();
    expect(await screen.findByText('Benefício da empresa')).toBeInTheDocument();
    expect(screen.getByText('Portal da empresa')).toBeInTheDocument();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RouteGuard from '@/components/RouteGuard';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) }) },
}));
vi.mock('@/utils/psychologistBlock', () => ({ isCurrentlyBlocked: () => false, notifyBlockedAccess: vi.fn() }));
// Psicólogo recém-cadastrado: logado, mas sem tipo liberado (em análise).
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'novo' }, userType: 'unknown', loading: false }),
}));

describe('conta logada sem tipo liberado', () => {
  it('a tela de cadastro continua aberta (não vira carregamento infinito)', () => {
    render(
      <MemoryRouter initialEntries={['/psychologist-signup']}>
        <RouteGuard allowedUserTypes={['public']}>
          <div>formulário de cadastro</div>
        </RouteGuard>
      </MemoryRouter>,
    );
    expect(screen.getByText('formulário de cadastro')).toBeInTheDocument();
  });

  it('telas internas continuam esperando o tipo de conta', () => {
    render(
      <MemoryRouter initialEntries={['/home']}>
        <RouteGuard allowedUserTypes={['patient']}>
          <div>home</div>
        </RouteGuard>
      </MemoryRouter>,
    );
    expect(screen.queryByText('home')).not.toBeInTheDocument();
  });
});

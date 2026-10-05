import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const presence = { isOnline: false };
vi.mock('@/hooks/usePsychologistPresence', () => ({ usePsychologistPresence: () => presence }));
const emergency = { emergencyRequests: [] as { status: string }[] };
vi.mock('@/hooks/usePsychologistEmergency', () => ({ usePsychologistEmergency: () => emergency }));

import PsychologistBottomNav from '@/components/psychologist/layout/PsychologistBottomNav';
import EmergencyAlertBanner from '@/components/psychologist/layout/EmergencyAlertBanner';

beforeEach(() => {
  presence.isOnline = false;
  emergency.emergencyRequests = [];
});

describe('barra inferior do psicólogo', () => {
  it('tem Início, Consultas, Agenda, Chat e Perfil e marca a aba aberta', () => {
    render(
      <MemoryRouter initialEntries={['/psicologo/consultas']}>
        <PsychologistBottomNav />
      </MemoryRouter>,
    );
    for (const label of ['Início', 'Consultas', 'Agenda', 'Chat', 'Perfil']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'Consultas' })).toHaveAttribute('aria-current', 'page');
  });

  it('Pagamentos e Suporte contam como a aba Perfil', () => {
    render(
      <MemoryRouter initialEntries={['/psychologist-payments']}>
        <PsychologistBottomNav />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: 'Perfil' })).toHaveAttribute('aria-current', 'page');
  });

  it('mostra no Início que o psicólogo está online', () => {
    presence.isOnline = true;
    render(
      <MemoryRouter>
        <PsychologistBottomNav />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: 'Início (você está online)' })).toBeInTheDocument();
  });
});

describe('aviso de SOS fora do Início', () => {
  it('não aparece sem pedido esperando', () => {
    const { container } = render(
      <MemoryRouter>
        <EmergencyAlertBanner />
      </MemoryRouter>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('mostra quantos pedidos esperam e leva ao Início', () => {
    emergency.emergencyRequests = [{ status: 'pending' }, { status: 'pending' }, { status: 'accepted' }];
    render(
      <MemoryRouter initialEntries={['/chat']}>
        <Routes>
          <Route path="/chat" element={<EmergencyAlertBanner />} />
          <Route path="/psychologist-dashboard" element={<p>início do psicólogo</p>} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText('2 pedidos de SOS esperando'));
    expect(screen.getByText('início do psicólogo')).toBeInTheDocument();
  });
});

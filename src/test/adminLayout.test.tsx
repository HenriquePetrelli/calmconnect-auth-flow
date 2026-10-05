import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'admin@soliv.app' }, signOut: vi.fn() }),
}));
vi.mock('@/hooks/useNotifications', () => ({ useNotifications: () => ({ unreadCount: 2 }) }));

import AdminLayout from '@/components/admin/AdminLayout';

const Where = () => {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname + search}</p>;
};

const renderLayout = (active: Parameters<typeof AdminLayout>[0]['active'], badges = {}) =>
  render(
    <MemoryRouter initialEntries={['/admin-dashboard']}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <AdminLayout active={active} badges={badges}>
                <p>conteúdo</p>
              </AdminLayout>
              <Where />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );

const bottomNav = () => screen.getByRole('navigation', { name: 'Painel administrativo' });

describe('layout do admin', () => {
  it('barra inferior tem Início, Psicólogos, Pacientes, Repasses e Mais', () => {
    renderLayout('overview');
    const nav = bottomNav();
    const labels = Array.from(nav.querySelectorAll('button')).map((b) => b.textContent);
    expect(labels).toEqual(['Início', 'Psicólogos', 'Pacientes', 'Repasses', 'Mais']);
    expect(screen.getByText('conteúdo')).toBeInTheDocument();
  });

  it('mostra quantos psicólogos aguardam aprovação', () => {
    renderLayout('overview', { psychologists: 3 });
    expect(screen.getByRole('button', { name: 'Psicólogos, 3 pendentes' })).toBeInTheDocument();
  });

  it('seção fora da barra marca "Mais" e o menu abre com todas as seções', () => {
    renderLayout('sos');
    const more = screen.getByRole('button', { name: 'Mais' });
    expect(more).toHaveAttribute('aria-current', 'page');
    fireEvent.click(more);
    expect(screen.getByRole('dialog')).toHaveTextContent('admin@soliv.app');
  });

  it('o sino leva às notificações', () => {
    renderLayout('overview');
    fireEvent.click(screen.getAllByRole('button', { name: 'Notificações, 2 não lidas' })[0]);
    expect(screen.getByTestId('where')).toHaveTextContent('/admin-notifications');
  });
});

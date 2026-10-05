import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const auth = { user: null as null | { id: string }, userType: 'unknown' };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));

import NotFound from '@/pages/NotFound';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<p>tela de login</p>} />
        <Route path="/home" element={<p>home do paciente</p>} />
        <Route path="/psychologist-dashboard" element={<p>painel do psicólogo</p>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </MemoryRouter>,
  );

describe('endereço que não existe', () => {
  it('mostra o aviso com o endereço digitado', () => {
    auth.user = null;
    renderAt('/nao-existe');
    expect(screen.getByText('Não encontramos esta página')).toBeInTheDocument();
    expect(screen.getByText('/nao-existe')).toBeInTheDocument();
  });

  it('visitante volta para o login', () => {
    auth.user = null;
    renderAt('/xyz');
    fireEvent.click(screen.getByRole('button', { name: 'Voltar para o início' }));
    expect(screen.getByText('tela de login')).toBeInTheDocument();
  });

  it('paciente volta para a Home e psicólogo para o painel', () => {
    auth.user = { id: 'u1' };
    auth.userType = 'patient';
    const { unmount } = renderAt('/xyz');
    fireEvent.click(screen.getByRole('button', { name: 'Voltar para o início' }));
    expect(screen.getByText('home do paciente')).toBeInTheDocument();
    unmount();
    auth.userType = 'psychologist';
    renderAt('/abc');
    fireEvent.click(screen.getByRole('button', { name: 'Voltar para o início' }));
    expect(screen.getByText('painel do psicólogo')).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { fakeDb, fakeSupabase } from './fakeSupabase';

vi.mock('@/integrations/supabase/client', () => ({ supabase: fakeSupabase }));
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast: toastMock }));

import LoginForm from '@/components/LoginForm';

const renderLogin = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<LoginForm onForgotPassword={() => {}} onSignUp={() => {}} />} />
        <Route path="/admin-dashboard" element={<p>Painel admin</p>} />
        <Route path="/home" element={<p>Home do paciente</p>} />
        <Route path="/psicologo/concluir-cadastro" element={<p>Concluir cadastro</p>} />
      </Routes>
    </MemoryRouter>,
  );

const login = (email: string) => {
  fireEvent.change(screen.getByLabelText(/e-?mail/i), { target: { value: email } });
  fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: 'segredo123' } });
  fireEvent.submit(screen.getByLabelText(/senha/i).closest('form')!);
};

beforeEach(() => {
  fakeDb.tables = {};
  fakeDb.rpcHandlers = {};
  fakeDb.currentUserId = null;
  fakeDb.loginUsers = {};
  toastMock.success.mockClear();
  toastMock.error.mockClear();
});

describe('login', () => {
  it('admin (sem linha em profiles) entra direto no painel, sem toast de erro', async () => {
    fakeDb.loginUsers['admin@soliv.com'] = { id: 'admin-1' };
    fakeDb.rpcHandlers.is_super_admin = (_db, params) => ({ data: params.user_id_param === 'admin-1', error: null });
    renderLogin();
    login('admin@soliv.com');
    expect(await screen.findByText('Painel admin')).toBeInTheDocument();
    expect(toastMock.error).not.toHaveBeenCalled();
  });

  it('paciente segue para a home', async () => {
    fakeDb.loginUsers['ana@x.com'] = { id: 'p1' };
    fakeDb.rpcHandlers.is_super_admin = () => ({ data: false, error: null });
    fakeDb.seed('profiles', [{ user_id: 'p1', user_type: 'patient', full_name: 'Ana' }]);
    renderLogin();
    login('ana@x.com');
    expect(await screen.findByText('Home do paciente')).toBeInTheDocument();
  });

  it('conta sem perfil e sem ser admin: avisa e não deixa a sessão aberta', async () => {
    fakeDb.loginUsers['orfa@x.com'] = { id: 'o1' };
    fakeDb.rpcHandlers.is_super_admin = () => ({ data: false, error: null });
    renderLogin();
    login('orfa@x.com');
    await waitFor(() => expect(toastMock.error).toHaveBeenCalled());
    expect(fakeDb.currentUserId).toBeNull();
  });

  it('e-mail com espaço e maiúscula entra normalmente', async () => {
    fakeDb.loginUsers['ana@x.com'] = { id: 'p1' };
    fakeDb.rpcHandlers.is_super_admin = () => ({ data: false, error: null });
    fakeDb.seed('profiles', [{ user_id: 'p1', user_type: 'patient', full_name: 'Ana' }]);
    renderLogin();
    login('  Ana@X.com ');
    expect(await screen.findByText('Home do paciente')).toBeInTheDocument();
  });

  it('psicólogo que confirmou o e-mail e ainda não enviou o documento vai concluir o cadastro', async () => {
    fakeDb.loginUsers['psi@x.com'] = { id: 's1' };
    fakeDb.rpcHandlers.is_super_admin = () => ({ data: false, error: null });
    fakeDb.seed('profiles', [{ user_id: 's1', user_type: 'psychologist', full_name: 'Psi' }]);
    renderLogin();
    login('psi@x.com');
    expect(await screen.findByText('Concluir cadastro')).toBeInTheDocument();
  });
});

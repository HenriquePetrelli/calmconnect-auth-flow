import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RouteSkeleton, { hasRouteSkeleton } from '@/components/skeletons/RouteSkeleton';

// Todos os endereços declarados no App, com parâmetros trocados por um valor.
const appRoutes = [...readFileSync('src/App.tsx', 'utf8').matchAll(/path="([^"]+)"/g)]
  .map((m) => m[1])
  .filter((path) => path !== '*')
  .map((path) => path.replace(/:[A-Za-z]+/g, 'x'));

describe('skeleton de cada tela', () => {
  it('todo endereço do app tem o próprio skeleton', () => {
    expect(appRoutes.length).toBeGreaterThan(40);
    expect(appRoutes.filter((path) => !hasRouteSkeleton(path))).toEqual([]);
  });

  it('o Perfil não mostra o skeleton da Home', () => {
    render(
      <MemoryRouter initialEntries={['/profile']}>
        <RouteSkeleton />
      </MemoryRouter>,
    );
    expect(screen.getAllByLabelText('Carregando')).toHaveLength(1);
    expect(document.querySelectorAll('.grid-cols-2')).toHaveLength(0);
  });

  it('telas com cabeçalho roxo já mostram o título', () => {
    render(
      <MemoryRouter initialEntries={['/questionarios']}>
        <RouteSkeleton />
      </MemoryRouter>,
    );
    expect(screen.getByText('Questionários do mês')).toBeInTheDocument();
  });
});

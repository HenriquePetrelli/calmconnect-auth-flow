import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { ROUTE_LOADERS, loaderForPath } from '@/lib/routePreload';

const app = readFileSync('src/App.tsx', 'utf8');
const appRoutes = [...app.matchAll(/path="([^"]+)"/g)].map((m) => m[1]).filter((p) => p !== '*');

describe('código das telas baixado antes da hora', () => {
  it('toda rota do App tem o código da tela na tabela', () => {
    const known = new Set(ROUTE_LOADERS.map(([path]) => path));
    expect(appRoutes.filter((path) => !known.has(path))).toEqual([]);
  });

  it('cada rota baixa o mesmo arquivo de tela que o App usa', () => {
    // Nome da tela de cada rota no App (<RouteGuard ...><Tela />) e o import dela.
    const lazies = Object.fromEntries(
      [...app.matchAll(/const (\w+) = lazy\(\(\) => import\("\.\/pages\/([^"]+)"\)\);/g)].map((m) => [m[1], m[2]]),
    );
    const source = readFileSync('src/lib/routePreload.ts', 'utf8');
    const pageImports = Object.fromEntries(
      [...source.matchAll(/(\w+): \(\) => import\("@\/pages\/([^"]+)"\)/g)].map((m) => [m[1], m[2]]),
    );
    const tableEntries = Object.fromEntries(
      [...source.matchAll(/\["([^"]+)", page\.(\w+)\]/g)].map((m) => [m[1], pageImports[m[2]]]),
    );
    const mismatches = [...app.matchAll(/<Route path="([^"]+)" element=\{\s*(?:<RouteGuard[^>]*>\s*)?<(\w+)/g)]
      .filter(([, path]) => path !== '*')
      .filter(([, path, component]) => tableEntries[path] !== lazies[component])
      .map(([, path]) => path);
    expect(mismatches).toEqual([]);
  });

  it('acha a tela de endereços com parâmetro e ignora endereço inexistente', () => {
    expect(loaderForPath('/habitos/abc')).toBe(ROUTE_LOADERS.find(([p]) => p === '/habitos/:habitId')?.[1]);
    expect(loaderForPath('/habitos/novo')).toBe(ROUTE_LOADERS.find(([p]) => p === '/habitos/novo')?.[1]);
    expect(loaderForPath('/xyz')).toBeUndefined();
  });
});

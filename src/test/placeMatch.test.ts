import { describe, expect, it } from 'vitest';
import { findCity, findStateAbbreviation, normalizePlace } from '@/lib/placeMatch';

const states = [
  { abbreviation: 'SP', name: 'São Paulo' },
  { abbreviation: 'RJ', name: 'Rio de Janeiro' },
];
const cities = [{ name: 'São Paulo' }, { name: 'São José dos Campos' }, { name: 'Campinas' }];

describe('preenchimento automático de estado e cidade', () => {
  it('ignora acentos, maiúsculas e espaços', () => {
    expect(normalizePlace('  SÃO   José ')).toBe('sao jose');
  });

  it('acha o estado pela sigla ou pelo nome', () => {
    expect(findStateAbbreviation(states, 'sp')).toBe('SP');
    expect(findStateAbbreviation(states, 'Sao Paulo')).toBe('SP');
    expect(findStateAbbreviation(states, 'rio de janeiro')).toBe('RJ');
    expect(findStateAbbreviation(states, 'Bahia')).toBeNull();
  });

  it('devolve a cidade com o nome da lista', () => {
    expect(findCity(cities, 'SAO JOSE DOS CAMPOS')).toBe('São José dos Campos');
    expect(findCity(cities, 'Niterói')).toBeNull();
    expect(findCity(cities, '')).toBeNull();
  });
});

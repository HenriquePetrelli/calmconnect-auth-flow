import { describe, it, expect } from 'vitest';
import { SINTOMAS, SINTOMA_GRUPOS } from '@/data/sintomas';

describe('grupos de sintomas', () => {
  it('cada sintoma aparece em exatamente um grupo', () => {
    const agrupados = SINTOMA_GRUPOS.flatMap((g) => g.itens);
    expect(agrupados.every(Boolean)).toBe(true);
    expect(new Set(agrupados).size).toBe(agrupados.length);
    expect([...agrupados].sort()).toEqual([...SINTOMAS].sort());
  });
});

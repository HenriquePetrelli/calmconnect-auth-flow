import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakeDb, fakeSupabase } from './fakeSupabase';

vi.mock('@/integrations/supabase/client', () => ({ supabase: fakeSupabase }));

import { collectMyData } from '@/lib/exportMyData';

beforeEach(() => {
  fakeDb.tables = {};
});

describe('exportar meus dados', () => {
  it('junta os dados do próprio titular e nada de outras pessoas', async () => {
    fakeDb.seed('private_journals', [
      { user_id: 'me', texto: 'meu' },
      { user_id: 'outro', texto: 'alheio' },
    ]);
    fakeDb.seed('safety_plans', [{ patient_id: 'me', warning_signs: ['x'] }]);

    const result = await collectMyData('me', 'me@x.com');

    expect(result.titular).toEqual({ id: 'me', email: 'me@x.com' });
    expect(result.dados.diario).toEqual([{ user_id: 'me', texto: 'meu' }]);
    expect(result.dados.plano_de_seguranca).toHaveLength(1);
  });
});

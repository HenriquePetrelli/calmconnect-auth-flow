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

  it('inclui o chat (conversas e mensagens dos dois lados) e os aceites dos termos', async () => {
    fakeDb.seed('conversas', [
      { id: 'c1', paciente_id: 'me', psicologo_id: 'psi' },
      { id: 'c2', paciente_id: 'outro', psicologo_id: 'psi' },
    ]);
    fakeDb.seed('mensagens', [
      { id: 'm1', conversa_id: 'c1', autor_id: 'me', conteudo: 'oi', created_at: '2026-10-01T10:00:00Z' },
      { id: 'm2', conversa_id: 'c1', autor_id: 'psi', conteudo: 'olá', created_at: '2026-10-01T10:01:00Z' },
      { id: 'm3', conversa_id: 'c2', autor_id: 'outro', conteudo: 'alheia', created_at: '2026-10-01T10:02:00Z' },
    ]);
    fakeDb.seed('legal_acceptances', [{ user_id: 'me', document: 'terms', version: '1' }]);

    const result = await collectMyData('me', 'me@x.com');

    expect((result.dados.conversas as unknown[]).length).toBe(1);
    expect((result.dados.mensagens as { id: string }[]).map((m) => m.id)).toEqual(['m1', 'm2']);
    expect(result.dados.aceites_dos_termos).toHaveLength(1);
  });
});

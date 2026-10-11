import { describe, it, expect, vi, beforeEach } from 'vitest';

const { calls } = vi.hoisted(() => ({ calls: [] as { op: string; args: unknown[] }[] }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      calls.push({ op: 'from', args: [table] });
      const chain = {
        select: () => chain,
        in: async (...args: unknown[]) => {
          calls.push({ op: 'in', args });
          return { data: [{ appointment_id: 'a1', note: 'só eu vejo' }], error: null };
        },
        delete: () => ({
          eq: async (...args: unknown[]) => {
            calls.push({ op: 'delete', args });
            return { error: null };
          },
        }),
        upsert: async (...args: unknown[]) => {
          calls.push({ op: 'upsert', args });
          return { error: null };
        },
      };
      return chain;
    },
  },
}));
vi.mock('@/lib/currentUser', () => ({ getSessionUser: async () => ({ data: { user: { id: 'psi-1' } } }) }));

import { loadPrivateNote, savePrivateNote } from '@/lib/privateNotes';

beforeEach(() => {
  calls.length = 0;
});

describe('anotação privada do psicólogo', () => {
  it('lê da tabela separada do resumo', async () => {
    expect(await loadPrivateNote('a1')).toBe('só eu vejo');
    expect(calls[0]).toEqual({ op: 'from', args: ['appointment_private_notes'] });
  });

  it('grava com o psicólogo da sessão', async () => {
    await savePrivateNote('a1', '  observação  ');
    expect(calls.find((c) => c.op === 'upsert')?.args[0]).toEqual({
      appointment_id: 'a1',
      psychologist_id: 'psi-1',
      note: 'observação',
    });
  });

  it('anotação vazia apaga', async () => {
    await savePrivateNote('a1', '   ');
    expect(calls.some((c) => c.op === 'delete')).toBe(true);
    expect(calls.some((c) => c.op === 'upsert')).toBe(false);
  });
});

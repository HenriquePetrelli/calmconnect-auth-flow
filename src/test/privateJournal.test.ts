import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));

let todayCount = 0;
let insertResult: { data: unknown; error: unknown } = { data: null, error: null };
const insert = vi.fn();

// Cadeia mínima do cliente do Supabase usada por createEntry.
const chain = () => {
  const q: Record<string, unknown> = {};
  q.select = () => q;
  q.eq = () => q;
  q.gte = () => q;
  q.lt = () => Promise.resolve({ data: Array.from({ length: todayCount }, (_, i) => ({ id: String(i) })), error: null });
  q.insert = (row: unknown) => {
    insert(row);
    return { select: () => ({ single: () => Promise.resolve(insertResult) }) };
  };
  return q;
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: () => Promise.resolve({ data: { user: { id: 'u1' } } }) },
    from: () => chain(),
  },
}));

import { usePrivateJournal } from '@/hooks/usePrivateJournal';

describe('usePrivateJournal.createEntry', () => {
  beforeEach(() => {
    toast.mockClear();
    insert.mockClear();
    todayCount = 0;
    insertResult = { data: { id: 'n1', texto: 'oi', humor: 3 }, error: null };
  });

  it('com 2 anotações hoje, avisa uma vez só e não grava', async () => {
    todayCount = 2;
    const { result } = renderHook(() => usePrivateJournal());
    await act(async () => {
      await expect(result.current.createEntry('oi', 3)).rejects.toThrow(/Limite diário/);
    });
    expect(insert).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast.mock.calls[0][0]).toMatchObject({ title: 'Limite diário atingido' });
  });

  it('mostra a mensagem do banco quando o servidor recusa', async () => {
    insertResult = { data: null, error: { code: 'P0001', message: 'Limite diário de 2 anotações atingido. Tente novamente amanhã.' } };
    const { result } = renderHook(() => usePrivateJournal());
    await act(async () => {
      await expect(result.current.createEntry('oi', 3)).rejects.toBeTruthy();
    });
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast.mock.calls[0][0]).toMatchObject({ title: 'Limite diário atingido' });
  });

  it('grava quando ainda não chegou ao limite', async () => {
    todayCount = 1;
    const { result } = renderHook(() => usePrivateJournal());
    await act(async () => {
      await result.current.createEntry('oi', 3);
    });
    expect(insert).toHaveBeenCalledWith({ user_id: 'u1', texto: 'oi', humor: 3 });
    expect(result.current.entries).toHaveLength(1);
  });
});

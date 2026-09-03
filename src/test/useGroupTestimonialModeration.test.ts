import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { fakeDb, fakeSupabase } from './fakeSupabase';

vi.mock('@/integrations/supabase/client', () => ({ supabase: fakeSupabase }));

import { useGroupTestimonialModeration } from '@/hooks/useGroupTestimonialModeration';

const SAMPLE = [
  {
    testimonial_id: 't1',
    group_id: 'g1',
    group_nome: 'Ansiedade',
    autor_nome: 'Fulano',
    anonimo: false,
    texto: 'Depoimento normal',
    humor: 3,
    likes_positivos: 2,
    likes_negativos: 1,
    flagged: false,
    criado_em: new Date().toISOString(),
  },
  {
    testimonial_id: 't2',
    group_id: 'g1',
    group_nome: 'Ansiedade',
    autor_nome: null,
    anonimo: true,
    texto: 'Depoimento sinalizado',
    humor: 2,
    likes_positivos: 0,
    likes_negativos: 10,
    flagged: true,
    criado_em: new Date().toISOString(),
  },
];

beforeEach(() => {
  fakeDb.tables = {};
  fakeDb.writes = [];
  fakeDb.rpcHandlers = {
    get_admin_group_testimonials: () => ({ data: SAMPLE, error: null }),
    admin_update_testimonial: () => ({ data: null, error: null }),
    admin_delete_testimonial: () => ({ data: null, error: null }),
  };
});

describe('useGroupTestimonialModeration', () => {
  it('carrega os depoimentos, com o sinalizado (10+ não gostei) presente', async () => {
    const { result } = renderHook(() => useGroupTestimonialModeration());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.testimonials).toHaveLength(2);
    expect(result.current.testimonials.find((t) => t.testimonial_id === 't2')?.flagged).toBe(true);
  });

  it('editar chama a RPC certa com o novo texto e recarrega', async () => {
    const rpcSpy = vi.fn((params: any) => ({ data: null, error: null }));
    fakeDb.rpcHandlers.admin_update_testimonial = rpcSpy;

    const { result } = renderHook(() => useGroupTestimonialModeration());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok: boolean;
    await act(async () => {
      ok = await result.current.updateTestimonial('t1', 'Texto revisado');
    });

    expect(ok!).toBe(true);
    expect(rpcSpy).toHaveBeenCalledWith(expect.anything(), {
      p_testimonial_id: 't1',
      p_texto: 'Texto revisado',
    });
  });

  it('excluir chama a RPC certa e recarrega', async () => {
    const rpcSpy = vi.fn(() => ({ data: null, error: null }));
    fakeDb.rpcHandlers.admin_delete_testimonial = rpcSpy;

    const { result } = renderHook(() => useGroupTestimonialModeration());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok: boolean;
    await act(async () => {
      ok = await result.current.deleteTestimonial('t2');
    });

    expect(ok!).toBe(true);
    expect(rpcSpy).toHaveBeenCalledWith(expect.anything(), { p_testimonial_id: 't2' });
  });

  it('erro na RPC de exclusão não derruba o hook e mantém savingId consistente', async () => {
    fakeDb.rpcHandlers.admin_delete_testimonial = () => ({ data: null, error: { message: 'boom' } });

    const { result } = renderHook(() => useGroupTestimonialModeration());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok: boolean;
    await act(async () => {
      ok = await result.current.deleteTestimonial('t1');
    });

    expect(ok!).toBe(false);
    expect(result.current.savingId).toBeNull();
  });
});

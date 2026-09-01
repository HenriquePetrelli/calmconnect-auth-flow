import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { fakeDb, fakeSupabase } from './fakeSupabase';

vi.mock('@/integrations/supabase/client', () => ({ supabase: fakeSupabase }));

// Referência estável — um objeto novo a cada render faria efeitos que
// dependem de `user` entrarem em loop.
const mockUser = { id: '22222222-2222-2222-2222-222222222222' };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));

import { usePsychologistVacation } from '@/hooks/usePsychologistVacation';

const PSYCHOLOGIST = mockUser.id;

const isoOf = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Dias a partir de hoje (real, sem mockar o relógio — a lógica do hook
 * usa `new Date()` diretamente, então os fixtures são relativos a hoje). */
const daysFromToday = (offset: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d;
};

beforeEach(() => {
  fakeDb.tables = {};
  fakeDb.writes = [];
});

describe('usePsychologistVacation', () => {
  it('sem férias cadastrada, activeVacation e upcomingVacation são null', async () => {
    const { result } = renderHook(() => usePsychologistVacation());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.activeVacation).toBeNull();
    expect(result.current.upcomingVacation).toBeNull();
  });

  it('identifica férias ativa quando hoje está dentro do intervalo', async () => {
    fakeDb.rows('psychologist_vacations').push({
      id: 'vac-active',
      psychologist_id: PSYCHOLOGIST,
      start_date: isoOf(daysFromToday(-2)),
      end_date: isoOf(daysFromToday(5)),
    });

    const { result } = renderHook(() => usePsychologistVacation());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.activeVacation?.id).toBe('vac-active');
    expect(result.current.upcomingVacation).toBeNull();
  });

  it('férias futura vira upcomingVacation, não activeVacation', async () => {
    fakeDb.rows('psychologist_vacations').push({
      id: 'vac-future',
      psychologist_id: PSYCHOLOGIST,
      start_date: isoOf(daysFromToday(10)),
      end_date: isoOf(daysFromToday(20)),
    });

    const { result } = renderHook(() => usePsychologistVacation());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.activeVacation).toBeNull();
    expect(result.current.upcomingVacation?.id).toBe('vac-future');
  });

  it('setVacation substitui uma férias ainda não encerrada pelo novo período', async () => {
    fakeDb.rows('psychologist_vacations').push({
      id: 'vac-old',
      psychologist_id: PSYCHOLOGIST,
      start_date: isoOf(daysFromToday(10)),
      end_date: isoOf(daysFromToday(20)),
    });

    const { result } = renderHook(() => usePsychologistVacation());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const newStart = isoOf(daysFromToday(60));
    const newEnd = isoOf(daysFromToday(75));

    await act(async () => {
      const ok = await result.current.setVacation(newStart, newEnd);
      expect(ok).toBe(true);
    });

    await waitFor(() => expect(result.current.vacations).toHaveLength(1));
    expect(result.current.vacations[0]).toMatchObject({ start_date: newStart, end_date: newEnd });
  });

  it('setVacation rejeita datas inválidas e não grava nada', async () => {
    const { result } = renderHook(() => usePsychologistVacation());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      const ok = await result.current.setVacation(isoOf(daysFromToday(20)), isoOf(daysFromToday(10)));
      expect(ok).toBe(false);
    });

    expect(result.current.vacations).toEqual([]);
  });

  it('cancelVacation remove férias ativa/futura mas preserva férias já passadas', async () => {
    fakeDb.rows('psychologist_vacations').push(
      {
        id: 'vac-past',
        psychologist_id: PSYCHOLOGIST,
        start_date: isoOf(daysFromToday(-40)),
        end_date: isoOf(daysFromToday(-35)),
      },
      {
        id: 'vac-active',
        psychologist_id: PSYCHOLOGIST,
        start_date: isoOf(daysFromToday(-2)),
        end_date: isoOf(daysFromToday(5)),
      }
    );

    const { result } = renderHook(() => usePsychologistVacation());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      const ok = await result.current.cancelVacation();
      expect(ok).toBe(true);
    });

    await waitFor(() => expect(result.current.vacations.map((v) => v.id)).toEqual(['vac-past']));
    expect(result.current.activeVacation).toBeNull();
  });
});

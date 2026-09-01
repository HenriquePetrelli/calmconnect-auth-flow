import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { fakeDb, fakeSupabase } from './fakeSupabase';

vi.mock('@/integrations/supabase/client', () => ({ supabase: fakeSupabase }));

import { useAvailableTimeSlots } from '@/hooks/useAvailableTimeSlots';

const PSYCHOLOGIST = '22222222-2222-2222-2222-222222222222';

// A Monday, so day_of_week === 1 regardless of the host machine's timezone
// (constructed from local Y/M/D so .getDay() matches the intent of the test).
const MONDAY = new Date(2026, 8, 7); // 2026-09-07 is a Monday
const SUNDAY = new Date(2026, 8, 6); // day before, a Sunday

beforeEach(() => {
  fakeDb.tables = {};
  fakeDb.writes = [];
});

describe('useAvailableTimeSlots — respeita a agenda semanal do psicólogo', () => {
  it('não oferece nenhum horário quando o psicólogo não configurou disponibilidade', async () => {
    const { result } = renderHook(() =>
      useAvailableTimeSlots({ psychologistId: PSYCHOLOGIST, selectedDate: MONDAY })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.hasAnyAvailability).toBe(false);
    expect(result.current.allTimeSlots).toEqual([]);
  });

  it('só gera horários dentro dos blocos configurados para o dia da semana selecionado', async () => {
    fakeDb.rows('psychologist_availability').push(
      { psychologist_id: PSYCHOLOGIST, day_of_week: 1, start_time: '08:00:00', end_time: '09:00:00', is_available: true },
      { psychologist_id: PSYCHOLOGIST, day_of_week: 2, start_time: '10:00:00', end_time: '18:00:00', is_available: true }
    );

    const { result } = renderHook(() =>
      useAvailableTimeSlots({ psychologistId: PSYCHOLOGIST, selectedDate: MONDAY })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.hasAnyAvailability).toBe(true);
    // Bloco de 08:00-09:00 (60min) só cabe UM horário de 50min: 08:00.
    // 08:10 já não cabe (08:10+50=09:00, ok na verdade cabe exatamente) -> vamos conferir os limites certos.
    expect(result.current.allTimeSlots).toEqual(['08:00', '08:10']);
  });

  it('não considera domingo disponível quando só há bloco configurado na segunda', async () => {
    fakeDb.rows('psychologist_availability').push({
      psychologist_id: PSYCHOLOGIST,
      day_of_week: 1,
      start_time: '08:00:00',
      end_time: '18:00:00',
      is_available: true,
    });

    const { result } = renderHook(() =>
      useAvailableTimeSlots({ psychologistId: PSYCHOLOGIST, selectedDate: SUNDAY })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.allTimeSlots).toEqual([]);
    expect(result.current.isDayAvailable(MONDAY)).toBe(true);
    expect(result.current.isDayAvailable(SUNDAY)).toBe(false);
  });

  it('ignora blocos marcados como is_available = false', async () => {
    fakeDb.rows('psychologist_availability').push({
      psychologist_id: PSYCHOLOGIST,
      day_of_week: 1,
      start_time: '08:00:00',
      end_time: '18:00:00',
      is_available: false,
    });

    const { result } = renderHook(() =>
      useAvailableTimeSlots({ psychologistId: PSYCHOLOGIST, selectedDate: MONDAY })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.hasAnyAvailability).toBe(false);
    expect(result.current.allTimeSlots).toEqual([]);
  });

  it('remove da disponibilidade os horários ocupados por outra consulta já marcada, mantendo o resto do bloco livre', async () => {
    fakeDb.rows('psychologist_availability').push({
      psychologist_id: PSYCHOLOGIST,
      day_of_week: 1,
      start_time: '08:00:00',
      end_time: '10:00:00',
      is_available: true,
    });
    // Consulta de 50min às 08:00 ocupa 08:00–08:40 (em passos de 10min).
    fakeDb.rows('appointments').push({
      psychologist_id: PSYCHOLOGIST,
      status: 'scheduled',
      duration: 50,
      scheduled_at: new Date(MONDAY.getFullYear(), MONDAY.getMonth(), MONDAY.getDate(), 8, 0).toISOString(),
    });

    const { result } = renderHook(() =>
      useAvailableTimeSlots({ psychologistId: PSYCHOLOGIST, selectedDate: MONDAY })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isSlotAvailable('08:00')).toBe(false);
    expect(result.current.isSlotAvailable('08:50')).toBe(true);
    expect(result.current.availableSlots).not.toContain('08:00');
    expect(result.current.availableSlots).toContain('08:50');
  });

  it('um bloqueio pontual do psicólogo some do agendamento do paciente nessa data', async () => {
    fakeDb.rows('psychologist_availability').push({
      psychologist_id: PSYCHOLOGIST,
      day_of_week: 1,
      start_time: '08:00:00',
      end_time: '18:00:00',
      is_available: true,
    });
    const mondayISO = `${MONDAY.getFullYear()}-${String(MONDAY.getMonth() + 1).padStart(2, '0')}-${String(MONDAY.getDate()).padStart(2, '0')}`;
    fakeDb.rows('psychologist_availability_overrides').push({
      psychologist_id: PSYCHOLOGIST,
      date: mondayISO,
      start_time: '12:00:00',
      end_time: '13:00:00',
      type: 'bloqueio',
    });

    const { result } = renderHook(() =>
      useAvailableTimeSlots({ psychologistId: PSYCHOLOGIST, selectedDate: MONDAY })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.allTimeSlots).not.toContain('12:00');
    expect(result.current.allTimeSlots).toContain('11:00');
    expect(result.current.allTimeSlots).toContain('13:00');
  });

  it('dias dentro de um período de férias ficam sem nenhum horário, mesmo com horário-padrão configurado', async () => {
    fakeDb.rows('psychologist_availability').push({
      psychologist_id: PSYCHOLOGIST,
      day_of_week: 1,
      start_time: '08:00:00',
      end_time: '18:00:00',
      is_available: true,
    });
    const mondayISO = `${MONDAY.getFullYear()}-${String(MONDAY.getMonth() + 1).padStart(2, '0')}-${String(MONDAY.getDate()).padStart(2, '0')}`;
    fakeDb.rows('psychologist_vacations').push({
      psychologist_id: PSYCHOLOGIST,
      start_date: mondayISO,
      end_date: mondayISO,
    });

    const { result } = renderHook(() =>
      useAvailableTimeSlots({ psychologistId: PSYCHOLOGIST, selectedDate: MONDAY })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isDayAvailable(MONDAY)).toBe(false);
    expect(result.current.allTimeSlots).toEqual([]);
  });

  it('um horário extra aberto pelo psicólogo aparece disponível mesmo num dia sem horário-padrão', async () => {
    // Nenhum bloco padrão cadastrado para nenhum dia -> hasAnyAvailability seria false,
    // mas uma abertura pontual no domingo deve tornar o domingo reservável.
    const sundayISO = `${SUNDAY.getFullYear()}-${String(SUNDAY.getMonth() + 1).padStart(2, '0')}-${String(SUNDAY.getDate()).padStart(2, '0')}`;
    fakeDb.rows('psychologist_availability_overrides').push({
      psychologist_id: PSYCHOLOGIST,
      date: sundayISO,
      start_time: '09:00:00',
      end_time: '10:00:00',
      type: 'abertura',
    });

    const { result } = renderHook(() =>
      useAvailableTimeSlots({ psychologistId: PSYCHOLOGIST, selectedDate: SUNDAY })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.hasAnyAvailability).toBe(true);
    expect(result.current.isDayAvailable(SUNDAY)).toBe(true);
    expect(result.current.allTimeSlots).toEqual(['09:00', '09:10']);
  });
});

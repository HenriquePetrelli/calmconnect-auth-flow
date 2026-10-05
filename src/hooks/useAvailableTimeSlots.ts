import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { addDays } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import {
  applyOverridesToDayBlocks,
  timeToMinutes,
  minutesToTime,
  type AvailabilityOverride,
  type EditableBlock,
} from '@/lib/psychologistAvailability';
import {
  DEFAULT_BOOKING_RULES,
  isSlotFree,
  lastBookableDay,
  normalizeRules,
  respectsMinNotice,
  type BookingRules,
  type ExistingAppointment,
} from '@/lib/bookingRules';

interface UseAvailableTimeSlotsProps {
  psychologistId: string;
  selectedDate: Date | undefined;
}

const APPOINTMENT_DURATION_MIN = 50;
const SLOT_STEP_MIN = 10;
/** Upper bound for what's fetched; each psychologist's own max_advance_days narrows it. */
const BOOKING_WINDOW_DAYS = 90;

/** A agenda do psicólogo e o horário gravado na consulta são de Brasília
 * (AppointmentForm e as edge functions usam o mesmo fuso). */
const BOOKING_TIME_ZONE = 'America/Sao_Paulo';

const toISODate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** "Agora" com os campos (dia, hora) de Brasília, qualquer que seja o fuso do aparelho. */
const brazilNow = (): Date => toZonedTime(new Date(), BOOKING_TIME_ZONE);

/** Instante real de um dia do calendário + "HH:MM" no horário de Brasília. */
const brazilInstantMs = (day: Date, time = '00:00'): number => {
  const [h, m] = time.split(':').map(Number);
  return fromZonedTime(new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m), BOOKING_TIME_ZONE).getTime();
};

/** Every slot start, at SLOT_STEP_MIN granularity, that leaves enough room
 * for a full APPOINTMENT_DURATION_MIN session inside the block. */
const slotsWithinBlock = (block: EditableBlock): string[] => {
  const slots: string[] = [];
  const end = timeToMinutes(block.end_time);
  for (let start = timeToMinutes(block.start_time); start + APPOINTMENT_DURATION_MIN <= end; start += SLOT_STEP_MIN) {
    slots.push(minutesToTime(start));
  }
  return slots;
};

export const useAvailableTimeSlots = ({ psychologistId, selectedDate }: UseAvailableTimeSlotsProps) => {
  const [availabilityByDay, setAvailabilityByDay] = useState<Record<number, EditableBlock[]>>({});
  const [overridesByDate, setOverridesByDate] = useState<Record<string, AvailabilityOverride[]>>({});
  const [vacationRanges, setVacationRanges] = useState<Array<{ start_date: string; end_date: string }>>([]);
  const [hasAnyAvailability, setHasAnyAvailability] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(true);
  const [dayAppointments, setDayAppointments] = useState<ExistingAppointment[]>([]);
  const [rules, setRules] = useState<BookingRules>(DEFAULT_BOOKING_RULES);
  const [loading, setLoading] = useState(false);

  // Busca a agenda semanal (padrão) + exceções pontuais dos próximos 30 dias,
  // uma vez por psicólogo selecionado.
  const fetchAvailability = useCallback(async (psychId: string) => {
    if (!psychId) return;
    setLoadingAvailability(true);
    try {
      const today = toISODate(brazilNow());
      const windowEnd = toISODate(addDays(brazilNow(), BOOKING_WINDOW_DAYS));

      const [
        { data: baseRows, error: baseError },
        { data: overrideRows, error: overrideError },
        { data: vacationRows, error: vacationError },
        { data: rulesRow },
      ] = await Promise.all([
        supabase
          .from('psychologist_availability')
          .select('day_of_week, start_time, end_time')
          .eq('psychologist_id', psychId)
          .eq('is_available', true),
        supabase
          .from('psychologist_availability_overrides')
          .select('date, start_time, end_time, type')
          .eq('psychologist_id', psychId)
          .gte('date', today)
          .lte('date', windowEnd),
        supabase
          .from('psychologist_vacations')
          .select('start_date, end_date')
          .eq('psychologist_id', psychId)
          .gte('end_date', today)
          .lte('start_date', windowEnd),
        supabase
          .from('psychologist_booking_rules')
          .select('buffer_minutes, min_notice_hours, max_advance_days')
          .eq('psychologist_id', psychId)
          .maybeSingle(),
      ]);
      setRules(normalizeRules(rulesRow));

      if (baseError) throw baseError;
      if (overrideError) throw overrideError;
      if (vacationError) throw vacationError;

      const byDay: Record<number, EditableBlock[]> = {};
      (baseRows ?? []).forEach((row) => {
        const block = { start_time: row.start_time.slice(0, 5), end_time: row.end_time.slice(0, 5) };
        byDay[row.day_of_week] = [...(byDay[row.day_of_week] ?? []), block];
      });
      setAvailabilityByDay(byDay);

      const byDate: Record<string, AvailabilityOverride[]> = {};
      (overrideRows ?? []).forEach((row) => {
        const entry: AvailabilityOverride = {
          start_time: row.start_time.slice(0, 5),
          end_time: row.end_time.slice(0, 5),
          type: row.type as AvailabilityOverride['type'],
        };
        byDate[row.date] = [...(byDate[row.date] ?? []), entry];
      });
      setOverridesByDate(byDate);
      setVacationRanges(vacationRows ?? []);

      const hasBase = (baseRows ?? []).length > 0;
      const hasExtraOpening = (overrideRows ?? []).some((r) => r.type === 'abertura');
      setHasAnyAvailability(hasBase || hasExtraOpening);
    } catch (error) {
      console.error('Error fetching psychologist availability:', error);
      setAvailabilityByDay({});
      setOverridesByDate({});
      setVacationRanges([]);
      setHasAnyAvailability(false);
    } finally {
      setLoadingAvailability(false);
    }
  }, []);

  useEffect(() => {
    if (psychologistId) {
      void fetchAvailability(psychologistId);
    }
  }, [psychologistId, fetchAvailability]);

  // Horários que já ocupam a agenda do psicólogo nesse dia, de todos os
  // pacientes (com uma folga de 2h para os lados, para o intervalo entre
  // consultas). O paciente só lê as próprias consultas, então a lista vem da
  // função get_psychologist_busy_times, que devolve só início e duração.
  const fetchDayAppointments = async (date: Date, psychId: string) => {
    if (!date || !psychId) return;

    try {
      setLoading(true);
      const dayStart = brazilInstantMs(date);
      const from = new Date(dayStart - 2 * 60 * 60_000);
      const to = new Date(dayStart + 26 * 60 * 60_000);

      const { data, error } = await supabase.rpc('get_psychologist_busy_times', {
        p_psychologist_id: psychId,
        p_from: from.toISOString(),
        p_to: to.toISOString(),
      });

      if (error) {
        console.error('Error fetching occupied slots:', error);
        return;
      }
      setDayAppointments(
        ((data ?? []) as { starts_at: string; duration_minutes: number }[]).map((row) => ({
          scheduled_at: row.starts_at,
          duration: row.duration_minutes,
        }))
      );
    } catch (error) {
      console.error('Error fetching occupied slots:', error);
      setDayAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const slotStartMs = (date: Date, time: string): number => brazilInstantMs(date, time);

  // Um horário está disponível se não encosta em nenhuma consulta existente
  // (respeitando o intervalo definido pelo psicólogo) e se respeita a
  // antecedência mínima.
  const isSlotAvailable = (timeSlot: string): boolean => {
    if (!selectedDate) return false;
    const start = slotStartMs(selectedDate, timeSlot);
    return (
      respectsMinNotice(start, rules) &&
      isSlotFree(start, APPOINTMENT_DURATION_MIN, dayAppointments, rules.buffer_minutes)
    );
  };

  /** Horário-padrão do dia da semana, já combinado com bloqueios/aberturas daquela data específica. */
  const effectiveBlocksForDate = (date: Date): EditableBlock[] => {
    const iso = toISODate(date);
    if (iso < toISODate(brazilNow()) || date.getTime() > lastBookableDay(rules, brazilNow()).getTime()) return [];
    if (vacationRanges.some((v) => v.start_date <= iso && iso <= v.end_date)) return [];
    const dayBlocks = availabilityByDay[date.getDay()] ?? [];
    const overrides = overridesByDate[iso] ?? [];
    return applyOverridesToDayBlocks(dayBlocks, overrides);
  };

  // Todo dia com pelo menos um horário efetivo (padrão semanal ± exceções daquela data)
  const isDayAvailable = (date: Date): boolean => effectiveBlocksForDate(date).length > 0;

  // Slots do dia selecionado, já considerando bloqueios/aberturas daquele dia
  const getAllSlotsForSelectedDate = (): string[] => {
    if (!selectedDate) return [];
    return effectiveBlocksForDate(selectedDate).flatMap(slotsWithinBlock).sort();
  };

  // Buscar quando a data ou psicólogo mudarem
  useEffect(() => {
    if (selectedDate && psychologistId) {
      fetchDayAppointments(selectedDate, psychologistId);
    } else {
      setDayAppointments([]);
    }
  }, [selectedDate, psychologistId]);

  const allTimeSlots = getAllSlotsForSelectedDate();
  const occupiedSlots = allTimeSlots.filter((t) => !isSlotAvailable(t));

  return {
    allTimeSlots,
    occupiedSlots,
    availableSlots: allTimeSlots.filter(isSlotAvailable),
    loading: loading || loadingAvailability,
    isSlotAvailable,
    hasAnyAvailability,
    isDayAvailable,
    refetch: () => {
      if (selectedDate && psychologistId) {
        fetchDayAppointments(selectedDate, psychologistId);
      }
    }
  };
};

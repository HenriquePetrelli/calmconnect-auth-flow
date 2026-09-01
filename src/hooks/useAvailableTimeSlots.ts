import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, addMinutes, addDays, parseISO, startOfDay, endOfDay } from 'date-fns';
import {
  applyOverridesToDayBlocks,
  timeToMinutes,
  minutesToTime,
  type AvailabilityOverride,
  type EditableBlock,
} from '@/lib/psychologistAvailability';

interface UseAvailableTimeSlotsProps {
  psychologistId: string;
  selectedDate: Date | undefined;
}

const APPOINTMENT_DURATION_MIN = 50;
const SLOT_STEP_MIN = 10;
const BOOKING_WINDOW_DAYS = 30;

const toISODate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

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
  const [hasAnyAvailability, setHasAnyAvailability] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(true);
  const [occupiedSlots, setOccupiedSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Busca a agenda semanal (padrão) + exceções pontuais dos próximos 30 dias,
  // uma vez por psicólogo selecionado.
  const fetchAvailability = useCallback(async (psychId: string) => {
    if (!psychId) return;
    setLoadingAvailability(true);
    try {
      const today = toISODate(new Date());
      const windowEnd = toISODate(addDays(new Date(), BOOKING_WINDOW_DAYS));

      const [{ data: baseRows, error: baseError }, { data: overrideRows, error: overrideError }] = await Promise.all([
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
      ]);

      if (baseError) throw baseError;
      if (overrideError) throw overrideError;

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

      const hasBase = (baseRows ?? []).length > 0;
      const hasExtraOpening = (overrideRows ?? []).some((r) => r.type === 'abertura');
      setHasAnyAvailability(hasBase || hasExtraOpening);
    } catch (error) {
      console.error('Error fetching psychologist availability:', error);
      setAvailabilityByDay({});
      setOverridesByDate({});
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

  // Buscar horários ocupados do psicólogo para uma data específica
  const fetchOccupiedSlots = async (date: Date, psychId: string) => {
    if (!date || !psychId) return;

    try {
      setLoading(true);

      // Converter data para o início e fim do dia (considerando o fuso horário do usuário)
      const startOfDayBrazil = startOfDay(date);
      const endOfDayBrazil = endOfDay(date);

      // Buscar consultas agendadas e pendentes do psicólogo para essa data
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('scheduled_at, duration')
        .eq('psychologist_id', psychId)
        .in('status', ['scheduled', 'pending'])
        .gte('scheduled_at', startOfDayBrazil.toISOString())
        .lte('scheduled_at', endOfDayBrazil.toISOString());

      if (error) {
        console.error('Error fetching occupied slots:', error);
        return;
      }

      if (!appointments || appointments.length === 0) {
        setOccupiedSlots([]);
        return;
      }

      // Processar horários ocupados
      const occupied: string[] = [];

      appointments.forEach(appointment => {
        const appointmentTime = parseISO(appointment.scheduled_at);
        const duration = appointment.duration || 50; // Duração padrão de 50 minutos

        // Para uma consulta de 50 minutos, ocupar slots de 10 em 10 minutos
        const startTimeSlot = format(appointmentTime, 'HH:mm');
        occupied.push(startTimeSlot);

        // Calcular quantos slots de 10 minutos a consulta ocupa
        const slotsToOccupy = Math.ceil(duration / 10);

        for (let i = 1; i < slotsToOccupy; i++) {
          const nextSlotTime = addMinutes(appointmentTime, i * 10);
          const nextTimeSlot = format(nextSlotTime, 'HH:mm');
          occupied.push(nextTimeSlot);
        }
      });

      setOccupiedSlots([...new Set(occupied)]); // Remove duplicatas
    } catch (error) {
      console.error('Error fetching occupied slots:', error);
      setOccupiedSlots([]);
    } finally {
      setLoading(false);
    }
  };

  // Verificar se um slot específico está disponível
  const isSlotAvailable = (timeSlot: string): boolean => {
    return !occupiedSlots.includes(timeSlot);
  };

  /** Horário-padrão do dia da semana, já combinado com bloqueios/aberturas daquela data específica. */
  const effectiveBlocksForDate = (date: Date): EditableBlock[] => {
    const dayBlocks = availabilityByDay[date.getDay()] ?? [];
    const overrides = overridesByDate[toISODate(date)] ?? [];
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
      fetchOccupiedSlots(selectedDate, psychologistId);
    } else {
      setOccupiedSlots([]);
    }
  }, [selectedDate, psychologistId]);

  const allTimeSlots = getAllSlotsForSelectedDate();

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
        fetchOccupiedSlots(selectedDate, psychologistId);
      }
    }
  };
};

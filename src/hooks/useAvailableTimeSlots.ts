import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, addMinutes, parseISO, startOfDay, endOfDay } from 'date-fns';

interface UseAvailableTimeSlotsProps {
  psychologistId: string;
  selectedDate: Date | undefined;
}

const APPOINTMENT_DURATION_MIN = 50;
const SLOT_STEP_MIN = 10;

interface DayBlock {
  start: string;
  end: string;
}

const toMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const toTimeString = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/** Every slot start, at SLOT_STEP_MIN granularity, that leaves enough room
 * for a full APPOINTMENT_DURATION_MIN session inside the block. */
const slotsWithinBlock = (block: DayBlock): string[] => {
  const slots: string[] = [];
  const end = toMinutes(block.end);
  for (let start = toMinutes(block.start); start + APPOINTMENT_DURATION_MIN <= end; start += SLOT_STEP_MIN) {
    slots.push(toTimeString(start));
  }
  return slots;
};

export const useAvailableTimeSlots = ({ psychologistId, selectedDate }: UseAvailableTimeSlotsProps) => {
  const [availabilityByDay, setAvailabilityByDay] = useState<Record<number, DayBlock[]>>({});
  const [hasAnyAvailability, setHasAnyAvailability] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(true);
  const [occupiedSlots, setOccupiedSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Busca a agenda semanal completa do psicólogo (uma vez por psicólogo selecionado).
  const fetchAvailability = useCallback(async (psychId: string) => {
    if (!psychId) return;
    setLoadingAvailability(true);
    try {
      const { data, error } = await supabase
        .from('psychologist_availability')
        .select('day_of_week, start_time, end_time')
        .eq('psychologist_id', psychId)
        .eq('is_available', true);

      if (error) throw error;

      const byDay: Record<number, DayBlock[]> = {};
      (data ?? []).forEach((row) => {
        const block = { start: row.start_time.slice(0, 5), end: row.end_time.slice(0, 5) };
        byDay[row.day_of_week] = [...(byDay[row.day_of_week] ?? []), block];
      });
      setAvailabilityByDay(byDay);
      setHasAnyAvailability((data ?? []).length > 0);
    } catch (error) {
      console.error('Error fetching psychologist availability:', error);
      setAvailabilityByDay({});
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

  // Todo dia da semana com pelo menos um bloco de disponibilidade configurado
  const isDayAvailable = (date: Date): boolean => (availabilityByDay[date.getDay()] ?? []).length > 0;

  // Slots do dia selecionado, derivados só dos blocos de disponibilidade reais do psicólogo
  const getAllSlotsForSelectedDate = (): string[] => {
    if (!selectedDate) return [];
    const dayBlocks = availabilityByDay[selectedDate.getDay()] ?? [];
    return dayBlocks.flatMap(slotsWithinBlock).sort();
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

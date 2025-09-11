import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, addMinutes, parseISO, startOfDay, endOfDay } from 'date-fns';

interface UseAvailableTimeSlotsProps {
  psychologistId: string;
  selectedDate: Date | undefined;
}

export const useAvailableTimeSlots = ({ psychologistId, selectedDate }: UseAvailableTimeSlotsProps) => {
  const [occupiedSlots, setOccupiedSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Gerar todos os slots de 30 em 30 minutos das 07:00 às 18:00
  const generateAllTimeSlots = (): string[] => {
    const slots = [];
    for (let hour = 7; hour <= 18; hour++) {
      if (hour === 18) {
        slots.push('18:00'); // Último slot às 18h
        break;
      }
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  };

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
        
        // Ocupar o slot inicial
        const startTimeSlot = format(appointmentTime, 'HH:mm');
        occupied.push(startTimeSlot);
        
        // Para consulta de 50 minutos, ocupar também o próximo slot de 30 minutos
        const nextSlotTime = addMinutes(appointmentTime, 30);
        const nextTimeSlot = format(nextSlotTime, 'HH:mm');
        occupied.push(nextTimeSlot);
        
        // Se a duração for maior que 50 min, ocupar slots adicionais
        if (duration > 50) {
          const additionalSlots = Math.ceil((duration - 50) / 30);
          for (let i = 1; i <= additionalSlots; i++) {
            const additionalSlotTime = addMinutes(appointmentTime, 30 + (i * 30));
            const additionalTimeSlot = format(additionalSlotTime, 'HH:mm');
            occupied.push(additionalTimeSlot);
          }
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

  // Obter slots disponíveis para uma data
  const getAvailableSlots = (): string[] => {
    const allSlots = generateAllTimeSlots();
    return allSlots.filter(slot => isSlotAvailable(slot));
  };

  // Buscar quando a data ou psicólogo mudarem
  useEffect(() => {
    if (selectedDate && psychologistId) {
      fetchOccupiedSlots(selectedDate, psychologistId);
    } else {
      setOccupiedSlots([]);
    }
  }, [selectedDate, psychologistId]);

  return {
    allTimeSlots: generateAllTimeSlots(),
    occupiedSlots,
    availableSlots: getAvailableSlots(),
    loading,
    isSlotAvailable,
    refetch: () => {
      if (selectedDate && psychologistId) {
        fetchOccupiedSlots(selectedDate, psychologistId);
      }
    }
  };
};
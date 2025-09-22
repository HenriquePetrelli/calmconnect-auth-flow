import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Appointment } from '@/hooks/useAppointments';

export const useAppointmentVideoCall = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const canJoinCall = useCallback((appointment: Appointment): boolean => {
    if (!['scheduled', 'confirmed'].includes(appointment.status)) {
      return false;
    }

    const appointmentTime = new Date(appointment.scheduled_at);
    const now = new Date();
    
    // Allow joining from the exact scheduled time
    return now >= appointmentTime;
  }, []);

  const startConsultation = useCallback(async (appointmentId: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('appointments')
        .update({ status: 'in_progress' })
        .eq('id', appointmentId)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Consulta iniciada',
        description: 'Conectando à videochamada...',
      });

      return data;
    } catch (error: any) {
      console.error('Error starting consultation:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao iniciar consulta',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const endConsultation = useCallback(async (appointmentId: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('appointments')
        .update({ 
          status: 'completed',
          // TODO: Add session summary if needed
        })
        .eq('id', appointmentId)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Consulta finalizada',
        description: 'Consulta encerrada com sucesso.',
      });

      return data;
    } catch (error: any) {
      console.error('Error ending consultation:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao finalizar consulta',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    loading,
    canJoinCall,
    startConsultation,
    endConsultation,
  };
};
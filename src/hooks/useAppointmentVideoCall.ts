import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getFriendlyErrorMessage } from '@/utils/errorMessage';
import { Appointment } from '@/hooks/useAppointments';
import { canJoinConsultation } from '@/lib/consultationWindow';

export const useAppointmentVideoCall = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Opens 10 min before the start and stays open until 15 min after the
  // end, including while in_progress so a dropped participant can rejoin.
  const canJoinCall = useCallback((appointment: Appointment): boolean => canJoinConsultation(appointment), []);

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

      return data;
    } catch (error: any) {
      console.error('Error starting consultation:', error);
      toast({
        title: 'Erro',
        description: getFriendlyErrorMessage(error, 'Não foi possível iniciar a consulta.'),
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
      
      // Session summary is added later by the psychologist from ConsultationHistory,
      // not captured at end-of-call time.
      const { data, error } = await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', appointmentId)
        .select()
        .single();

      if (error) throw error;

      toast({ title: 'Consulta finalizada' });

      return data;
    } catch (error: any) {
      console.error('Error ending consultation:', error);
      toast({
        title: 'Erro',
        description: getFriendlyErrorMessage(error, 'Não foi possível finalizar a consulta.'),
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
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Appointment {
  id: string;
  scheduled_at: string;
  status: string;
  appointment_type: string;
  notes?: string;
  session_summary?: string;
  psychologist: {
    full_name: string;
    specialty?: string;
    professional_email?: string;
  };
}

export interface Psychologist {
  user_id: string;
  full_name: string;
  specialty?: string;
}

export const useAppointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [psychologists, setPsychologists] = useState<Psychologist[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('appointments');
      
      if (error) throw error;
      
      setAppointments(data || []);
    } catch (error: any) {
      console.error('Error fetching appointments:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar consultas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPsychologists = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('appointments', {
        body: null,
        method: 'GET',
      });
      
      if (error) throw error;
      
      // We'll need to modify the function to handle this properly
      const { data: psychologistsData } = await supabase
        .from('profiles')
        .select('user_id, full_name, specialty')
        .eq('user_type', 'psychologist')
        .eq('registration_status', 'approved');
        
      setPsychologists(psychologistsData || []);
    } catch (error: any) {
      console.error('Error fetching psychologists:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar psicólogos',
        variant: 'destructive',
      });
    }
  };

  const createAppointment = async (
    psychologist_id: string, 
    scheduled_at: string, 
    notes?: string
  ) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('appointments', {
        body: {
          psychologist_id,
          scheduled_at,
          notes,
        },
      });
      
      if (error) throw error;
      
      toast({
        title: 'Sucesso',
        description: data.message || 'Consulta agendada com sucesso!',
      });
      
      await fetchAppointments();
      return data.appointment;
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao agendar consulta',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointmentHistory = async (page = 1, limit = 10) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('appointments', {
        body: null,
        method: 'GET',
      });
      
      if (error) throw error;
      
      // For now, return the same data. We'll improve this with proper pagination
      return data || [];
    } catch (error: any) {
      console.error('Error fetching appointment history:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar histórico',
        variant: 'destructive',
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchPsychologists();
  }, []);

  return {
    appointments,
    psychologists,
    loading,
    fetchAppointments,
    fetchPsychologists,
    createAppointment,
    fetchAppointmentHistory,
  };
};
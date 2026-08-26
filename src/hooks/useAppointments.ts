import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Appointment {
  id: string;
  scheduled_at: string;
  status: string;
  appointment_type: string;
  duration?: number;
  notes?: string;
  session_summary?: string;
  rating?: number;
  proposed_scheduled_at?: string;
  proposal_notes?: string;
  psychologist: {
    full_name: string;
    specialty?: string;
    specialization?: string;
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
      
      const { data, error } = await supabase.functions.invoke('appointments', {
        method: 'GET'
      });
      
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
      const { data, error } = await supabase.functions.invoke('appointments?action=psychologists', {
        method: 'GET'
      });
      
      if (error) throw error;
      
      if (data) {
        setPsychologists(data || []);
        return;
      }
      
      // Fallback: get directly from psychologists table
      const { data: psychologistsData } = await supabase
        .from('psychologists')
        .select('user_id, full_name, specialization')
        .eq('approved', true)
        .eq('approval_status', 'approved');
        
      setPsychologists(psychologistsData?.map(p => ({
        user_id: p.user_id,
        full_name: p.full_name,
        specialty: p.specialization
      })) || []);
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
    duration = 60,
    type = 'regular',
    notes?: string
  ) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('appointments', {
        body: {
          psychologist_id,
          scheduled_at,
          duration,
          appointment_type: type,
          notes,
        },
      });
      
      if (error) throw error;
      
      toast({
        title: 'Sucesso',
        description: data.message || 'Consulta solicitada com sucesso! Aguardando confirmação do psicólogo.',
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
      
      // Call the appointments function with history action and pagination
      try {
        const response = await fetch(`https://ihrrgmmsfuvlasmzdmwf.supabase.co/functions/v1/appointments?action=history&page=${page}&limit=${limit}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlocnJnbW1zZnV2bGFzbXpkbXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1NDMzMDcsImV4cCI6MjA2OTExOTMwN30.6hRDCL5alu-Bs4kT4jKYJW3G3zmeBJDZB5udruQzOFU',
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const historyData = await response.json();
          return historyData || [];
        }
      } catch (fetchError) {
        console.error('Direct fetch for history failed:', fetchError);
      }
      
      // Fallback: get directly from appointments table
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          psychologists!psychologist_id(
            full_name, 
            specialization
          )
        `)
        .eq('patient_id', (await supabase.auth.getUser()).data.user?.id)
        .order('scheduled_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);
      
      if (error) throw error;
      
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

  const respondToReschedule = async (appointmentId: string, accept: boolean) => {
    try {
      setLoading(true);
      const status = accept ? 'scheduled' : 'declined';
      
      const { data, error } = await supabase.functions.invoke('psychologist-schedule', {
        method: 'PUT',
        body: {
          appointmentId,
          status,
          action: 'respond_reschedule'
        }
      });
      
      if (error) throw error;
      
      toast({
        title: 'Sucesso',
        description: data.message || (accept ? 'Reagendamento aceito com sucesso!' : 'Reagendamento recusado com sucesso!'),
      });
      
      await fetchAppointments();
      return data.appointment;
    } catch (error: any) {
      console.error('Error responding to reschedule:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao responder reagendamento',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const acceptRescheduleProposal = async (appointmentId: string) => {
    return respondToReschedule(appointmentId, true);
  };

  const declineRescheduleProposal = async (appointmentId: string) => {
    return respondToReschedule(appointmentId, false);
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
    acceptRescheduleProposal,
    declineRescheduleProposal,
  };
};
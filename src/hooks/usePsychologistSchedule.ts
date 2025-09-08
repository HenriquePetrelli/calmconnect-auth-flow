import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PatientInfo {
  full_name: string;
}

interface Appointment {
  id: string;
  patient_id: string;
  psychologist_id: string;
  scheduled_at: string;
  status: string;
  appointment_type: string;
  notes?: string;
  session_summary?: string;
  created_at: string;
  updated_at: string;
  patient: PatientInfo;
}

interface AppointmentHistoryResponse {
  appointments: Appointment[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

export const usePsychologistSchedule = () => {
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch today's appointments
  const fetchTodayAppointments = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('psychologist-schedule');
      
      if (error) throw error;
      
      setTodayAppointments(data || []);
    } catch (error: any) {
      console.error('Error fetching today\'s appointments:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar consultas de hoje',
        variant: 'destructive',
      });
    }
  };

  // Fetch upcoming appointments (next 7 days)
  const fetchUpcomingAppointments = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('psychologist-schedule?action=upcoming', {
        method: 'GET'
      });
      
      if (error) throw error;
      
      setUpcomingAppointments(data || []);
    } catch (error: any) {
      console.error('Error fetching upcoming appointments:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar próximas consultas',
        variant: 'destructive',
      });
    }
  };

  // Fetch appointment history with pagination
  const fetchAppointmentHistory = async (page = 1, limit = 10): Promise<AppointmentHistoryResponse | null> => {
    try {
      const { data, error } = await supabase.functions.invoke(`psychologist-schedule?action=history&page=${page}&limit=${limit}`, {
        method: 'GET'
      });
      
      if (error) throw error;
      
      return data as AppointmentHistoryResponse;
    } catch (error: any) {
      console.error('Error fetching appointment history:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar histórico de consultas',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Update appointment status or add session summary
  const updateAppointment = async (appointmentId: string, updates: { status?: string; sessionSummary?: string }) => {
    try {
      const { data, error } = await supabase.functions.invoke('psychologist-schedule', {
        method: 'PUT',
        body: {
          appointmentId,
          status: updates.status,
          sessionSummary: updates.sessionSummary
        }
      });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: data.message,
      });

      // Refresh appointments
      fetchTodayAppointments();
      fetchUpcomingAppointments();
      
      return data.appointment;
    } catch (error: any) {
      console.error('Error updating appointment:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar consulta',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Check if appointment can be started (15 minutes before scheduled time)
  const canStartAppointment = (scheduledAt: string): boolean => {
    const now = new Date();
    const scheduledTime = new Date(scheduledAt);
    const timeDifference = scheduledTime.getTime() - now.getTime();
    const minutesUntilAppointment = timeDifference / (1000 * 60);
    
    // Can start 15 minutes before scheduled time
    return minutesUntilAppointment <= 15 && minutesUntilAppointment >= -60; // Until 1 hour after
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchTodayAppointments(),
        fetchUpcomingAppointments()
      ]);
      setLoading(false);
    };

    loadData();
  }, []);

  return {
    todayAppointments,
    upcomingAppointments,
    loading,
    fetchTodayAppointments,
    fetchUpcomingAppointments,
    fetchAppointmentHistory,
    updateAppointment,
    canStartAppointment
  };
};
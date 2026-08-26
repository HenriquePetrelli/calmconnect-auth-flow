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
      const { data, error } = await supabase.functions.invoke('psychologist-schedule', {
        method: 'GET'
      });

      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      const filtered = (data || []).filter((a: any) => a.psychologist_id === user?.id);
      setTodayAppointments(filtered);
    } catch (error: any) {
      console.error('Error fetching today\'s appointments:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar consultas de hoje',
        variant: 'destructive',
      });
    }
  };

  // Fetch pending appointments (awaiting psychologist confirmation)
  const fetchPendingAppointments = async (): Promise<Appointment[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('psychologist-schedule?action=pending', {
        method: 'GET'
      });

      if (error) throw error;

      return data || [];
    } catch (error: any) {
      console.error('Error fetching pending appointments:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar consultas pendentes',
        variant: 'destructive',
      });
      return [];
    }
  };

  // Fetch upcoming appointments (next 7 days)
  const fetchUpcomingAppointments = async () => {
    try {
      const response = await fetch(`https://ihrrgmmsfuvlasmzdmwf.supabase.co/functions/v1/psychologist-schedule?action=upcoming`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlocnJnbW1zZnV2bGFzbXpkbXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1NDMzMDcsImV4cCI6MjA2OTExOTMwN30.6hRDCL5alu-Bs4kT4jKYJW3G3zmeBJDZB5udruQzOFU',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const { data: { user } } = await supabase.auth.getUser();
      const filtered = (data || []).filter((a: any) => a.psychologist_id === user?.id);
      setUpcomingAppointments(filtered);
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
      const response = await fetch(`https://ihrrgmmsfuvlasmzdmwf.supabase.co/functions/v1/psychologist-schedule?action=history&page=${page}&limit=${limit}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlocnJnbW1zZnV2bGFzbXpkbXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1NDMzMDcsImV4cCI6MjA2OTExOTMwN30.6hRDCL5alu-Bs4kT4jKYJW3G3zmeBJDZB5udruQzOFU',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
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

  // Accept appointment (change from pending to scheduled)
  const acceptAppointment = async (appointmentId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('psychologist-schedule', {
        method: 'PUT',
        body: {
          appointmentId,
          status: 'scheduled'
        }
      });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Consulta confirmada com sucesso',
      });

      // Refresh appointments
      fetchTodayAppointments();
      fetchUpcomingAppointments();
      
      return data.appointment;
    } catch (error: any) {
      console.error('Error accepting appointment:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao confirmar consulta',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Decline appointment (change from pending to declined)
  const declineAppointment = async (appointmentId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('psychologist-schedule', {
        method: 'PUT',
        body: {
          appointmentId,
          status: 'declined'
        }
      });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Consulta recusada',
      });

      // Refresh appointments
      fetchTodayAppointments();
      fetchUpcomingAppointments();
      
      return data.appointment;
    } catch (error: any) {
      console.error('Error declining appointment:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao recusar consulta',
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
    fetchPendingAppointments,
    fetchAppointmentHistory,
    updateAppointment,
    acceptAppointment,
    declineAppointment,
    canStartAppointment
  };
};
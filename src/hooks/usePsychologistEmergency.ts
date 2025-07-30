import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EmergencyRequest {
  id: string;
  patient_id: string;
  status: string;
  created_at: string;
  accepted_by: string | null;
  accepted_at: string | null;
  patient: {
    full_name: string;
  };
}

export const usePsychologistEmergency = () => {
  const [emergencyRequests, setEmergencyRequests] = useState<EmergencyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch emergency requests
  const fetchEmergencyRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('psychologist-emergency');
      
      if (error) throw error;
      
      setEmergencyRequests(data || []);
    } catch (error: any) {
      console.error('Error fetching emergency requests:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar solicitações de emergência',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Accept emergency request
  const acceptEmergencyRequest = async (requestId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('psychologist-emergency', {
        method: 'PUT',
        body: {
          requestId,
          action: 'accept'
        }
      });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: data.message,
      });

      // Refresh the list
      fetchEmergencyRequests();
      
      return data.emergency_request;
    } catch (error: any) {
      console.error('Error accepting emergency request:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao aceitar solicitação',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Decline emergency request
  const declineEmergencyRequest = async (requestId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('psychologist-emergency', {
        method: 'PUT',
        body: {
          requestId,
          action: 'decline'
        }
      });

      if (error) throw error;

      toast({
        title: 'Informação',
        description: data.message,
      });

      // Refresh the list
      fetchEmergencyRequests();
    } catch (error: any) {
      console.error('Error declining emergency request:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao recusar solicitação',
        variant: 'destructive',
      });
    }
  };

  // Set up real-time subscription for emergency requests
  useEffect(() => {
    // Initial fetch
    fetchEmergencyRequests();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('emergency-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'emergency_requests'
        },
        (payload) => {
          console.log('Emergency request change:', payload);
          // Refresh data when there are changes
          fetchEmergencyRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    emergencyRequests,
    loading,
    acceptEmergencyRequest,
    declineEmergencyRequest,
    fetchEmergencyRequests
  };
};
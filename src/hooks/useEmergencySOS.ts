import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EmergencyRequest {
  id: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'rejected' | 'waiting';
  accepted_by?: string;
  accepted_at?: string;
  video_room_id?: string;
  room_url?: string;
  psychologist?: {
    full_name: string;
  };
  created_at: string;
}

export const useEmergencySOS = () => {
  const [currentRequest, setCurrentRequest] = useState<EmergencyRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [stopPolling, setStopPolling] = useState<(() => void) | null>(null);
  const { toast } = useToast();

  const createEmergencyRequest = async () => {
    if (loading) return; // Prevent multiple simultaneous requests
    
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const errorMsg = 'Usuário não autenticado. Faça login novamente.';
        toast({
          title: 'Erro de Autenticação',
          description: errorMsg,
          variant: 'destructive',
          duration: 5000,
        });
        throw new Error(errorMsg);
      }

      console.log('Creating emergency request for user:', user.id);

      const { data, error } = await supabase.functions.invoke('emergency-sos', {
        body: { patient_id: user.id },
      });
      
      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Erro de comunicação com o servidor');
      }
      
      console.log('Emergency SOS response:', data);
      
      if (!data?.success) {
        const errorMsg = data?.message || 'Erro desconhecido ao criar solicitação';
        throw new Error(errorMsg);
      }
      
      if (!data.emergency_request_id) {
        throw new Error('ID da solicitação não retornado pelo servidor');
      }
      
      toast({
        title: 'SOS Ativado',
        description: data.message || 'Solicitação de emergência enviada com sucesso',
        duration: 3000,
      });
      
      // Start polling for status updates
      const cleanupFn = startStatusPolling(data.emergency_request_id);
      setStopPolling(() => cleanupFn);
      
      return data.emergency_request_id;
    } catch (error: any) {
      console.error('Error creating emergency request:', error);
      
      const errorMessage = error.message || 'Erro ao enviar solicitação de emergência';
      
      toast({
        title: 'Erro na Solicitação',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000,
      });
      
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const checkRequestStatus = async (requestId: string) => {
    try {
      // Use URL params for GET request instead of body
      const { data, error } = await supabase.functions.invoke(`emergency-sos?request_id=${requestId}`, {
        method: 'GET',
      });
      
      if (error) {
        console.error('Edge function error:', error);
        return null;
      }
      
      // Handle response where request doesn't exist
      if (data?.success === true && data?.data === null) {
        console.log('Request was cancelled or not found, stopping polling');
        return null;
      }
      
      setCurrentRequest(data);
      return data;
    } catch (error: any) {
      console.error('Error checking request status:', error);
      // Stop the polling loop on persistent errors
      return null;
    }
  };

  const startStatusPolling = (requestId: string) => {
    let pollingInterval: NodeJS.Timeout | null = null;
    let failureCount = 0;
    const maxFailures = 3;

    const poll = async () => {
      const request = await checkRequestStatus(requestId);
      
      if (request === null) {
        failureCount++;
        console.warn(`Status check failed (${failureCount}/${maxFailures})`);
        
        if (failureCount >= maxFailures) {
          console.log('Max failures reached, stopping status polling');
          if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
          }
          return;
        }
      } else {
        failureCount = 0; // Reset failure count on success
      }
      
      if (request && request.status === 'accepted') {
        console.log('Request accepted, stopping polling');
        if (pollingInterval) {
          clearInterval(pollingInterval);
          pollingInterval = null;
        }
        toast({
          title: 'Psicólogo encontrado!',
          description: `${request.psychologist?.full_name} aceitou sua solicitação`,
        });
        return;
      }
      
      if (request && ['completed', 'cancelled'].includes(request.status)) {
        console.log('Request completed or cancelled, stopping polling');
        if (pollingInterval) {
          clearInterval(pollingInterval);
          pollingInterval = null;
        }
        return;
      }
    };

    // Start polling
    pollingInterval = setInterval(poll, 5000);

    // Stop polling after 10 minutes
    setTimeout(() => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
        console.log('Polling timeout reached, stopping status polling');
      }
    }, 600000);

    // Return cleanup function
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
    };
  };

  const cancelRequest = async (requestId: string) => {
    try {
      setLoading(true);
      
      // Stop any ongoing polling first
      if (stopPolling) {
        stopPolling();
        setStopPolling(null);
      }
      
      // Delete the emergency request
      const { error } = await supabase
        .from('emergency_requests')
        .delete()
        .eq('id', requestId);
      
      if (error) {
        console.error('Error cancelling request:', error);
        throw error;
      }
      
      // Clear current request
      setCurrentRequest(null);
      
      toast({
        title: 'Solicitação cancelada',
        description: 'Sua solicitação de emergência foi cancelada',
      });
      
      console.log('Emergency request cancelled successfully');
    } catch (error: any) {
      console.error('Error cancelling request:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao cancelar solicitação',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    currentRequest,
    loading,
    createEmergencyRequest,
    checkRequestStatus,
    cancelRequest,
  };
};
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
  const { toast } = useToast();

  const createEmergencyRequest = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase.functions.invoke('emergency-sos', {
        body: { patient_id: user.id },
      });
      
      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }
      
      if (!data?.success || !data?.emergency_request_id) {
        throw new Error(data?.message || 'Erro ao criar solicitação de emergência');
      }
      
      toast({
        title: 'SOS Ativado',
        description: data.message || 'Solicitação de emergência enviada',
        duration: 4000,
      });
      
      // Start polling for status updates
      startStatusPolling(data.emergency_request_id);
      
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
      if (error) throw error;
      setCurrentRequest(data);
      return data;
    } catch (error: any) {
      console.error('Error checking request status:', error);
      // Stop the polling loop on persistent errors
      return null;
    }
  };

  const startStatusPolling = (requestId: string) => {
    let failureCount = 0;
    const maxFailures = 3;

    const interval = setInterval(async () => {
      const request = await checkRequestStatus(requestId);
      
      if (request === null) {
        failureCount++;
        console.warn(`Status check failed (${failureCount}/${maxFailures})`);
        
        if (failureCount >= maxFailures) {
          console.error('Max failures reached, stopping status polling');
          clearInterval(interval);
          toast({
            title: 'Erro de Conexão',
            description: 'Não foi possível verificar o status da solicitação',
            variant: 'destructive',
          });
          return;
        }
      } else {
        failureCount = 0; // Reset failure count on success
      }
      
      if (request && request.status === 'accepted') {
        clearInterval(interval);
        toast({
          title: 'Psicólogo encontrado!',
          description: `${request.psychologist?.full_name} aceitou sua solicitação`,
        });
      }
      
      if (request && ['completed', 'cancelled'].includes(request.status)) {
        clearInterval(interval);
      }
    }, 5000); // Check every 5 seconds

    // Stop polling after 10 minutes
    setTimeout(() => {
      clearInterval(interval);
    }, 600000);
  };

  const cancelRequest = async (requestId: string) => {
    try {
      setLoading(true);
      // Delete the emergency request instead of just updating status
      const { error } = await supabase
        .from('emergency_requests')
        .delete()
        .eq('id', requestId);
      
      if (error) throw error;
      
      setCurrentRequest(null);
      toast({
        title: 'Solicitação cancelada',
        description: 'Sua solicitação de emergência foi cancelada',
      });
    } catch (error: any) {
      console.error('Error cancelling request:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao cancelar solicitação',
        variant: 'destructive',
      });
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
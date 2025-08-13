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
      const { data, error } = await supabase.functions.invoke('emergency-sos', {
        body: {},
      });
      
      if (error) throw error;
      
      toast({
        title: 'SOS Ativado',
        description: data.message || 'Solicitação de emergência enviada',
      });
      
      // Start polling for status updates
      startStatusPolling(data.emergency_request_id);
      
      return data.emergency_request_id;
    } catch (error: any) {
      console.error('Error creating emergency request:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao enviar solicitação de emergência',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const checkRequestStatus = async (requestId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('emergency-sos?requestId=' + encodeURIComponent(requestId), {
        body: null,
        method: 'GET',
      });
      if (error) throw error;
      setCurrentRequest(data);
      return data;
    } catch (error: any) {
      console.error('Error checking request status:', error);
      return null;
    }
  };

  const startStatusPolling = (requestId: string) => {
    const interval = setInterval(async () => {
      const request = await checkRequestStatus(requestId);
      
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
      // Update request status to cancelled
      const { error } = await supabase
        .from('emergency_requests')
        .update({ status: 'cancelled' })
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
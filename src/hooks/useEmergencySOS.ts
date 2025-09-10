import { useState, useCallback } from 'react';
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
        // Throw error to let caller handle retries for temporary issues
        throw error;
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
      
      // Re-throw error to let polling function handle it appropriately
      throw error;
    }
  };

  const startStatusPolling = (requestId: string) => {
    let pollingInterval: NodeJS.Timeout | null = null;
    let consecutiveFailures = 0;
    let temporaryFailures = 0;
    const maxConsecutiveFailures = 5; // Allow more failures before stopping
    const maxTemporaryFailures = 15; // Allow temporary failures for longer

    const poll = async () => {
      try {
        const request = await checkRequestStatus(requestId);
        
        // Reset failure counters on success
        consecutiveFailures = 0;
        temporaryFailures = 0;
        
        if (request && request.status === 'accepted') {
          console.log('Request accepted, stopping polling');
          if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
          }
          
          toast({
            title: 'Psicólogo encontrado!',
            description: `${request.psychologist?.full_name || 'Um psicólogo'} aceitou sua solicitação`,
          });
          
          // Get session_id from the accepted request
          const sessionId = request.video_room_id || request.room_url;
          
          if (sessionId) {
            console.log('✅ Redirecting patient to video call with session_id:', sessionId);
            // Use a callback to notify parent component about redirection
            const redirectEvent = new CustomEvent('emergencyAccepted', {
              detail: { sessionId, requestId: request.id }
            });
            window.dispatchEvent(redirectEvent);
          } else {
            console.error('❌ No session_id found in accepted request, retrying...');
            // Don't show error immediately, give it more time to be updated
            // The session_id might still be being written to the database
            
            // Retry after a short delay
            setTimeout(async () => {
              try {
                const retryRequest = await checkRequestStatus(requestId);
                if (retryRequest) {
                  const retrySessionId = retryRequest.video_room_id || retryRequest.room_url;
                  if (retrySessionId) {
                    console.log('✅ Session_id found on retry:', retrySessionId);
                    const redirectEvent = new CustomEvent('emergencyAccepted', {
                      detail: { sessionId: retrySessionId, requestId: retryRequest.id }
                    });
                    window.dispatchEvent(redirectEvent);
                  } else {
                    console.error('❌ Session_id still not available after retry');
                    toast({
                      title: 'Erro de conexão',
                      description: 'Não foi possível conectar à sala de vídeo. O psicólogo foi notificado.',
                      variant: 'destructive',
                      duration: 8000,
                    });
                  }
                }
              } catch (retryError) {
                console.error('Error on retry check:', retryError);
                toast({
                  title: 'Erro de conexão',
                  description: 'Problema de conexão. Tente atualizar a página.',
                  variant: 'destructive',
                  duration: 8000,
                });
              }
            }, 2000); // Wait 2 seconds before retry
          }
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
        
        // If request is null (cancelled/not found), stop polling
        if (request === null) {
          console.log('Request not found, stopping polling');
          if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
          }
          return;
        }
      } catch (error: any) {
        consecutiveFailures++;
        temporaryFailures++;
        
        console.warn(`Status check failed (${consecutiveFailures}/${maxConsecutiveFailures}, temp: ${temporaryFailures}/${maxTemporaryFailures})`);
        
        // Stop polling if too many consecutive failures or too many temporary failures
        if (consecutiveFailures >= maxConsecutiveFailures || temporaryFailures >= maxTemporaryFailures) {
          console.error('Max failures reached, stopping status polling');
          if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
          }
          
          // Only show error toast after many failures
          toast({
            title: 'Problema de Conectividade',
            description: 'Dificuldade para verificar o status. Sua solicitação continua ativa.',
            variant: 'destructive',
            duration: 5000,
          });
          return;
        }
      }
    };

    // Start polling immediately, then every 5 seconds
    poll();
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

  const cancelRequest = useCallback(async (requestId: string) => {
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
  }, [toast]);

  return {
    currentRequest,
    loading,
    createEmergencyRequest,
    checkRequestStatus,
    cancelRequest,
  };
};
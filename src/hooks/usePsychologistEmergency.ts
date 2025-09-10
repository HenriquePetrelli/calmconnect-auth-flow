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
      const { data, error } = await supabase.functions.invoke('psychologist-emergency', {
        method: 'GET'
      });
      
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
      // Accept the emergency request
      const { data, error } = await supabase.functions.invoke('psychologist-emergency', {
        method: 'PUT',
        body: {
          requestId,
          action: 'accept'
        }
      });

      if (error) throw error;

      // Check for specific error codes from the updated function
      if (data && !data.success) {
        let errorMessage = data.error || 'Erro ao aceitar solicitação';
        
        switch (data.code) {
          case 'REQUEST_NOT_FOUND':
            errorMessage = 'Esta solicitação foi cancelada pelo paciente';
            break;
          case 'REQUEST_NOT_AVAILABLE':
            errorMessage = 'Esta solicitação já foi aceita por outro psicólogo';
            break;
          case 'REQUEST_ALREADY_TAKEN':
            errorMessage = 'Outro psicólogo já aceitou esta solicitação';
            break;
          case 'REQUEST_UNAVAILABLE':
            errorMessage = 'Esta solicitação não está mais disponível';
            break;
        }
        
        toast({
          title: 'Informação',
          description: errorMessage,
          variant: 'destructive',
        });
        
        // Refresh the list to show current state
        fetchEmergencyRequests();
        return null;
      }

      toast({
        title: 'Sucesso',
        description: data.message,
      });

      // Increment accepted counter for current psychologist
      const { data: authUser } = await supabase.auth.getUser();
      const currentUserId = authUser.user?.id;
      if (currentUserId) {
        await supabase.rpc('increment_emergency_accepted', { p_psychologist_id: currentUserId });
      }

      // Check if session_id was returned from psychologist-emergency function
      let sessionId = data.session_id;
      
      if (!sessionId) {
        console.log('No session_id in response, creating new session manually...');
        
        // Fallback: Create WebRTC session manually if not returned
        try {
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          if (sessionError || !sessionData.session) {
            throw new Error('Usuário não autenticado - faça login novamente');
          }

          const { data: webrtcData, error: webrtcError } = await supabase.functions.invoke('initiate-webrtc', {
            body: {
              emergency_request_id: requestId,
              user_type: 'psychologist'
            }
          });

          if (webrtcError || !webrtcData?.session_id) {
            throw new Error('Falha ao criar sessão de vídeo');
          }

          sessionId = webrtcData.session_id;
        } catch (fallbackError) {
          console.error('Fallback session creation failed:', fallbackError);
          throw new Error('Falha ao criar sessão de vídeo');
        }
      }

      console.log('✅ Session ID obtained:', sessionId);

      // Refresh the list
      fetchEmergencyRequests();
      
      return {
        emergency_request: data.emergency_request,
        session_id: sessionId
      };
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

      // Increment rejected counter for current psychologist
      const { data: authUser } = await supabase.auth.getUser();
      const currentUserId = authUser.user?.id;
      if (currentUserId) {
        await supabase.rpc('increment_emergency_rejected', { p_psychologist_id: currentUserId });
      }

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
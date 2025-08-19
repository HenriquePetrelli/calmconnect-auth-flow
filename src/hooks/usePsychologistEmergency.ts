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

      // Increment accepted counter for current psychologist
      const { data: authUser } = await supabase.auth.getUser();
      const currentUserId = authUser.user?.id;
      if (currentUserId) {
        await supabase.rpc('increment_emergency_accepted', { p_psychologist_id: currentUserId });
      }

      // Create WebRTC session with robust authentication
      console.log('Starting WebRTC session creation...');
      
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        console.error('Authentication failed:', sessionError);
        throw new Error('Usuário não autenticado - faça login novamente');
      }

      console.log('Session check:', {
        hasSession: !!sessionData.session,
        hasToken: !!sessionData.session?.access_token,
        tokenLength: sessionData.session?.access_token?.length,
        userEmail: sessionData.session?.user?.email,
        expiresAt: sessionData.session?.expires_at
      });

      // Check if token is about to expire (within 5 minutes)
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = sessionData.session.expires_at || 0;
      if (expiresAt - now < 300) {
        console.log('Token expires soon, refreshing...');
        const { data: refreshedSession, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshedSession.session) {
          console.error('Token refresh failed:', refreshError);
          throw new Error('Falha ao renovar autenticação - faça login novamente');
        }
        sessionData.session = refreshedSession.session;
      }
      
      console.log('Invoking initiate-webrtc function...');
      const { data: webrtcData, error: webrtcError } = await supabase.functions.invoke('initiate-webrtc', {
        body: {
          emergency_request_id: requestId,
          user_type: 'psychologist'
        },
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('WebRTC function response:', {
        hasData: !!webrtcData,
        error: webrtcError,
        data: webrtcData
      });

      if (webrtcError) {
        console.error('WebRTC session creation failed:', webrtcError);
        
        // Provide more specific error message
        if (webrtcError.message?.includes('403') || webrtcError.message?.includes('Unauthorized')) {
          throw new Error('Acesso negado - verifique suas permissões');
        } else if (webrtcError.message?.includes('404')) {
          throw new Error('Solicitação de emergência não encontrada');
        } else {
          throw new Error(`Falha ao criar sessão de vídeo: ${webrtcError.message || 'Erro desconhecido'}`);
        }
      }

      if (!webrtcData?.session_id) {
        console.error('Invalid WebRTC response:', webrtcData);
        throw new Error('Resposta inválida do servidor de vídeo');
      }

      // Refresh the list
      fetchEmergencyRequests();
      
      return {
        emergency_request: data.emergency_request,
        session_id: webrtcData.session_id
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
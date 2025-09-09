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
      
      // DEBUG: Log all data being sent
      const requestBody = {
        emergency_request_id: requestId,
        user_type: 'psychologist'
      };
      
      console.log('🚀 PSYCHOLOGIST DEBUG - About to call initiate-webrtc function with:');
      console.log('📦 Request body:', JSON.stringify(requestBody, null, 2));
      console.log('🔑 Token (first 20 chars):', sessionData.session.access_token?.substring(0, 20) + '...');
      console.log('📋 Request ID:', requestId);
      console.log('👤 User type: psychologist');
      console.log('✅ Body is valid JSON:', !!JSON.stringify(requestBody));
      
      // First try with direct fetch for better debugging
      let webrtcData;
      let webrtcError = null;
      
      try {
        console.log('Attempting direct fetch call...');
        const fetchResponse = await fetch(
          'https://ihrrgmmsfuvlasmzdmwf.supabase.co/functions/v1/initiate-webrtc',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionData.session.access_token}`,
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlocnJnbW1zZnV2bGFzbXpkbXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1NDMzMDcsImV4cCI6MjA2OTExOTMwN30.6hRDCL5alu-Bs4kT4jKYJW3G3zmeBJDZB5udruQzOFU'
            },
            body: JSON.stringify(requestBody)
          }
        );

        console.log('📈 Fetch response status:', fetchResponse.status);
        console.log('📋 Fetch response headers:', Object.fromEntries(fetchResponse.headers.entries()));

        if (!fetchResponse.ok) {
          const errorText = await fetchResponse.text();
          console.error('❌ Fetch error response:', errorText);
          throw new Error(`HTTP ${fetchResponse.status}: ${errorText}`);
        }

        webrtcData = await fetchResponse.json();
        console.log('✅ Direct fetch successful:', webrtcData);

      } catch (fetchError) {
        console.error('❌ Direct fetch failed:', fetchError);
        console.log('🔄 Falling back to supabase.functions.invoke...');
        
        // Fallback to supabase.functions.invoke
        const { data: supabaseData, error } = await supabase.functions.invoke('initiate-webrtc', {
          body: requestBody,
          headers: {
            'Authorization': `Bearer ${sessionData.session.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('📊 Psychologist Supabase invoke response:', {
          data: supabaseData,
          error: error,
          hasSessionId: !!supabaseData?.session_id
        });
        
        webrtcData = supabaseData;
        webrtcError = error;
      }

      if (webrtcError) {
        console.error('WebRTC session creation failed:', webrtcError);
        
        // Handle specific error codes from the updated edge function
        let errorMessage = 'Falha ao criar sessão de vídeo';
        
        if (webrtcError.message?.includes('EMPTY_BODY') || webrtcError.message?.includes('Corpo da requisição inválido')) {
          errorMessage = 'Erro de comunicação: dados não enviados corretamente';
        } else if (webrtcError.message?.includes('INVALID_JSON')) {
          errorMessage = 'Erro de formato de dados na comunicação';
        } else if (webrtcError.message?.includes('MISSING_REQUIRED_FIELDS') || webrtcError.message?.includes('Campos obrigatórios ausentes')) {
          errorMessage = 'Dados obrigatórios não foram enviados';
        } else if (webrtcError.message?.includes('INVALID_USER_TYPE') || webrtcError.message?.includes('deve ser \'psychologist\' ou \'patient\'')) {
          errorMessage = 'Tipo de usuário inválido';
        } else if (webrtcError.message?.includes('Token inválido') || webrtcError.message?.includes('expirado')) {
          errorMessage = 'Sessão expirada - faça login novamente';
        } else if (webrtcError.message?.includes('403') || webrtcError.message?.includes('Unauthorized')) {
          errorMessage = 'Acesso negado - verifique suas permissões';
        } else if (webrtcError.message?.includes('404')) {
          errorMessage = 'Solicitação de emergência não encontrada';
        } else if (webrtcError.message) {
          errorMessage = `Falha ao criar sessão de vídeo: ${webrtcError.message}`;
        }
        
        throw new Error(errorMessage);
      }

      if (!webrtcData?.session_id) {
        console.error('Invalid WebRTC response:', webrtcData);
        throw new Error('Resposta inválida do servidor de vídeo');
      }

      // Wait and verify session is available before returning
      console.log('⏳ Waiting for session to be available in database...');
      
      let sessionVerified = false;
      let attempts = 0;
      const maxAttempts = 5;
      
      while (!sessionVerified && attempts < maxAttempts) {
        try {
          attempts++;
          console.log(`🔍 Session verification attempt ${attempts}/${maxAttempts}`);
          
          const { data: sessionCheck, error: sessionError } = await supabase
            .from('webrtc_sessions')
            .select('id, psychologist_id, status')
            .eq('id', webrtcData.session_id)
            .eq('psychologist_id', (await supabase.auth.getUser()).data.user?.id)
            .maybeSingle();

          if (sessionCheck && !sessionError) {
            console.log('✅ Session verified and accessible:', sessionCheck);
            sessionVerified = true;
          } else {
            console.log(`⏳ Session not ready yet (attempt ${attempts}), waiting...`);
            if (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Exponential backoff
            }
          }
        } catch (error) {
          console.warn(`⚠️ Session verification error (attempt ${attempts}):`, error);
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
          }
        }
      }

      if (!sessionVerified) {
        console.error('❌ Session not verified after all attempts');
        throw new Error('Sessão criada mas não está acessível. Tente novamente em alguns segundos.');
      }

      console.log('🎉 Session successfully created and verified!');

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
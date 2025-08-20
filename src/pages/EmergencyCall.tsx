import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { WebRTCVideoCall } from "@/components/sos/WebRTCVideoCall";

const EmergencyCall = () => {
  const { requestId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userType, setUserType] = useState<'psychologist' | 'patient'>('patient');

  useEffect(() => {
    document.title = "Chamada de Emergência | Soliv";
  }, []);

  useEffect(() => {
    const initializeCall = async () => {
      if (!requestId) return;

      try {
        // Get session ID from URL params or create new session
        const sessionIdFromParams = searchParams.get('sessionId');
        const userTypeFromParams = searchParams.get('userType') as 'psychologist' | 'patient' || 'patient';
        
        setUserType(userTypeFromParams);

        if (sessionIdFromParams) {
          setSessionId(sessionIdFromParams);
        } else {
          // Create new WebRTC session for patient
          console.log('Creating new WebRTC session for patient...');
          
          const { data: userData } = await supabase.auth.getUser();
          if (!userData.user) {
            console.error('No authenticated user found');
            throw new Error('User not authenticated');
          }

          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          if (sessionError || !sessionData.session) {
            console.error('Session error:', sessionError);
            throw new Error('Usuário não autenticado - faça login novamente');
          }

          console.log('Patient session check:', {
            hasSession: !!sessionData.session,
            hasToken: !!sessionData.session?.access_token,
            userEmail: sessionData.session?.user?.email,
            userType: userTypeFromParams
          });

          // Check token expiry and refresh if needed
          const now = Math.floor(Date.now() / 1000);
          const expiresAt = sessionData.session.expires_at || 0;
          if (expiresAt - now < 300) {
            console.log('Token expires soon, refreshing...');
            const { data: refreshedSession, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError || !refreshedSession.session) {
              console.error('Token refresh failed:', refreshError);
              throw new Error('Falha ao renovar autenticação');
            }
            sessionData.session = refreshedSession.session;
          }
          
          // DEBUG: Log all data being sent
          const requestBody = {
            emergency_request_id: requestId,
            user_type: userTypeFromParams
          };
          
          console.log('🚀 DEBUG - About to call initiate-webrtc function with:');
          console.log('📦 Request body:', JSON.stringify(requestBody, null, 2));
          console.log('🔑 Token (first 20 chars):', sessionData.session.access_token?.substring(0, 20) + '...');
          console.log('📋 Request ID:', requestId);
          console.log('👤 User type:', userTypeFromParams);
          console.log('✅ Body is valid JSON:', !!JSON.stringify(requestBody));
          
          // First try with direct fetch for better debugging
          let webrtcData;
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
            const { data: supabaseData, error: webrtcError } = await supabase.functions.invoke('initiate-webrtc', {
              body: requestBody,
              headers: {
                'Authorization': `Bearer ${sessionData.session.access_token}`,
                'Content-Type': 'application/json'
              }
            });

            console.log('📊 Supabase invoke response:', {
              data: supabaseData,
              error: webrtcError,
              hasSessionId: !!supabaseData?.session_id
            });

            if (webrtcError) {
              console.error('❌ Supabase invoke also failed:', webrtcError);
              
              // Provide user-friendly error messages based on specific error codes
              if (webrtcError.message?.includes('EMPTY_BODY') || webrtcError.message?.includes('Corpo da requisição inválido')) {
                throw new Error('Erro de comunicação: dados não enviados corretamente');
              } else if (webrtcError.message?.includes('INVALID_JSON')) {
                throw new Error('Erro de formato de dados na comunicação');
              } else if (webrtcError.message?.includes('MISSING_REQUIRED_FIELDS') || webrtcError.message?.includes('Campos obrigatórios ausentes')) {
                throw new Error('Dados obrigatórios não foram enviados');
              } else if (webrtcError.message?.includes('INVALID_USER_TYPE') || webrtcError.message?.includes('deve ser \'psychologist\' ou \'patient\'')) {
                throw new Error('Tipo de usuário inválido');
              } else if (webrtcError.message?.includes('Token inválido') || webrtcError.message?.includes('expirado')) {
                throw new Error('Sessão expirada - faça login novamente');
              } else if (webrtcError.message?.includes('403') || webrtcError.message?.includes('Unauthorized')) {
                throw new Error('Acesso negado - verifique se você tem permissão para esta chamada');
              } else if (webrtcError.message?.includes('404')) {
                throw new Error('Solicitação de emergência não encontrada ou expirada');
              } else {
                throw new Error(`Erro ao inicializar chamada: ${webrtcError.message || 'Erro desconhecido'}`);
              }
            }

            webrtcData = supabaseData;
          }

          if (!webrtcData?.session_id) {
            console.error('Invalid response from WebRTC function:', webrtcData);
            throw new Error('Falha ao obter ID da sessão de vídeo');
          }

          setSessionId(webrtcData.session_id);
        }

      } catch (error) {
        console.error("Error initializing call:", error);
        toast({
          title: "Erro",
          description: "Erro ao inicializar chamada",
          variant: "destructive",
        });
        navigate("/home");
      } finally {
        setLoading(false);
      }
    };

    initializeCall();
  }, [requestId, searchParams, navigate, toast]);

  // Mark emergency call as started when component mounts
  useEffect(() => {
    const markCallAsStarted = async () => {
      if (!requestId || !sessionId) return;

      try {
        const { error } = await supabase
          .from("emergency_requests")
          .update({
            started_at: new Date().toISOString(),
            status: "in_progress"
          })
          .eq("id", requestId);

        if (error) throw error;

        // Mark SOS as used for patients
        if (userType === 'patient') {
          await supabase.functions.invoke("mark-sos-used");
        }
      } catch (error) {
        console.error("Error marking call as started:", error);
      }
    };

    markCallAsStarted();
  }, [requestId, sessionId, userType]);

  const endCall = async () => {
    if (!requestId) return;

    try {
      const endTime = new Date().toISOString();
      
      // Get current emergency request data
      const { data: emergencyData } = await supabase
        .from("emergency_requests")
        .select("started_at")
        .eq("id", requestId)
        .single();

      const duration = emergencyData?.started_at 
        ? Math.floor((new Date(endTime).getTime() - new Date(emergencyData.started_at).getTime()) / 1000)
        : 0;

      // Update emergency request status
      const { error } = await supabase
        .from("emergency_requests")
        .update({
          ended_at: endTime,
          status: "completed",
          duration
        })
        .eq("id", requestId);

      if (error) throw error;

      // Update WebRTC session status
      if (sessionId) {
        await supabase
          .from("webrtc_sessions")
          .update({ status: "completed" })
          .eq("id", sessionId);
      }

      navigate("/home");
    } catch (error) {
      console.error("Error ending call:", error);
      toast({
        title: "Erro",
        description: "Erro ao finalizar chamada",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg">Carregando chamada...</p>
        </div>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg">Erro ao carregar sessão de vídeo</p>
          <Button onClick={() => navigate("/home")} className="mt-4">
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  return (
    <WebRTCVideoCall 
      sessionId={sessionId} 
      userType={userType} 
      onEndCall={endCall} 
    />
  );
};

export default EmergencyCall;

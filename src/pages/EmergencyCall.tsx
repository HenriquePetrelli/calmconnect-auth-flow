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
          const { data: userData } = await supabase.auth.getUser();
          if (!userData.user) throw new Error('User not authenticated');

          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          if (sessionError || !sessionData.session) {
            throw new Error('Usuário não autenticado');
          }

          console.log('Creating WebRTC session with token:', sessionData.session.access_token ? 'Token present' : 'No token');
          
          const { data: webrtcData, error: webrtcError } = await supabase.functions.invoke('initiate-webrtc', {
            body: {
              emergency_request_id: requestId,
              user_type: userTypeFromParams
            },
            headers: {
              'Authorization': `Bearer ${sessionData.session.access_token}`
            }
          });

          if (webrtcError) throw webrtcError;
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

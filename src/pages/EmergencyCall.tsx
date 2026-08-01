import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { WebRTCVideoCall } from "@/components/sos/WebRTCVideoCall";
import EmergencyVideoCall, { type EndCallInfo } from "@/components/EmergencyVideoCall";
import { SkeletonFullPage } from "@/components/skeletons/Skeletons";
import { acquireCallLock } from "@/lib/callLock";
import { findOngoingCallForUser, sessionIdOf } from "@/lib/emergencyCallGuard";

const EmergencyCall = () => {
  const { requestId: requestIdParam, sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sessionIdState, setSessionIdState] = useState<string | null>(null);
  const [userType, setUserType] = useState<'psychologist' | 'patient'>('patient');

  // The requestId may come from the route (legacy flow) or from the query
  // string (direct session route) — both must keep the request lifecycle in sync.
  const requestId = requestIdParam || searchParams.get('requestId') || undefined;

  // Check if this is a direct session ID route
  const isDirectSessionRoute = !!sessionId;


  useEffect(() => {
    document.title = "Chamada de Emergência | Soliv";
  }, []);

  useEffect(() => {
    // If this is a direct session route, use the new component
    if (isDirectSessionRoute && sessionId) {
      console.log('✅ Direct session route detected with sessionId:', sessionId);
      setSessionIdState(sessionId);
      const userTypeParam = searchParams.get('userType') as 'psychologist' | 'patient' || 'patient';
      setUserType(userTypeParam);
      setLoading(false);
      return;
    }

    // Otherwise use the legacy emergency request flow
    const initializeCall = async () => {
      if (!requestId) return;

      try {
        // Get session ID from URL params or create new session
        const sessionIdFromParams = searchParams.get('sessionId');
        const userTypeFromParams = searchParams.get('userType') as 'psychologist' | 'patient' || 'patient';
        
        setUserType(userTypeFromParams);

        if (sessionIdFromParams) {
          console.log('✅ Using sessionId from search params:', sessionIdFromParams);
          setSessionIdState(sessionIdFromParams);
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
          
          // Get session data from URL path parameter first, then search params as fallback
          const sessionIdFromPath = sessionId; // from useParams
          const sessionIdFromSearch = searchParams.get('session_id');
          const finalSessionId = sessionIdFromPath || sessionIdFromSearch;
          
          console.log('✅ Session ID from path:', sessionIdFromPath);
          console.log('✅ Session ID from search params:', sessionIdFromSearch);
          console.log('✅ Final Session ID:', finalSessionId);
          
          if (!finalSessionId) {
            throw new Error('Session ID não encontrado na URL - tente aceitar a emergência novamente');
          }
          
          // Use the session_id directly since it was created by psychologist-emergency
          const webrtcData = {
            success: true,
            session_id: finalSessionId,
            stun_servers: ["stun:stun.l.google.com:19302", "stun:global.stun.twilio.com:3478"]
          };
          
          console.log('✅ Using session from emergency acceptance:', webrtcData);

          if (!webrtcData?.session_id) {
            console.error('Invalid response from WebRTC function:', webrtcData);
            throw new Error('Falha ao obter ID da sessão de vídeo');
          }

          setSessionIdState(webrtcData.session_id);
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
  }, [requestId, sessionId, searchParams, navigate, toast, isDirectSessionRoute]);

  // Single active call guard: block duplicated tabs and simultaneous rooms
  useEffect(() => {
    if (!sessionIdState) return;
    let release: (() => void) | null = null;
    let cancelled = false;

    const run = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId || cancelled) return;

      const lockResult = acquireCallLock(userId, sessionIdState);
      if (lockResult.ok === false) {
        const duplicateTab = lockResult.reason === "duplicate-tab";
        toast({
          title: duplicateTab ? "Chamada já aberta" : "Chamada em andamento",
          description: duplicateTab
            ? "Esta chamada já está aberta em outra aba ou janela."
            : "Você já está em outra chamada. Finalize-a antes de entrar nesta.",
          variant: "destructive",
        });
        navigate(userType === "psychologist" ? "/psychologist-dashboard" : "/home");
        return;
      }
      release = lockResult.release;


      // Server-side guard: the user must not be attending a different room
      const ongoing = await findOngoingCallForUser(userId);
      const ongoingSession = sessionIdOf(ongoing);
      if (!cancelled && ongoing && ongoingSession && ongoingSession !== sessionIdState) {
        toast({
          title: "Chamada em andamento",
          description: "Você já possui uma chamada de emergência ativa. Retornando para ela.",
        });
        navigate(
          `/emergency-call/${ongoingSession}?userType=${userType}&requestId=${ongoing.id}`,
          { replace: true }
        );
      }
    };

    run();

    return () => {
      cancelled = true;
      release?.();
    };
  }, [sessionIdState, userType, navigate, toast]);

  // Mark emergency call as started (only once — reconnections must not reset it)
  useEffect(() => {
    const markCallAsStarted = async () => {
      if (!requestId || !sessionIdState) return;

      try {
        const { data: current } = await supabase
          .from("emergency_requests")
          .select("started_at, status, ended_at")
          .eq("id", requestId)
          .maybeSingle();

        // Call already finished — do not reopen it.
        if (current?.ended_at || current?.status === "completed") {
          toast({
            title: "Chamada encerrada",
            description: "Esta chamada de emergência já foi finalizada.",
          });
          navigate(userType === "psychologist" ? "/psychologist-dashboard" : "/home");
          return;
        }

        const isFirstJoin = !current?.started_at;

        const { error } = await supabase
          .from("emergency_requests")
          .update({
            ...(isFirstJoin ? { started_at: new Date().toISOString() } : {}),
            status: "in_progress",
          })
          .eq("id", requestId);

        if (error) throw error;

        // Mark SOS as used for patients (only on the first join)
        if (userType === "patient" && isFirstJoin) {
          await supabase.functions.invoke("mark-sos-used");
        }
      } catch (error) {
        console.error("Error marking call as started:", error);
      }
    };

    markCallAsStarted();
  }, [requestId, sessionIdState, userType, navigate, toast]);

  const endCall = async (info?: EndCallInfo) => {
    const goBack = () =>
      navigate(userType === "psychologist" ? "/psychologist-dashboard" : "/home");

    if (!requestId) {
      goBack();
      return;
    }

    try {
      const endTime = new Date().toISOString();
      const { data: auth } = await supabase.auth.getUser();
      const endReason = info?.reason ?? "encerrada_pelo_usuario";
      const endedByType = info?.endedByType ?? userType;

      // Get current emergency request data
      const { data: emergencyData } = await supabase
        .from("emergency_requests")
        .select("started_at")
        .eq("id", requestId)
        .maybeSingle();

      const duration = emergencyData?.started_at
        ? Math.floor((new Date(endTime).getTime() - new Date(emergencyData.started_at).getTime()) / 1000)
        : 0;

      // Update emergency request status
      const { error } = await supabase
        .from("emergency_requests")
        .update({
          ended_at: endTime,
          status: "completed",
          duration,
          ended_by: auth.user?.id ?? null,
          ended_by_type: endedByType,
          end_reason: endReason,
        })
        .eq("id", requestId);

      if (error) throw error;

      // Update WebRTC session status
      if (sessionIdState) {
        await supabase
          .from("webrtc_sessions")
          .update({
            status: "completed",
            ended_at: endTime,
            ended_by: auth.user?.id ?? null,
            ended_by_type: endedByType,
            end_reason: endReason,
          })
          .eq("id", sessionIdState);
      }


      goBack();
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
    return <SkeletonFullPage />;
  }

  if (!sessionIdState) {
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

  // Use the new component for direct session routes
  if (isDirectSessionRoute) {
    return (
      <EmergencyVideoCall
        sessionId={sessionIdState}
        userType={userType}
        onEndCall={endCall}
      />
    );
  }

  // Legacy component for emergency request routes
  return (
    <WebRTCVideoCall 
      sessionId={sessionIdState} 
      userType={userType} 
      onEndCall={endCall} 
    />
  );
};

export default EmergencyCall;

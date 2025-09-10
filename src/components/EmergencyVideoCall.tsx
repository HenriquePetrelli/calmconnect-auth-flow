import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Camera, CameraOff, PhoneOff, Loader2, AlertTriangle } from 'lucide-react';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FeedbackModal } from '@/components/sos/FeedbackModal';

interface EmergencyVideoCallProps {
  sessionId?: string;
  userType?: 'psychologist' | 'patient';
  onEndCall?: () => void;
  timeLimit?: number; // in seconds
}

const EmergencyVideoCall: React.FC<EmergencyVideoCallProps> = ({ 
  sessionId: propSessionId, 
  userType: propUserType, 
  onEndCall,
  timeLimit = 1200 // 20 minutes default
}) => {
  const { sessionId: paramSessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Use the URL parameter as the session ID (this should be the WebRTC session ID, not the emergency request ID)
  const sessionId = propSessionId || paramSessionId;
  const [userType, setUserType] = useState<'psychologist' | 'patient'>(propUserType || 'patient');
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionValid, setSessionValid] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [userInfo, setUserInfo] = useState<{name: string; details: string}>({name: '', details: ''});

  const {
    localVideoRef,
    remoteVideoRef,
    connectionState,
    isConnected,
    error,
    toggleAudio,
    toggleVideo,
    cleanup
  } = useWebRTC({
    sessionId: sessionId || '',
    userType,
    onConnectionStateChange: (state) => {
      if (state === 'connected') {
        setIsLoading(false);
      } else if (state === 'failed') {
        toast({
          title: 'Conexão Perdida',
          description: 'A conexão da videochamada foi perdida.',
          variant: 'destructive',
        });
      }
    }
  });

  // Enhanced session validation with intelligent delay
  useEffect(() => {
    const validateSessionWithDelay = async () => {
      if (!sessionId) {
        setIsLoading(false);
        return;
      }

      try {
        console.log(`🎬 Starting enhanced validation for session: ${sessionId}`);
        console.log('⏳ Applying initial delay to allow database replication...');
        
        // Import validation functions
        const { validateWebRTCSession, getUserTypeForSession, SessionValidationError } = await import('@/utils/session-validation');
        
        // Enhanced validation with built-in delay and retry
        const session = await validateWebRTCSession(sessionId);
        
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          throw new SessionValidationError('Usuário não autenticado', 'NOT_AUTHENTICATED');
        }

        // Determine user type
        const detectedUserType = getUserTypeForSession(session, user.id);
        if (detectedUserType) {
          setUserType(detectedUserType);
        }

        setSessionValid(true);
        setIsLoading(false);
        
        // Fetch user information
        await fetchUserInfo(sessionId, detectedUserType || userType);
        
        console.log('✅ Enhanced session validation completed successfully');
      } catch (error) {
        console.error('❌ Enhanced session validation failed:', error);
        
        // If session not found, show retry handler instead of immediate error
        if (error instanceof Error) {
          const { SessionValidationError } = await import('@/utils/session-validation');
          
          if (error instanceof SessionValidationError && error.code === 'SESSION_NOT_FOUND') {
            console.log('🔄 Session not found after enhanced validation, will show retry handler');
            setIsLoading(false);
            // Don't navigate away - let the retry handler manage this
            return;
          }
        }
        
        let title = 'Sessão Inválida';
        let description = 'Não foi possível validar a sessão de videochamada.';
        
        if (error instanceof Error) {
          const { SessionValidationError } = await import('@/utils/session-validation');
          
          if (error instanceof SessionValidationError) {
            switch (error.code) {
              case 'SESSION_EXPIRED':
                title = 'Sessão Expirada';
                description = error.message;
                break;
              case 'ACCESS_DENIED':
                title = 'Acesso Negado';
                description = error.message;
                break;
              case 'INVALID_SESSION_ID':
                title = 'ID de Sessão Inválido';
                description = error.message;
                break;
              default:
                description = error.message;
            }
          }
        }
        
        toast({
          title,
          description,
          variant: 'destructive',
        });
        
        navigate('/home');
      }
    };

    validateSessionWithDelay();
  }, [sessionId, navigate, toast]);

  const fetchUserInfo = async (sessionId: string, currentUserType: 'patient' | 'psychologist') => {
    try {
      // Get the WebRTC session to find the emergency request
      const { data: webrtcSession, error: sessionError } = await supabase
        .from('webrtc_sessions')
        .select('emergency_request_id, patient_id, psychologist_id')
        .eq('id', sessionId)
        .single();

      if (sessionError || !webrtcSession?.emergency_request_id) {
        console.error('Error fetching WebRTC session:', sessionError);
        return;
      }

      // Get emergency request with patient details
      const { data: emergencyRequest, error: emergencyError } = await supabase
        .from('emergency_requests')
        .select('patient_details, accepted_by, patient_id')
        .eq('id', webrtcSession.emergency_request_id)
        .single();

      if (emergencyError) {
        console.error('Error fetching emergency request:', emergencyError);
        return;
      }

      if (currentUserType === 'patient') {
        // Patient sees psychologist info
        if (emergencyRequest.accepted_by) {
          const { data: psychologist, error: psychError } = await supabase
            .from('psychologists')
            .select('full_name, specialization')
            .eq('user_id', emergencyRequest.accepted_by)
            .single();

          if (!psychError && psychologist) {
            setUserInfo({
              name: psychologist.full_name,
              details: psychologist.specialization || 'Psicólogo'
            });
          }
        }
      } else {
        // Psychologist sees patient info
        const patientDetails = emergencyRequest.patient_details as any;
        if (patientDetails?.full_name) {
          const symptoms = patientDetails.sintomas_selecionados || [];
          setUserInfo({
            name: patientDetails.full_name,
            details: symptoms.length > 0 ? symptoms.join(', ') : 'Sem sintomas cadastrados'
          });
        }
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  // Timer countdown
  useEffect(() => {
    if (!isConnected) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleEndCall();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isConnected]);

  const handleMuteToggle = () => {
    const muted = toggleAudio();
    setIsMuted(muted);
  };

  const handleCameraToggle = () => {
    const cameraOff = toggleVideo();
    setIsCameraOff(cameraOff);
  };

  const handleEndCall = async () => {
    try {
      cleanup();
      
      // Update session status
      if (sessionId) {
        await supabase
          .from('webrtc_sessions')
          .update({ status: 'completed' })
          .eq('id', sessionId);
      }

      // Show feedback modal instead of immediately navigating
      setShowFeedbackModal(true);
    } catch (error) {
      console.error('Error ending call:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao finalizar chamada',
        variant: 'destructive',
      });
      
      if (onEndCall) {
        onEndCall();
      } else {
        navigate('/home');
      }
    }
  };

  const handleFeedbackClose = () => {
    setShowFeedbackModal(false);
    
    toast({
      title: 'Chamada Finalizada',
      description: 'A videochamada foi encerrada com sucesso.',
    });

    if (onEndCall) {
      onEndCall();
    } else {
      navigate('/home');
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getConnectionStatus = () => {
    switch (connectionState) {
      case 'connecting':
        return { text: 'Conectando...', color: 'yellow' };
      case 'connected':
        return { text: 'Conectado', color: 'green' };
      case 'disconnected':
        return { text: 'Desconectado', color: 'red' };
      case 'failed':
        return { text: 'Falha na Conexão', color: 'red' };
      default:
        return { text: 'Inicializando...', color: 'blue' };
    }
  };

  const status = getConnectionStatus();

  if (isLoading) {
    // Show the intelligent initializer with delay and progress
    const VideoCallInitializer = React.lazy(() => 
      import('@/components/VideoCallInitializer')
    );
    
    return (
      <React.Suspense fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      }>
        <VideoCallInitializer
          sessionId={sessionId || ''}
          onReady={() => {
            console.log('🎉 VideoCallInitializer completed, validation should be done');
          }}
          onError={(error) => {
            console.error('❌ VideoCallInitializer failed:', error);
            toast({
              title: 'Erro na Inicialização',
              description: error,
              variant: 'destructive',
            });
            navigate('/home');
          }}
        />
      </React.Suspense>
    );
  }

  // If session is not valid, show retry handler for SESSION_NOT_FOUND errors
  if (!sessionValid && sessionId) {
    const SessionRetryHandler = React.lazy(() => 
      import('@/components/SessionRetryHandler').then(module => ({ 
        default: module.SessionRetryHandler 
      }))
    );
    
    return (
      <React.Suspense fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      }>
        <SessionRetryHandler
          sessionId={sessionId}
          onSessionReady={(session) => {
            setSessionValid(true);
            console.log('🎉 Session ready after retry:', session);
          }}
          onGiveUp={() => {
            console.log('👋 User gave up on session retry');
            navigate('/home');
          }}
        />
      </React.Suspense>
    );
  }

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-8 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 mx-auto text-destructive" />
            <h3 className="text-xl font-semibold text-destructive">
              Sessão Não Encontrada
            </h3>
            <p className="text-muted-foreground">
              ID da sessão não foi fornecido ou é inválido.
            </p>
            <Button onClick={() => navigate('/home')}>
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-8 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 mx-auto text-destructive" />
            <h3 className="text-xl font-semibold text-destructive">
              Erro na Videochamada
            </h3>
            <p className="text-muted-foreground">{error}</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.location.reload()}>
                Tentar Novamente
              </Button>
              <Button onClick={() => navigate('/home')}>
                Voltar ao Início
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant={status.color === 'green' ? 'default' : 'destructive'}>
              {status.text}
            </Badge>
            <div className="text-sm">
              <span className="font-medium">
                {userType === 'psychologist' ? 'Psicólogo' : 'Paciente'}
              </span>
              {userInfo.name && (
                <div className="text-xs opacity-80">
                  {userType === 'patient' ? `Com ${userInfo.name}` : `Atendendo ${userInfo.name}`}
                </div>
              )}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-mono font-bold">
              {formatTime(timeLeft)}
            </div>
            <div className="text-xs opacity-80">
              Tempo restante
            </div>
            {userInfo.details && (
              <div className="text-xs opacity-70 mt-1 max-w-xs truncate">
                {userType === 'patient' 
                  ? `Especialização: ${userInfo.details}`
                  : `Sintomas: ${userInfo.details}`
                }
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Video Area */}
      <div className="flex-1 relative bg-secondary">
        {/* Remote Video */}
        <video 
          ref={remoteVideoRef} 
          autoPlay 
          playsInline 
          className="w-full h-full object-cover"
        />
        
        {/* Placeholder when no remote video */}
        {!isConnected && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Card className="w-full max-w-md mx-4">
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-24 h-24 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
                    {connectionState === 'connecting' ? (
                      <Loader2 className="w-8 h-8 animate-spin text-primary-foreground" />
                    ) : (
                      <span className="text-primary-foreground font-bold text-xl">
                        {userType === 'psychologist' ? 'P' : 'PS'}
                      </span>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-1">
                    {userType === 'psychologist' ? 'Aguardando paciente...' : 'Conectando com psicólogo...'}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {status.text}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Local Video */}
        <div className="absolute bottom-4 right-4 w-32 h-24 bg-secondary rounded-lg border-2 border-border overflow-hidden shadow-lg">
          {isCameraOff ? (
            <div className="w-full h-full flex items-center justify-center bg-secondary">
              <CameraOff className="text-muted-foreground" size={24} />
            </div>
          ) : (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="p-6 bg-background border-t">
        <div className="flex justify-center space-x-6">
          <Button
            variant={isMuted ? "destructive" : "secondary"}
            size="icon"
            className="w-12 h-12 rounded-full"
            onClick={handleMuteToggle}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </Button>

          <Button
            variant="destructive"
            size="icon"
            className="w-14 h-14 rounded-full"
            onClick={handleEndCall}
          >
            <PhoneOff size={24} />
          </Button>

          <Button
            variant={isCameraOff ? "destructive" : "secondary"}
            size="icon"
            className="w-12 h-12 rounded-full"
            onClick={handleCameraToggle}
          >
            {isCameraOff ? <CameraOff size={20} /> : <Camera size={20} />}
          </Button>
        </div>
      </div>

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={handleFeedbackClose}
        userType={userType}
        sessionId={sessionId || ''}
        partnerName={userInfo.name}
      />
    </div>
  );
};

export default EmergencyVideoCall;
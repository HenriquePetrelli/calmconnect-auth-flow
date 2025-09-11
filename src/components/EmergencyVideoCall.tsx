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
    <div className="min-h-screen bg-slate-900 flex flex-col relative">
      {/* Header moderno com informações do usuário */}
      <div className="bg-slate-800/90 backdrop-blur-sm text-white p-4 z-10">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Informações do participante */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shadow-lg">
              <span className="text-white font-semibold">
                {userType === 'psychologist' ? 'Dr' : userInfo.name?.charAt(0) || 'P'}
              </span>
            </div>
            <div>
              <div className="font-semibold text-lg">
                {userType === 'patient' && userInfo.name ? `Dr. ${userInfo.name}` : 
                 userType === 'psychologist' && userInfo.name ? userInfo.name : 
                 'Conectando...'}
              </div>
              {userInfo.details && (
                <div className="text-sm text-slate-300 max-w-sm">
                  {userType === 'patient' 
                    ? `Especialização: ${userInfo.details}`
                    : `Sintomas: ${userInfo.details}`
                  }
                </div>
              )}
              {/* Status de conexão */}
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${status.color === 'green' ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`}></div>
                <span className="text-xs text-slate-400">{status.text}</span>
              </div>
            </div>
          </div>
          
          {/* Timer central */}
          <div className="text-center">
            <div className="text-3xl font-mono font-bold text-white mb-1">
              {formatTime(timeLeft)}
            </div>
            <div className="text-sm text-slate-400">Tempo restante</div>
          </div>

          {/* Informações adicionais para psicólogo */}
          {userType === 'psychologist' && userInfo.name && (
            <div className="text-right text-sm text-slate-300 space-y-1">
              <div className="flex items-center gap-2">
                <span>📅</span>
                <span>Consultas: 12</span>
              </div>
              <div className="flex items-center gap-2">
                <span>🚨</span>
                <span>SOS anteriores: 3</span>
              </div>
              <div className="flex items-center gap-2">
                <span>⭐</span>
                <span>Avaliação: 4.8/5</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Área principal do vídeo */}
      <div className="flex-1 relative bg-slate-900 overflow-hidden">
        {/* Vídeo remoto */}
        <video 
          ref={remoteVideoRef} 
          autoPlay 
          playsInline 
          className="w-full h-full object-cover"
        />
        
        {/* Overlay de status do participante */}
        {isConnected && (
          <div className="absolute top-6 left-6 z-20">
            <div className="bg-black/70 backdrop-blur-md rounded-lg px-4 py-2 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center">
                <span className="text-white text-xs font-semibold">
                  {userType === 'psychologist' ? userInfo.name?.charAt(0) || 'P' : 'Dr'}
                </span>
              </div>
              <div>
                <div className="text-white font-medium text-sm">
                  {userType === 'patient' ? userInfo.name || 'Psicólogo' : userInfo.name || 'Paciente'}
                </div>
                {/* Indicadores de microfone/câmera */}
                <div className="flex items-center gap-1 mt-1">
                  {isMuted && (
                    <div className="bg-red-500 rounded-full p-1">
                      <MicOff className="text-white" size={10} />
                    </div>
                  )}
                  {isCameraOff && (
                    <div className="bg-red-500 rounded-full p-1">
                      <CameraOff className="text-white" size={10} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Placeholder quando não conectado */}
        {!isConnected && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <div className="text-center space-y-8 max-w-lg mx-4">
              <div className="relative">
                <div className="w-40 h-40 mx-auto rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shadow-2xl">
                  {connectionState === 'connecting' ? (
                    <Loader2 className="w-16 h-16 animate-spin text-white" />
                  ) : (
                    <span className="text-white font-bold text-5xl">
                      {userType === 'psychologist' ? 'P' : 'Dr'}
                    </span>
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center border-4 border-slate-900">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-3xl font-bold text-white">
                  {userType === 'psychologist' ? 'Aguardando paciente' : 'Conectando com psicólogo'}
                </h3>
                <p className="text-slate-400 text-lg">
                  {connectionState === 'connecting' ? 'Estabelecendo conexão segura...' : status.text}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Vídeo próprio (miniatura) */}
        <div className="absolute bottom-6 right-6 w-48 h-32 bg-slate-800 rounded-2xl border-3 border-slate-700 overflow-hidden shadow-2xl group hover:scale-105 transition-all duration-300">
          {isCameraOff ? (
            <div className="w-full h-full flex items-center justify-center bg-slate-800 relative">
              <div className="text-center">
                <CameraOff className="text-slate-400 mx-auto mb-2" size={24} />
                <div className="text-sm text-slate-400 font-medium">Câmera desligada</div>
              </div>
            </div>
          ) : (
            <>
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
              {/* Indicadores de status no vídeo próprio */}
              <div className="absolute bottom-2 left-2 flex gap-1">
                {isMuted && (
                  <div className="bg-red-500 rounded-full p-1.5 shadow-lg">
                    <MicOff className="text-white" size={12} />
                  </div>
                )}
              </div>
              {/* Nome no canto */}
              <div className="absolute bottom-2 right-2 bg-black/60 rounded px-2 py-1">
                <span className="text-white text-xs font-medium">Você</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Barra de controles moderna */}
      <div className="bg-slate-800/95 backdrop-blur-md border-t border-slate-700 p-6">
        <div className="flex justify-center items-center gap-8 max-w-lg mx-auto">
          {/* Botão de microfone */}
          <button
            onClick={handleMuteToggle}
            className={`group relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 ${
              isMuted 
                ? 'bg-red-500 hover:bg-red-600 shadow-xl shadow-red-500/30' 
                : 'bg-slate-600 hover:bg-slate-500 shadow-xl shadow-slate-600/20'
            }`}
          >
            {isMuted ? (
              <MicOff className="text-white" size={22} />
            ) : (
              <Mic className="text-white" size={22} />
            )}
            {/* Tooltip */}
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-3 py-1 rounded-lg text-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {isMuted ? 'Ativar microfone' : 'Desativar microfone'}
            </div>
          </button>

          {/* Botão de encerrar chamada */}
          <button
            onClick={handleEndCall}
            className="group relative w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all duration-300 transform hover:scale-110 shadow-2xl shadow-red-500/40"
          >
            <PhoneOff className="text-white" size={28} />
            {/* Tooltip */}
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-3 py-1 rounded-lg text-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Encerrar chamada
            </div>
          </button>

          {/* Botão de câmera */}
          <button
            onClick={handleCameraToggle}
            className={`group relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 ${
              isCameraOff 
                ? 'bg-red-500 hover:bg-red-600 shadow-xl shadow-red-500/30' 
                : 'bg-slate-600 hover:bg-slate-500 shadow-xl shadow-slate-600/20'
            }`}
          >
            {isCameraOff ? (
              <CameraOff className="text-white" size={22} />
            ) : (
              <Camera className="text-white" size={22} />
            )}
            {/* Tooltip */}
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-3 py-1 rounded-lg text-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {isCameraOff ? 'Ativar câmera' : 'Desativar câmera'}
            </div>
          </button>
        </div>
        
        {/* Informações de segurança e qualidade */}
        <div className="flex justify-center items-center gap-8 mt-6 text-slate-400 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Conexão criptografada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <span>HD Quality</span>
          </div>
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
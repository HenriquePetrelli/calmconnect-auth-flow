import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Camera, CameraOff, PhoneOff, Loader2, AlertTriangle, Settings, Shield, Video } from 'lucide-react';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FeedbackModal } from '@/components/sos/FeedbackModal';
import { VideoCallSettingsModal } from '@/components/sos/VideoCallSettingsModal';

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
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [userInfo, setUserInfo] = useState<{
    name: string; 
    details: string;
    consultations?: number;
    sosCount?: number;
    rating?: number;
  }>({name: '', details: ''});

  const {
    localVideoRef,
    remoteVideoRef,
    localStream,
    peerConnection,
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
            .select('full_name, specialization, total_appointments, average_rating')
            .eq('user_id', emergencyRequest.accepted_by)
            .single();

          if (!psychError && psychologist) {
            setUserInfo({
              name: psychologist.full_name,
              details: psychologist.specialization || 'Psicólogo',
              consultations: psychologist.total_appointments || 0,
              rating: psychologist.average_rating || 0
            });
          }
        }
      } else {
        // Psychologist sees patient info with additional details
        const patientDetails = emergencyRequest.patient_details as any;
        if (patientDetails?.full_name) {
          const symptoms = patientDetails.sintomas_selecionados || [];
          
          // Get patient statistics using the new function
          const { data: patientStats } = await supabase
            .rpc('get_patient_statistics', {
              patient_user_id: emergencyRequest.patient_id
            })
            .single();
          
          setUserInfo({
            name: patientDetails.full_name,
            details: symptoms.length > 0 ? symptoms.join(', ') : 'Sem sintomas cadastrados',
            consultations: patientStats?.consultation_count || 0,
            sosCount: patientStats?.sos_count || 0,
            rating: patientStats?.average_rating || 0
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

    // Redirect based on user type
    if (userType === 'patient') {
      navigate('/home');
    } else {
      navigate('/psychologist-dashboard');
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
    <div className="min-h-screen bg-[#202124] flex flex-col relative">
      {/* Header com informações do usuário e timer - Estilo Google Meet */}
      <div className="bg-[#303134]/95 backdrop-blur-sm text-white p-4 z-10 border-b border-gray-600/30">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Informações do participante */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shadow-lg">
              <span className="text-white font-semibold text-lg">
                {userType === 'patient' ? (userInfo.name?.charAt(0) || 'Dr') : (userInfo.name?.charAt(0) || 'P')}
              </span>
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-lg">
                {userType === 'patient' && userInfo.name ? `Dr. ${userInfo.name}` : 
                 userType === 'psychologist' && userInfo.name ? userInfo.name : 
                 'Conectando...'}
              </div>
              {userInfo.details && (
                <div className="text-sm text-gray-300 max-w-md">
                  {userType === 'patient' ? (
                    <span>{userInfo.details}</span>
                  ) : (
                    <div className="space-y-1">
                      <div className="font-medium text-blue-400">Sintomas relatados:</div>
                      <div className="text-gray-300 leading-relaxed">{userInfo.details}</div>
                    </div>
                  )}
                </div>
              )}
              {/* Additional info for psychologist viewing patient */}
              {userType === 'psychologist' && userInfo.name && (
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span>Consultas: {userInfo.consultations || 0}</span>
                  <span>SOS: {userInfo.sosCount || 0}</span>
                  <span className="flex items-center gap-1">
                    Avaliação: {userInfo.rating || 0}⭐
                  </span>
                </div>
              )}
              {/* Additional info for patient viewing psychologist */}
              {userType === 'patient' && userInfo.consultations !== undefined && (
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span>Consultas realizadas: {userInfo.consultations}</span>
                  <span className="flex items-center gap-1">
                    Avaliação: {userInfo.rating || 0}⭐
                  </span>
                </div>
              )}
              {/* Status de conexão */}
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${status.color === 'green' ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'} shadow-lg`}></div>
                <span className="text-xs text-gray-400 font-medium">{status.text}</span>
              </div>
            </div>
          </div>
          
          {/* Timer centralizado */}
          <div className="text-center">
            <div className="text-3xl font-mono font-bold text-white bg-black/20 px-4 py-2 rounded-lg mb-1">
              {formatTime(timeLeft)}
            </div>
            <div className="text-xs text-gray-400">Tempo restante</div>
          </div>

          {/* Spacer para manter layout equilibrado */}
          <div className="w-32"></div>
        </div>
      </div>

      {/* Área principal do vídeo - Estilo Google Meet */}
      <div className="flex-1 relative bg-[#202124] overflow-hidden">
        {/* Vídeo remoto */}
        <video 
          ref={remoteVideoRef} 
          autoPlay 
          playsInline 
          className="w-full h-full object-cover"
        />
        
        {/* Indicador de status do participante remoto */}
        {isConnected && (
          <div className="absolute top-6 left-6 z-10">
            <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md rounded-xl px-4 py-2 shadow-lg border border-white/10">
              <div className="flex items-center gap-2">
                <MicOff className="text-red-400" size={18} />
                <span className="text-white font-medium">
                  {userType === 'patient' ? (userInfo.name || 'Psicólogo') : (userInfo.name || 'Paciente')}
                </span>
              </div>
            </div>
          </div>
        )}
        
        {/* Placeholder quando não conectado */}
        {!isConnected && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#202124]">
            <div className="text-center space-y-8 max-w-md mx-4">
              <div className="relative">
                <div className="w-40 h-40 mx-auto rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shadow-2xl">
                  {connectionState === 'connecting' ? (
                    <Loader2 className="w-16 h-16 animate-spin text-white" />
                  ) : (
                    <span className="text-white font-bold text-5xl">
                      {userType === 'patient' ? 'Dr' : (userInfo.name?.charAt(0) || 'P')}
                    </span>
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center animate-pulse">
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-3xl font-semibold text-white">
                  {userType === 'psychologist' ? 'Aguardando paciente...' : 'Conectando com psicólogo...'}
                </h3>
                <p className="text-gray-400 text-lg">
                  {connectionState === 'connecting' ? 'Estabelecendo conexão segura...' : status.text}
                </p>
                <div className="flex items-center justify-center gap-2 mt-4">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Vídeo próprio (self-view) - Estilo Google Meet */}
        <div className="absolute bottom-8 right-8 w-48 h-36 bg-gray-800 rounded-2xl border-2 border-gray-600/50 overflow-hidden shadow-2xl transition-transform hover:scale-105 cursor-pointer">
          {isCameraOff ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center mb-2">
                  <span className="text-white font-semibold text-lg">
                    {userType === 'patient' ? (userInfo.name?.charAt(0) || 'P') : 'Dr'}
                  </span>
                </div>
                <CameraOff className="text-gray-400 mx-auto mb-1" size={24} />
                <div className="text-xs text-gray-400 font-medium">Câmera desligada</div>
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
              {/* Status indicators overlay */}
              <div className="absolute inset-0 pointer-events-none">
                {isMuted && (
                  <div className="absolute top-2 left-2 bg-red-500/90 backdrop-blur-sm rounded-full p-2 shadow-lg">
                    <MicOff className="text-white" size={16} />
                  </div>
                )}
              </div>
              {/* Name label */}
              <div className="absolute bottom-2 left-2 right-2">
                <div className="bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 text-center">
                  <span className="text-white text-xs font-medium">Você</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Barra de controles inferior - Estilo Google Meet */}
      <div className="bg-[#202124] border-t border-gray-600/30 p-6">
        {/* Indicadores de segurança no topo */}
        <div className="flex justify-center items-center gap-6 mb-6 text-gray-400 text-sm">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-400" />
            <span>Conexão criptografada</span>
          </div>
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-blue-400" />
            <span>Qualidade HD</span>
          </div>
        </div>

        {/* Controles principais */}
        <div className="flex justify-center items-center gap-6 max-w-md mx-auto">
          {/* Botão de microfone */}
          <button
            onClick={handleMuteToggle}
            className={`group relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 ${
              isMuted 
                ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30' 
                : 'bg-gray-600 hover:bg-gray-500 shadow-lg'
            }`}
          >
            {isMuted ? (
              <MicOff className="text-white" size={20} />
            ) : (
              <Mic className="text-white" size={20} />
            )}
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-3 py-1 rounded-md text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              {isMuted ? 'Ativar microfone' : 'Desativar microfone'}
            </div>
          </button>

          {/* Botão de câmera */}
          <button
            onClick={handleCameraToggle}
            className={`group relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 ${
              isCameraOff 
                ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30' 
                : 'bg-gray-600 hover:bg-gray-500 shadow-lg'
            }`}
          >
            {isCameraOff ? (
              <CameraOff className="text-white" size={20} />
            ) : (
              <Camera className="text-white" size={20} />
            )}
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-3 py-1 rounded-md text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              {isCameraOff ? 'Ativar câmera' : 'Desativar câmera'}
            </div>
          </button>

          {/* Botão de configurações */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="group relative w-14 h-14 rounded-full bg-gray-600 hover:bg-gray-500 flex items-center justify-center transition-all duration-200 shadow-lg"
          >
            <Settings className="text-white" size={20} />
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-3 py-1 rounded-md text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Configurações
            </div>
          </button>

          {/* Botão de encerrar chamada */}
          <button
            onClick={handleEndCall}
            className="group relative w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all duration-200 shadow-lg shadow-red-500/30 ml-2"
          >
            <PhoneOff className="text-white" size={24} />
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-3 py-1 rounded-md text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Encerrar
            </div>
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      <VideoCallSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        localStream={localStream}
        peerConnection={peerConnection}
        localVideoRef={localVideoRef}
        onStreamUpdate={(stream) => {
          // Update local video element when stream changes
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        }}
      />

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={handleFeedbackClose}
        userType={userType}
        sessionId={sessionId || ''}
        partnerName={userInfo.name}
        onRedirect={handleFeedbackClose}
      />
    </div>
  );
};

export default EmergencyVideoCall;
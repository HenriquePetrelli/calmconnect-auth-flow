import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Camera, CameraOff, PhoneOff, Loader2, AlertTriangle } from 'lucide-react';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  
  const sessionId = propSessionId || paramSessionId;
  const [userType, setUserType] = useState<'psychologist' | 'patient'>(propUserType || 'patient');
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionValid, setSessionValid] = useState(false);

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

  // Validate session on mount
  useEffect(() => {
    const validateSession = async () => {
      if (!sessionId) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: session, error } = await supabase
          .from('webrtc_sessions')
          .select(`
            id,
            emergency_request_id,
            psychologist_id,
            patient_id,
            status,
            expires_at
          `)
          .eq('id', sessionId)
          .single();

        if (error) throw error;

        // Check if session is expired
        if (session.expires_at && new Date(session.expires_at) < new Date()) {
          toast({
            title: 'Sessão Expirada',
            description: 'Esta sessão de videochamada já expirou.',
            variant: 'destructive',
          });
          navigate('/home');
          return;
        }

        // Determine user type based on session data
        const user = await supabase.auth.getUser();
        const userId = user.data.user?.id;

        if (session.psychologist_id === userId) {
          setUserType('psychologist');
        } else if (session.patient_id === userId) {
          setUserType('patient');
        }

        setSessionValid(true);
        setIsLoading(false);
      } catch (error) {
        console.error('Error validating session:', error);
        toast({
          title: 'Sessão Inválida',
          description: 'Não foi possível validar a sessão de videochamada.',
          variant: 'destructive',
        });
        navigate('/home');
      }
    };

    validateSession();
  }, [sessionId, navigate, toast]);

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

      toast({
        title: 'Chamada Finalizada',
        description: 'A videochamada foi encerrada com sucesso.',
      });

      if (onEndCall) {
        onEndCall();
      } else {
        navigate('/home');
      }
    } catch (error) {
      console.error('Error ending call:', error);
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

  if (isLoading || !sessionValid) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-8 text-center space-y-4">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
            <h3 className="text-xl font-semibold">
              {isLoading ? 'Carregando sessão...' : 'Validando sessão...'}
            </h3>
            <p className="text-muted-foreground">
              Aguarde enquanto preparamos sua videochamada.
            </p>
          </CardContent>
        </Card>
      </div>
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
            <span className="text-sm">
              {userType === 'psychologist' ? 'Psicólogo' : 'Paciente'}
            </span>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-mono font-bold">
              {formatTime(timeLeft)}
            </div>
            <div className="text-xs opacity-80">
              Tempo restante
            </div>
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
    </div>
  );
};

export default EmergencyVideoCall;
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, MicOff, PhoneOff, Camera, CameraOff, Clock, User, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { formatTimeOnly } from "@/utils/timezone";
import { useWebRTC } from "@/hooks/useWebRTC";
import { supabase } from "@/integrations/supabase/client";
import { VideoCallSettingsModal } from "@/components/sos/VideoCallSettingsModal";
import { FeedbackModal } from "@/components/sos/FeedbackModal";

interface ConsultationVideoCallProps {
  appointment: {
    id: string;
    scheduled_at: string;
    psychologist: {
      full_name: string;
      specialty?: string;
      specialization?: string;
    };
  };
  onEndCall: () => void;
}

const ConsultationVideoCall = ({ appointment, onEndCall }: ConsultationVideoCallProps) => {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Initialize WebRTC for consultation
  const {
    localStream,
    remoteStream,
    connectionState,
    isConnected,
    error,
    toggleAudio,
    toggleVideo,
    cleanup: cleanupWebRTC,
  } = useWebRTC({
    sessionId: sessionId || '',
    userType: 'patient',
    onConnectionStateChange: (state) => {
      console.log('WebRTC connection state:', state);
    }
  });

  // Initialize WebRTC session for consultation
  useEffect(() => {
    initializeConsultationSession();
  }, [appointment.id]);

  // Timer for consultation duration
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Update video refs when streams change
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const initializeConsultationSession = async () => {
    try {
      // Create WebRTC session for consultation
      const { data: session, error } = await supabase
        .from('webrtc_sessions')
        .insert({
          patient_id: (await supabase.auth.getUser()).data.user?.id,
          status: 'pending',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        })
        .select()
        .single();

      if (error) throw error;
      
      console.log('Created consultation session:', session.id);
      setSessionId(session.id);
    } catch (error) {
      console.error('Error creating consultation session:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao inicializar videochamada',
        variant: 'destructive',
      });
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleMute = () => {
    const muted = toggleAudio();
    setIsMuted(muted);
    
    // Update session in database
    if (sessionId) {
      supabase
        .from('webrtc_sessions')
        .update({ patient_muted: muted })
        .eq('id', sessionId)
        .then(() => console.log('Mute status updated:', muted));
    }
  };

  const handleToggleCamera = () => {
    const cameraOff = toggleVideo();
    setIsCameraOff(cameraOff);
    
    // Update session in database
    if (sessionId) {
      supabase
        .from('webrtc_sessions')
        .update({ patient_camera_off: cameraOff })
        .eq('id', sessionId)
        .then(() => console.log('Camera status updated:', cameraOff));
    }
  };

  const handleEndCall = async () => {
    try {
      // Update session status
      if (sessionId) {
        const user = await supabase.auth.getUser();
        await supabase
          .from('webrtc_sessions')
          .update({ 
            status: 'completed',
            ended_by: user.data.user?.id,
            ended_by_type: 'patient',
            ended_at: new Date().toISOString()
          })
          .eq('id', sessionId);
      }
      
      // Clean up WebRTC
      cleanupWebRTC();
      
      // Show feedback modal
      setShowFeedbackModal(true);
    } catch (error) {
      console.error('Error ending call:', error);
      // Still show feedback modal
      setShowFeedbackModal(true);
    }
  };

  const handleFeedbackClose = () => {
    setShowFeedbackModal(false);
    toast({
      title: "Consulta finalizada",
      description: "Obrigado por usar nossos serviços.",
    });
    onEndCall();
    navigate('/appointments');
  };

  const psychologistInitials = appointment.psychologist.full_name
    .split(' ')
    .map(name => name[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header com informações da consulta */}
      <div className="bg-primary text-primary-foreground p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Consulta em Andamento</h1>
            <p className="text-sm opacity-90">
              Agendada para {formatTimeOnly(appointment.scheduled_at)}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xl font-mono font-bold">{formatDuration(timeElapsed)}</div>
            <div className="text-xs opacity-75">Duração</div>
          </div>
        </div>
      </div>

      {/* Área do vídeo principal */}
      <div className="flex-1 relative bg-gradient-to-b from-card to-card/50">
        {/* Vídeo do psicólogo */}
        <div className="w-full h-full flex items-center justify-center p-8">
          <Card className="w-full max-w-md border-primary/20">
            <CardContent className="p-8 text-center space-y-6">
                        {/* Real WebRTC video elements */}
                        <video
                          ref={remoteVideoRef}
                          autoPlay
                          playsInline
                          muted={false}
                          className="w-full h-full object-cover"
                          style={{ display: remoteStream ? 'block' : 'none' }}
                        />
                        
                        {/* Fallback when no remote video */}
                        {!remoteStream && (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-primary/10">
                            <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center">
                              <span className="text-primary-foreground font-bold text-xl">
                                {psychologistInitials}
                              </span>
                            </div>
                            <div className="mt-4 space-y-2 text-center">
                              <h3 className="text-xl font-semibold text-foreground">
                                {appointment.psychologist.full_name}
                              </h3>
                              <p className="text-muted-foreground text-sm">
                                {appointment.psychologist.specialty || appointment.psychologist.specialization || 'Psicólogo'}
                              </p>
                              <div className="mt-4 p-3 bg-primary/10 dark:bg-primary/10 rounded-lg border border-primary/20 dark:border-primary/30">
                                <div className="flex items-center justify-center gap-2">
                                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                                  <p className="text-primary-hover dark:text-primary text-sm font-medium">
                                    {connectionState === 'connected' ? 'Conectado' : 'Conectando...'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
            </CardContent>
          </Card>
        </div>

        {/* Local video (canto inferior direito) */}
        <div className="absolute bottom-6 right-6 w-36 h-28 bg-card rounded-lg border-2 border-border shadow-lg overflow-hidden">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ display: localStream && !isCameraOff ? 'block' : 'none' }}
          />
          {(!localStream || isCameraOff) && (
            <div className="w-full h-full flex flex-col items-center justify-center bg-muted">
              <CameraOff className="text-muted-foreground mb-1" size={20} />
              <span className="text-xs text-muted-foreground">Câmera desligada</span>
            </div>
          )}
        </div>
      </div>

      {/* Controles da chamada */}
      <div className="p-6 bg-card border-t border-border">
        <div className="flex justify-center items-center space-x-8">
          <Button
            variant={isMuted ? "destructive" : "secondary"}
            size="icon"
            className="w-14 h-14 rounded-full"
            onClick={handleToggleMute}
          >
            {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
          </Button>

          <Button
            variant="destructive"
            size="icon"
            className="w-16 h-16 rounded-full bg-destructive hover:bg-destructive/90 shadow-lg"
            onClick={handleEndCall}
          >
            <PhoneOff size={26} />
          </Button>

          <Button
            variant={isCameraOff ? "destructive" : "secondary"}
            size="icon"
            className="w-14 h-14 rounded-full"
            onClick={handleToggleCamera}
          >
            {isCameraOff ? <CameraOff size={22} /> : <Camera size={22} />}
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="w-14 h-14 rounded-full"
            onClick={() => setShowSettingsModal(true)}
          >
            <Settings size={22} />
          </Button>
        </div>
        
        <div className="text-center mt-4">
          <p className="text-sm text-muted-foreground">
            Consulta de 50 minutos
          </p>
          {error && (
            <p className="text-xs text-destructive mt-2">
              {error}
            </p>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      <VideoCallSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        localStream={localStream}
        onStreamUpdate={() => {
          // Stream will be updated automatically by the settings modal
        }}
      />

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={handleFeedbackClose}
        sessionId={sessionId}
        userType="patient"
      />
    </div>
  );
};

export default ConsultationVideoCall;
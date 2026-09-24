import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, MicOff, PhoneOff, Camera, CameraOff, Settings, Loader2, WifiOff, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatTimeOnly } from "@/utils/timezone";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useCallPresence } from "@/hooks/useCallPresence";
import { useParticipantHeartbeat } from "@/hooks/useParticipantHeartbeat";
import { useSharedCallTimer } from "@/hooks/useSharedCallTimer";
import { getConnectionBannerState, isRemoteDropInvoluntary } from "@/lib/callBanner";
import { consultationDurationMinutes, consultationEndedMessage } from "@/lib/consultationWindow";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { VideoCallSettingsModal } from "@/components/sos/VideoCallSettingsModal";
import { FeedbackModal } from "@/components/sos/FeedbackModal";
import { ConnectionQuality } from "@/components/sos/ConnectionQuality";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConsultationVideoCallProps {
  appointment: {
    id: string;
    scheduled_at: string;
    duration?: number | null;
    psychologist: {
      full_name: string;
      specialty?: string;
      specialization?: string;
    };
  };
  onEndCall: () => void;
}

/** Warns both participants once this much time is left. */
const WARN_REMAINING_SECONDS = 5 * 60;

const formatClock = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const ConsultationVideoCall = ({ appointment, onEndCall }: ConsultationVideoCallProps) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  // Set when the OTHER participant ended the consultation.
  const [endedMessage, setEndedMessage] = useState<string | null>(null);
  const endedLocallyRef = useRef(false);
  const warnedRef = useRef(false);
  const { toast } = useToast();
  const { userType: authUserType } = useAuth();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // RouteGuard only lets 'patient' or 'psychologist' reach this screen.
  const userType: 'patient' | 'psychologist' =
    authUserType === 'psychologist' ? 'psychologist' : 'patient';
  const timeLimit = consultationDurationMinutes(appointment) * 60;

  const {
    localStream,
    remoteStream,
    peerConnection,
    connectionState,
    isConnected,
    error,
    callEndedBy,
    isReconnecting,
    reconnectAttempt,
    isNetworkOffline,
    forceReconnect,
    toggleAudio,
    toggleVideo,
    cleanup: cleanupWebRTC,
    sendCallEndedSignal,
  } = useWebRTC({
    sessionId: sessionId || '',
    userType,
  });

  const callOver = Boolean(endedMessage) || showFeedbackModal;

  // Who is actually in the room (realtime presence) — tells a network drop of
  // the other participant apart from them ending the consultation.
  const { remotePresent, remoteLeftAt } = useCallPresence({
    sessionId: sessionId ?? undefined,
    userType,
    enabled: Boolean(sessionId) && !callOver,
  });

  // Durable heartbeat in participant_presence (15s beat, 45s = away).
  useParticipantHeartbeat({
    sessionId: sessionId ?? undefined,
    userType,
    enabled: Boolean(sessionId) && !callOver,
  });

  const remoteDroppedInvoluntarily = isRemoteDropInvoluntary(remotePresent, remoteLeftAt, callOver);
  const banner = getConnectionBannerState({
    isReconnecting,
    isNetworkOffline,
    remoteDroppedInvoluntarily,
    callTerminated: callOver,
    reconnectAttempt,
    userType,
  });

  // Countdown shared by both sides, persisted in webrtc_sessions: pauses while
  // someone is out of the room and resumes from where it stopped. Running out
  // does not cut the consultation — it only tells both sides time is up.
  const { timeLeft, isPaused: isTimerPaused } = useSharedCallTimer({
    sessionId: sessionId ?? undefined,
    userType,
    timeLimit,
    running: isConnected && remotePresent && !isReconnecting && !isNetworkOffline && !callOver,
    onExpire: useCallback(() => {
      toast({
        title: 'Tempo da consulta esgotado',
        description: 'Vocês podem se despedir e encerrar quando quiserem.',
      });
    }, [toast]),
  });

  useEffect(() => {
    if (warnedRef.current || callOver) return;
    if (timeLeft > 0 && timeLeft <= WARN_REMAINING_SECONDS) {
      warnedRef.current = true;
      toast({ title: 'Faltam 5 minutos para o fim da consulta' });
    }
  }, [timeLeft, callOver, toast]);

  useEffect(() => {
    initializeConsultationSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointment.id]);

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

  // The other participant ended the consultation (data channel signal or the
  // realtime session row — useWebRTC already filters stale terminations).
  useEffect(() => {
    if (!callEndedBy || endedLocallyRef.current || endedMessage) return;
    setEndedMessage(consultationEndedMessage(callEndedBy.userType));
    cleanupWebRTC();
  }, [callEndedBy, endedMessage, cleanupWebRTC]);

  const initializeConsultationSession = async () => {
    try {
      // Reuses the same WebRTC session for both participants — keyed by the
      // appointment itself, not created fresh per browser tab — so patient
      // and psychologist actually land on the same signaling row.
      const { data: roomId, error } = await supabase.rpc('get_or_create_appointment_webrtc_session', {
        p_appointment_id: appointment.id,
      });

      if (error) throw error;
      setSessionId(roomId);
    } catch (error) {
      console.error('Error creating consultation session:', error);
      toast({
        title: 'Não foi possível abrir a videochamada',
        description: 'Verifique sua conexão e tente entrar de novo.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleMute = () => {
    const muted = toggleAudio();
    setIsMuted(muted);
    if (sessionId) {
      const payload = userType === 'psychologist' ? { psychologist_muted: muted } : { patient_muted: muted };
      supabase.from('webrtc_sessions').update(payload).eq('id', sessionId);
    }
  };

  const handleToggleCamera = () => {
    const cameraOff = toggleVideo();
    setIsCameraOff(cameraOff);
    if (sessionId) {
      const payload = userType === 'psychologist'
        ? { psychologist_camera_off: cameraOff }
        : { patient_camera_off: cameraOff };
      supabase.from('webrtc_sessions').update(payload).eq('id', sessionId);
    }
  };

  const handleEndCall = async () => {
    endedLocallyRef.current = true;
    setShowEndConfirm(false);
    try {
      // Fast path: tell the peer right away over the data channel.
      sendCallEndedSignal?.({ endedByType: userType, reason: 'ended_by_participant' });
      if (sessionId) {
        const user = await supabase.auth.getUser();
        await supabase
          .from('webrtc_sessions')
          .update({
            status: 'completed',
            ended_by: user.data.user?.id,
            ended_by_type: userType,
            ended_at: new Date().toISOString()
          })
          .eq('id', sessionId);
      }
    } catch (error) {
      console.error('Error ending call:', error);
    } finally {
      cleanupWebRTC();
      setShowFeedbackModal(true);
    }
  };

  const handleFeedbackClose = () => {
    setShowFeedbackModal(false);
    onEndCall();
  };

  // What each side sees as "the other person" when there's no video.
  const remoteName = userType === 'patient' ? appointment.psychologist.full_name : 'Paciente';
  const remoteSubtitle = userType === 'patient'
    ? appointment.psychologist.specialty || appointment.psychologist.specialization || 'Psicólogo'
    : 'Consulta agendada';
  const remoteInitials = remoteName
    .split(' ')
    .map(name => name[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const waitingForRemote = !remotePresent && !remoteLeftAt;
  const statusText = waitingForRemote
    ? `Aguardando ${userType === 'patient' ? 'o psicólogo' : 'o paciente'} entrar na sala...`
    : connectionState === 'connected' ? 'Conectado' : 'Conectando...';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Cabeçalho com horário e tempo restante */}
      <div className="bg-primary text-primary-foreground p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Consulta em andamento</h1>
            <p className="text-sm opacity-90">
              Agendada para {formatTimeOnly(appointment.scheduled_at)}
            </p>
          </div>
          <div className="text-right" data-testid="consultation-timer">
            <div className="text-xl font-mono font-bold">
              {timeLeft > 0 ? formatClock(timeLeft) : 'Tempo esgotado'}
            </div>
            <div className="text-xs opacity-75">
              {isTimerPaused && !callOver ? 'Pausado' : 'Restante'}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 relative bg-gradient-to-b from-card to-card/50">
        {peerConnection && isConnected && !callOver && (
          <div className="absolute top-4 right-4 z-30">
            <ConnectionQuality peerConnection={peerConnection} />
          </div>
        )}

        {/* Queda de conexão / reconexão automática */}
        {banner.visible && (
          <div
            data-testid="connection-banner"
            role="status"
            className="absolute top-4 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md"
          >
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-warning/90 text-warning-foreground px-4 py-3 shadow-lg backdrop-blur-sm text-center">
              <div className="flex items-center gap-2">
                {banner.variant === 'offline' ? (
                  <WifiOff className="w-4 h-4" />
                ) : (
                  <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />
                )}
                <span className="text-sm font-medium">{banner.title}</span>
              </div>
              <span className="text-xs opacity-90">{banner.description}</span>
              {banner.showRetry && (
                <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={forceReconnect}>
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Tentar reconectar
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="w-full h-full flex items-center justify-center p-8">
          <Card className="w-full max-w-md border-primary/20">
            <CardContent className="p-8 text-center space-y-6">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                muted={false}
                className="w-full h-full object-cover"
                style={{ display: remoteStream ? 'block' : 'none' }}
              />

              {!remoteStream && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-primary/10">
                  <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-xl">{remoteInitials}</span>
                  </div>
                  <div className="mt-4 space-y-2 text-center">
                    <h3 className="text-xl font-semibold text-foreground">{remoteName}</h3>
                    <p className="text-muted-foreground text-sm">{remoteSubtitle}</p>
                    <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse motion-reduce:animate-none"></div>
                        <p className="text-primary-hover dark:text-primary text-sm font-medium">{statusText}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

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

        {/* O outro participante encerrou */}
        {endedMessage && !showFeedbackModal && (
          <div
            data-testid="consultation-ended-overlay"
            className="absolute inset-0 z-50 flex items-center justify-center bg-background/95 p-6"
          >
            <div className="max-w-sm text-center space-y-4">
              <PhoneOff className="w-10 h-10 mx-auto text-muted-foreground" />
              <h2 className="text-xl font-semibold text-foreground">Consulta encerrada</h2>
              <p className="text-muted-foreground">{endedMessage}</p>
              <Button className="w-full" onClick={() => setShowFeedbackModal(true)}>
                Continuar
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-card border-t border-border">
        <div className="flex justify-center items-center space-x-8">
          <Button
            variant={isMuted ? "destructive" : "secondary"}
            size="icon"
            className="w-14 h-14 rounded-full"
            onClick={handleToggleMute}
            disabled={callOver}
            aria-label={isMuted ? "Ativar microfone" : "Silenciar microfone"}
          >
            {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
          </Button>

          <Button
            variant="destructive"
            size="icon"
            className="w-16 h-16 rounded-full bg-destructive hover:bg-destructive/90 shadow-lg"
            onClick={() => setShowEndConfirm(true)}
            disabled={callOver}
            aria-label="Encerrar consulta"
          >
            <PhoneOff size={26} />
          </Button>

          <Button
            variant={isCameraOff ? "destructive" : "secondary"}
            size="icon"
            className="w-14 h-14 rounded-full"
            onClick={handleToggleCamera}
            disabled={callOver}
            aria-label={isCameraOff ? "Ativar câmera" : "Desativar câmera"}
          >
            {isCameraOff ? <CameraOff size={22} /> : <Camera size={22} />}
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="w-14 h-14 rounded-full"
            onClick={() => setShowSettingsModal(true)}
            aria-label="Configurações de vídeo e áudio"
          >
            <Settings size={22} />
          </Button>
        </div>

        <div className="text-center mt-4">
          <p className="text-sm text-muted-foreground">
            Consulta de {consultationDurationMinutes(appointment)} minutos
          </p>
          {error && <p className="text-xs text-destructive mt-2">{error}</p>}
        </div>
      </div>

      <AlertDialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar a consulta?</AlertDialogTitle>
            <AlertDialogDescription>
              A chamada termina para os dois. Se a sua conexão caiu, não é preciso encerrar — dá para voltar à sala enquanto ela estiver aberta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar na consulta</AlertDialogCancel>
            <AlertDialogAction onClick={handleEndCall}>Encerrar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <VideoCallSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        localStream={localStream}
        onStreamUpdate={() => {
          // Stream will be updated automatically by the settings modal
        }}
      />

      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={handleFeedbackClose}
        sessionId={sessionId}
        userType={userType}
      />
    </div>
  );
};

export default ConsultationVideoCall;

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, MicOff, PhoneOff, Camera, CameraOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WebRTCVideoCallProps {
  sessionId: string;
  userType: 'psychologist' | 'patient';
  onEndCall: () => void;
}

export const WebRTCVideoCall = ({ sessionId, userType, onEndCall }: WebRTCVideoCallProps) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [timeLeft, setTimeLeft] = useState(1200); // 20 minutes
  const { toast } = useToast();

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          toast({
            title: "Chamada finalizada",
            description: "O tempo da sessão chegou ao fim.",
          });
          onEndCall();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onEndCall, toast]);

  useEffect(() => {
    initWebRTC();
    return () => cleanup();
  }, [sessionId, userType]);

  const initWebRTC = async () => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setLocalStream(stream);

      // Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      // Add local stream tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          handleIceCandidate(event.candidate);
        }
      };

      // Handle remote stream
      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setStatus('connected');
        }
      };

      pc.onconnectionstatechange = () => {
        console.log('Connection state:', pc.connectionState);
        setStatus(pc.connectionState);
      };

      setPeerConnection(pc);

      // Set up realtime subscription
      const channel = supabase
        .channel(`webrtc_${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'webrtc_sessions',
            filter: `id=eq.${sessionId}`
          },
          (payload) => {
            handleSessionUpdate(payload.new, pc);
          }
        )
        .subscribe();

      // If psychologist, create offer
      if (userType === 'psychologist') {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        await supabase
          .from('webrtc_sessions')
          .update({ 
            offer: offer as any,
            psychologist_id: (await supabase.auth.getUser()).data.user?.id 
          })
          .eq('id', sessionId);
      }

    } catch (error) {
      console.error('Error initializing WebRTC:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao acessar câmera e microfone',
        variant: 'destructive',
      });
    }
  };

  const handleSessionUpdate = async (sessionData: any, pc: RTCPeerConnection) => {
    try {
      if (sessionData.offer && userType === 'patient' && !pc.remoteDescription) {
        await handleOffer(sessionData.offer, pc);
      } else if (sessionData.answer && userType === 'psychologist' && !pc.remoteDescription) {
        await handleAnswer(sessionData.answer, pc);
      }

      // Handle ICE candidates
      if (sessionData.ice_candidates && Array.isArray(sessionData.ice_candidates)) {
        for (const candidateData of sessionData.ice_candidates) {
          if (candidateData && typeof candidateData === 'object') {
            try {
              const candidate = new RTCIceCandidate(candidateData);
              if (pc.remoteDescription) {
                await pc.addIceCandidate(candidate);
              }
            } catch (err) {
              console.warn('Error adding ICE candidate:', err);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error handling session update:', error);
    }
  };

  const handleOffer = async (offer: RTCSessionDescriptionInit, pc: RTCPeerConnection) => {
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      await supabase
        .from('webrtc_sessions')
        .update({ 
          answer: answer as any,
          patient_id: (await supabase.auth.getUser()).data.user?.id 
        })
        .eq('id', sessionId);
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };

  const handleAnswer = async (answer: RTCSessionDescriptionInit, pc: RTCPeerConnection) => {
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  };

  const handleIceCandidate = async (candidate: RTCIceCandidate) => {
    try {
      // Get current candidates and add new one
      const { data: session } = await supabase
        .from('webrtc_sessions')
        .select('ice_candidates')
        .eq('id', sessionId)
        .single();

      const currentCandidates = session?.ice_candidates || [];
      const newCandidates = [...currentCandidates, candidate.toJSON() as any];

      await supabase
        .from('webrtc_sessions')
        .update({ ice_candidates: newCandidates as any })
        .eq('id', sessionId);
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
      }
    }
  };

  const handleEndCall = () => {
    cleanup();
    toast({
      title: "Chamada finalizada",
      description: "Obrigado por usar nosso serviço.",
    });
    onEndCall();
  };

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnection) {
      peerConnection.close();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header com timer */}
      <div className="bg-primary text-primary-foreground p-4 text-center">
        <div className="text-lg font-semibold">
          {status === 'connected' ? 'Chamada Conectada' : 'Conectando...'}
        </div>
        <div className="text-2xl font-mono font-bold">{formatTime(timeLeft)}</div>
      </div>

      {/* Área do vídeo principal */}
      <div className="flex-1 relative bg-secondary">
        {/* Vídeo remoto */}
        <video 
          ref={remoteVideoRef} 
          autoPlay 
          playsInline 
          className="w-full h-full object-cover"
        />
        
        {/* Placeholder quando não há vídeo remoto */}
        {status !== 'connected' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Card className="w-full max-w-md mx-4">
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-24 h-24 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-xl">
                      {userType === 'psychologist' ? 'P' : 'PS'}
                    </span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-1">
                    {userType === 'psychologist' ? 'Aguardando paciente...' : 'Conectando com psicólogo...'}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {status === 'connecting' ? 'Estabelecendo conexão...' : 'Aguardando participante'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Vídeo próprio (canto inferior direito) */}
        <div className="absolute bottom-4 right-4 w-32 h-24 bg-secondary rounded-lg border-2 border-border overflow-hidden">
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
              className="w-full h-full object-cover"
            />
          )}
        </div>
      </div>

      {/* Controles da chamada */}
      <div className="p-6 bg-background border-t">
        <div className="flex justify-center space-x-6">
          <Button
            variant={isMuted ? "destructive" : "secondary"}
            size="icon"
            className="w-12 h-12 rounded-full"
            onClick={toggleMute}
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
            onClick={toggleCamera}
          >
            {isCameraOff ? <CameraOff size={20} /> : <Camera size={20} />}
          </Button>
        </div>
      </div>
    </div>
  );
};
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, MicOff, PhoneOff, Camera, CameraOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FeedbackModal } from '@/components/sos/FeedbackModal';

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
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [userInfo, setUserInfo] = useState<{name: string; details: string}>({name: '', details: ''});
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
    fetchUserInfo();
    return () => cleanup();
  }, [sessionId, userType]);

  const fetchUserInfo = async () => {
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

      if (userType === 'patient') {
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
    setShowFeedbackModal(true);
  };

  const handleFeedbackClose = () => {
    setShowFeedbackModal(false);
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
    <div className="min-h-screen bg-slate-900 flex flex-col relative">
      {/* Header com informações do usuário e timer */}
      <div className="bg-slate-800/90 backdrop-blur-sm text-white p-4 z-10">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Informações do participante */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {userType === 'psychologist' ? 'Dr' : userInfo.name?.charAt(0) || 'P'}
              </span>
            </div>
            <div>
              <div className="font-semibold">
                {userType === 'patient' && userInfo.name ? `Dr. ${userInfo.name}` : 
                 userType === 'psychologist' && userInfo.name ? userInfo.name : 
                 'Conectando...'}
              </div>
              {userInfo.details && (
                <div className="text-sm text-slate-300 max-w-xs truncate">
                  {userType === 'patient' 
                    ? userInfo.details
                    : `Sintomas: ${userInfo.details}`
                  }
                </div>
              )}
            </div>
          </div>
          
          {/* Timer e status */}
          <div className="text-center">
            <div className="flex items-center gap-2 justify-center mb-1">
              <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-400' : 'bg-yellow-400'} animate-pulse`}></div>
              <span className="text-sm text-slate-300">
                {status === 'connected' ? 'Conectado' : 'Conectando...'}
              </span>
            </div>
            <div className="text-2xl font-mono font-bold">{formatTime(timeLeft)}</div>
          </div>

          {/* Informações adicionais do psicólogo */}
          {userType === 'psychologist' && userInfo.name && (
            <div className="text-right text-sm text-slate-300">
              <div>Consultas: --</div>
              <div>SOS anteriores: --</div>
              <div>Avaliação: ⭐⭐⭐⭐⭐</div>
            </div>
          )}
        </div>
      </div>

      {/* Área principal do vídeo */}
      <div className="flex-1 relative bg-slate-900">
        {/* Vídeo remoto */}
        <video 
          ref={remoteVideoRef} 
          autoPlay 
          playsInline 
          className="w-full h-full object-cover"
        />
        
        {/* Indicador de microfone mutado sobre o vídeo remoto */}
        {status === 'connected' && (
          <div className="absolute top-4 left-4 z-10">
            <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-2">
              <MicOff className="text-red-400" size={16} />
              <span className="text-white text-sm">{userInfo.name || 'Participante'}</span>
            </div>
          </div>
        )}
        
        {/* Placeholder quando não há vídeo remoto */}
        {status !== 'connected' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <div className="text-center space-y-6 max-w-md mx-4">
              <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-2xl">
                <span className="text-white font-bold text-4xl">
                  {userType === 'psychologist' ? 'P' : 'Dr'}
                </span>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-semibold text-white">
                  {userType === 'psychologist' ? 'Aguardando paciente...' : 'Conectando com psicólogo...'}
                </h3>
                <p className="text-slate-400">
                  {status === 'connecting' ? 'Estabelecendo conexão segura...' : 'Aguardando participante'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Vídeo próprio (miniatura no canto) */}
        <div className="absolute bottom-6 right-6 w-40 h-28 bg-slate-800 rounded-xl border-2 border-slate-700 overflow-hidden shadow-2xl group hover:scale-105 transition-transform">
          {isCameraOff ? (
            <div className="w-full h-full flex items-center justify-center bg-slate-800">
              <div className="text-center">
                <CameraOff className="text-slate-400 mx-auto mb-1" size={20} />
                <div className="text-xs text-slate-400">Você</div>
              </div>
            </div>
          ) : (
            <>
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Indicador de microfone no vídeo local */}
              {isMuted && (
                <div className="absolute top-1 left-1 bg-red-500 rounded-full p-1">
                  <MicOff className="text-white" size={12} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Barra de controles inferior moderna */}
      <div className="bg-slate-800/95 backdrop-blur-sm border-t border-slate-700 p-6">
        <div className="flex justify-center items-center gap-8 max-w-lg mx-auto">
          {/* Botão de microfone */}
          <button
            onClick={toggleMute}
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
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-3 py-1 rounded-lg text-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
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
            onClick={toggleCamera}
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
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-3 py-1 rounded-lg text-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
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
        sessionId={sessionId}
        partnerName={userInfo.name}
      />
    </div>
  );
};
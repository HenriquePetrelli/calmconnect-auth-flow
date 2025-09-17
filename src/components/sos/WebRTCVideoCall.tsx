import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, MicOff, PhoneOff, Camera, CameraOff, Settings, Shield, Video } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FeedbackModal } from '@/components/sos/FeedbackModal';
import { VideoCallSettingsModal } from '@/components/sos/VideoCallSettingsModal';
import VoiceMeter from '@/components/sos/VoiceMeter';

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
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [userInfo, setUserInfo] = useState<{
    name: string; 
    details: string;
    consultations?: number;
    sosCount?: number;
    rating?: number;
  }>({name: '', details: ''});
  const [remoteMuted, setRemoteMuted] = useState(false);
  const [remoteIsCameraOff, setRemoteIsCameraOff] = useState(false);
  const [callEndedBy, setCallEndedBy] = useState<{userId: string, userType: string} | null>(null);
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

      // Set up session status listener for remote user actions
      const handleRemoteStatusUpdate = (event: CustomEvent) => {
        const sessionData = event.detail;
        
        // Check if call was ended by remote user
        if (sessionData.ended_by && sessionData.ended_by_type) {
          const remoteUserType = userType === 'patient' ? 'psychologist' : 'patient';
          if (sessionData.ended_by_type === remoteUserType) {
            setCallEndedBy({
              userId: sessionData.ended_by,
              userType: sessionData.ended_by_type
            });
          }
        }
        
        // Update remote mute/camera status
        const remoteUserType = userType === 'patient' ? 'psychologist' : 'patient';
        const remoteMutedKey = `${remoteUserType}_muted`;
        const remoteCameraOffKey = `${remoteUserType}_camera_off`;
        
        if (sessionData[remoteMutedKey] !== undefined) {
          setRemoteMuted(sessionData[remoteMutedKey]);
        }
        
        if (sessionData[remoteCameraOffKey] !== undefined) {
          setRemoteIsCameraOff(sessionData[remoteCameraOffKey]);
        }
      };

      window.addEventListener('webrtc-session-update', handleRemoteStatusUpdate as EventListener);

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
        const state = pc.connectionState;
        setStatus(state);
        
        if (state === 'failed' || state === 'disconnected') {
          // Check if call was ended by someone instead of connection failure
          if (callEndedBy) {
            const endedByName = callEndedBy.userType === 'psychologist' ? 'O psicólogo' : 'O paciente';
            toast({
              title: "Chamada finalizada",
              description: `${endedByName} finalizou a chamada.`,
            });
          } else {
            toast({
              title: "Erro na Videochamada",
              description: "Conexão perdida. Tentando reconectar...",
              variant: "destructive",
            });
          }
        }
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
            // Dispatch custom event for other listeners
            window.dispatchEvent(new CustomEvent('webrtc-session-update', { detail: payload.new }));
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
        const muted = !audioTrack.enabled;
        setIsMuted(muted);
        
        // Update database to notify remote user
        supabase
          .from('webrtc_sessions')
          .update({ 
            [`${userType}_muted`]: muted
          })
          .eq('id', sessionId)
          .then(() => console.log('🎤 Mute status communicated:', muted ? 'muted' : 'unmuted'));
      }
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        const cameraOff = !videoTrack.enabled;
        setIsCameraOff(cameraOff);
        
        // Update database to notify remote user
        supabase
          .from('webrtc_sessions')
          .update({ 
            [`${userType}_camera_off`]: cameraOff
          })
          .eq('id', sessionId)
          .then(() => console.log('📹 Camera status communicated:', cameraOff ? 'off' : 'on'));
      }
    }
  };

  const handleEndCall = async () => {
    try {
      // Update session status with who ended the call
      const user = await supabase.auth.getUser();
      if (sessionId && user.data.user) {
        await supabase
          .from('webrtc_sessions')
          .update({ 
            status: 'completed',
            ended_by: user.data.user.id,
            ended_by_type: userType
          })
          .eq('id', sessionId);
      }
      
      // Clean up WebRTC connections
      cleanup();
      
      // Show feedback modal
      setShowFeedbackModal(true);
    } catch (error) {
      console.error('Error ending call:', error);
      // Still proceed with cleanup even if database update fails
      cleanup();
      setShowFeedbackModal(true);
    }
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
    console.log('🧹 Cleaning up WebRTC resources...');
    
    // Stop all media tracks properly and completely
    if (localStream) {
      console.log('🛑 Stopping local stream tracks...');
      localStream.getTracks().forEach(track => {
        if (track.readyState !== 'ended') {
          track.stop();
          console.log(`🛑 Stopped ${track.kind} track - readyState: ${track.readyState}`);
        }
      });
      
      // Clear video elements to remove any lingering streams
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
        console.log('🧹 Cleared local video element');
      }
    }
    
    // Stop remote stream tracks if any
    if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
      const remoteStream = remoteVideoRef.current.srcObject as MediaStream;
      console.log('🛑 Stopping remote stream tracks...');
      remoteStream.getTracks().forEach(track => {
        if (track.readyState !== 'ended') {
          track.stop();
          console.log(`🛑 Stopped remote ${track.kind} track`);
        }
      });
      
      remoteVideoRef.current.srcObject = null;
      console.log('🧹 Cleared remote video element');
    }
    
    // Close peer connection properly
    if (peerConnection) {
      try {
        // Stop all transceivers first
        peerConnection.getTransceivers().forEach(transceiver => {
          if (transceiver.stop) {
            transceiver.stop();
            console.log(`🛑 Stopped ${transceiver.direction} transceiver`);
          }
        });
        
        // Remove all tracks from connection
        peerConnection.getSenders().forEach(sender => {
          if (sender.track) {
            peerConnection.removeTrack(sender);
            console.log(`🗑️ Removed ${sender.track.kind} sender`);
          }
        });
        
        // Close the connection
        if (peerConnection.connectionState !== 'closed') {
          peerConnection.close();
          console.log('🔌 Peer connection closed');
        }
      } catch (error) {
        console.warn('⚠️ Error closing peer connection:', error);
      }
    }
    
    console.log('✅ Complete WebRTC cleanup finished');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#202124] flex flex-col relative">
      {/* Header com informações do usuário e timer */}
      <div className="bg-[#303134]/95 backdrop-blur-sm text-white p-4 z-10 border-b border-gray-600/30">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Informações do participante */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
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
            </div>
          </div>
          
          {/* Timer centralizado */}
          <div className="text-center">
            <div className="flex items-center gap-2 justify-center mb-1">
              <div className={`w-3 h-3 rounded-full ${status === 'connected' ? 'bg-green-400' : 'bg-yellow-400'} animate-pulse shadow-lg`}></div>
              <span className="text-sm text-gray-300 font-medium">
                {status === 'connected' ? 'Conectado' : 'Conectando...'}
              </span>
            </div>
            <div className="text-3xl font-mono font-bold text-white bg-black/20 px-4 py-2 rounded-lg">
              {formatTime(timeLeft)}
            </div>
            <div className="text-xs text-gray-400 mt-1">Tempo restante</div>
          </div>

          {/* Spacer para manter layout equilibrado */}
          <div className="w-32"></div>
        </div>
      </div>

      {/* Área principal do vídeo */}
      <div className="flex-1 relative bg-[#202124] overflow-hidden">
        {/* Vídeo remoto */}
        {remoteIsCameraOff ? (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-2xl">
              <span className="text-white font-bold text-4xl">
                {userType === 'patient' ? 'Dr' : (userInfo.name?.charAt(0)?.toUpperCase() || 'P')}
              </span>
            </div>
          </div>
        ) : (
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover"
          />
        )}
        
        {/* Indicador de status do participante remoto */}
        {status === 'connected' && (
          <div className="absolute top-6 left-6 z-10">
            <div className="flex items-center gap-3 bg-black/70 backdrop-blur-md rounded-xl px-4 py-2 shadow-lg border border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">{userInfo.name || 'Participante'}</span>
                {remoteMuted && (
                  <MicOff className="w-4 h-4 text-red-400" />
                )}
              </div>
              {/* Voice meter for remote user */}
              {!remoteMuted && (
                <VoiceMeter 
                  stream={remoteVideoRef.current?.srcObject as MediaStream || null} 
                  size="small"
                />
              )}
            </div>
          </div>
        )}
        
        {/* Placeholder quando não há vídeo remoto */}
        {status !== 'connected' && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#202124]">
            <div className="text-center space-y-8 max-w-md mx-4">
              <div className="relative">
                <div className="w-40 h-40 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-2xl">
                  <span className="text-white font-bold text-5xl">
                    {userType === 'patient' ? 'Dr' : (userInfo.name?.charAt(0) || 'P')}
                  </span>
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
                  {status === 'connecting' ? 'Estabelecendo conexão segura...' : 'Aguardando participante'}
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
            onClick={toggleMute}
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
            {/* Tooltip */}
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-3 py-1 rounded-md text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              {isMuted ? 'Ativar microfone' : 'Desativar microfone'}
            </div>
          </button>

          {/* Botão de câmera */}
          <button
            onClick={toggleCamera}
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
          setLocalStream(stream);
        }}
      />

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={handleFeedbackClose}
        userType={userType}
        sessionId={sessionId}
        partnerName={userInfo.name}
        onRedirect={handleFeedbackClose}
      />
    </div>
  );
};
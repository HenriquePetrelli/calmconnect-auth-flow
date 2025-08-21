import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WebRTCSession {
  id: string;
  emergency_request_id?: string;
  psychologist_id?: string;
  patient_id?: string;
  status: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  ice_candidates?: RTCIceCandidateInit[];
}

interface UseWebRTCProps {
  sessionId: string;
  userType: 'psychologist' | 'patient';
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
}

export const useWebRTC = ({ sessionId, userType, onConnectionStateChange }: UseWebRTCProps) => {
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<WebRTCSession | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  const initializeMedia = useCallback(async () => {
    try {
      console.log('🎥 Initializing media devices...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      console.log('✅ Media devices initialized successfully');
      return stream;
    } catch (err) {
      const errorMessage = 'Erro ao acessar câmera e microfone. Verifique as permissões.';
      console.error('❌ Media device error:', err);
      setError(errorMessage);
      toast({
        title: 'Erro de Mídia',
        description: errorMessage,
        variant: 'destructive',
      });
      throw new Error(errorMessage);
    }
  }, [toast]);

  const createPeerConnection = useCallback(async (stream: MediaStream) => {
    console.log('🔗 Creating peer connection...');
    
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10
    });

    // Add local stream tracks
    stream.getTracks().forEach(track => {
      console.log(`📡 Adding ${track.kind} track to peer connection`);
      pc.addTrack(track, stream);
    });

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log(`🔄 Connection state changed: ${state}`);
      setConnectionState(state);
      setIsConnected(state === 'connected');
      onConnectionStateChange?.(state);

      if (state === 'failed' || state === 'disconnected') {
        setError('Conexão perdida. Tentando reconectar...');
      } else if (state === 'connected') {
        setError(null);
        toast({
          title: 'Conectado!',
          description: 'Videochamada estabelecida com sucesso.',
        });
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 New ICE candidate:', event.candidate);
        handleIceCandidate(event.candidate);
      }
    };

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('📺 Received remote stream');
      const remoteStream = event.streams[0];
      setRemoteStream(remoteStream);
      
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    };

    setPeerConnection(pc);
    console.log('✅ Peer connection created successfully');
    return pc;
  }, [onConnectionStateChange, toast]);

  const handleIceCandidate = async (candidate: RTCIceCandidate) => {
    try {
      console.log('📤 Sending ICE candidate to database');
      
      // Get current candidates
      const { data: currentSession, error: fetchError } = await supabase
        .from('webrtc_sessions')
        .select('ice_candidates')
        .eq('id', sessionId)
        .single();

      if (fetchError) throw fetchError;

      const currentCandidates = currentSession?.ice_candidates || [];
      const newCandidates = [...currentCandidates, candidate.toJSON() as any];

      const { error: updateError } = await supabase
        .from('webrtc_sessions')
        .update({ ice_candidates: newCandidates as any })
        .eq('id', sessionId);

      if (updateError) throw updateError;
      
      console.log('✅ ICE candidate sent successfully');
    } catch (error) {
      console.error('❌ Error sending ICE candidate:', error);
    }
  };

  const createOffer = async (pc: RTCPeerConnection) => {
    try {
      console.log('📝 Creating offer...');
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
      await pc.setLocalDescription(offer);
      
      const { error } = await supabase
        .from('webrtc_sessions')
        .update({ 
          offer: offer as any,
          psychologist_id: userType === 'psychologist' ? (await supabase.auth.getUser()).data.user?.id : undefined
        })
        .eq('id', sessionId);

      if (error) throw error;
      console.log('✅ Offer created and sent');
    } catch (error) {
      console.error('❌ Error creating offer:', error);
      setError('Erro ao criar oferta de conexão');
    }
  };

  const handleOffer = async (offer: RTCSessionDescriptionInit, pc: RTCPeerConnection) => {
    try {
      console.log('📝 Handling incoming offer...');
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      const { error } = await supabase
        .from('webrtc_sessions')
        .update({ 
          answer: answer as any,
          patient_id: userType === 'patient' ? (await supabase.auth.getUser()).data.user?.id : undefined
        })
        .eq('id', sessionId);

      if (error) throw error;
      console.log('✅ Answer created and sent');
    } catch (error) {
      console.error('❌ Error handling offer:', error);
      setError('Erro ao processar oferta de conexão');
    }
  };

  const handleAnswer = async (answer: RTCSessionDescriptionInit, pc: RTCPeerConnection) => {
    try {
      console.log('📝 Handling incoming answer...');
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('✅ Answer processed successfully');
    } catch (error) {
      console.error('❌ Error handling answer:', error);
      setError('Erro ao processar resposta de conexão');
    }
  };

  const processIceCandidates = async (candidates: RTCIceCandidateInit[], pc: RTCPeerConnection) => {
    if (!candidates || !Array.isArray(candidates)) return;
    
    for (const candidateData of candidates) {
      try {
        if (candidateData && typeof candidateData === 'object') {
          const candidate = new RTCIceCandidate(candidateData);
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(candidate);
            console.log('✅ ICE candidate added');
          }
        }
      } catch (error) {
        console.warn('⚠️ Error adding ICE candidate:', error);
      }
    }
  };

  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return !audioTrack.enabled;
      }
    }
    return false;
  }, [localStream]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return !videoTrack.enabled;
      }
    }
    return false;
  }, [localStream]);

  const cleanup = useCallback(() => {
    console.log('🧹 Cleaning up WebRTC resources...');
    
    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop();
        console.log(`🛑 Stopped ${track.kind} track`);
      });
    }
    
    if (peerConnection) {
      peerConnection.close();
      console.log('🔒 Peer connection closed');
    }
    
    setLocalStream(null);
    setRemoteStream(null);
    setPeerConnection(null);
    setIsConnected(false);
    setConnectionState('closed');
  }, [localStream, peerConnection]);

  // Initialize WebRTC when hook is used
  useEffect(() => {
    let isMounted = true;
    
    const initialize = async () => {
      try {
        if (!sessionId) {
          throw new Error('Session ID is required');
        }

        console.log(`🚀 Initializing WebRTC for session: ${sessionId}`);
        
        const stream = await initializeMedia();
        if (!isMounted) return;
        
        const pc = await createPeerConnection(stream);
        if (!isMounted) return;

        // Set up realtime subscription for session updates
        const channel = supabase
          .channel(`webrtc_session_${sessionId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'webrtc_sessions',
              filter: `id=eq.${sessionId}`
            },
            async (payload) => {
              if (!isMounted) return;
              
              console.log('📡 Session update received:', payload);
              const sessionData = payload.new as WebRTCSession;
              setSession(sessionData);

              // Handle offer/answer exchange
              if (sessionData.offer && userType === 'patient' && !pc.remoteDescription) {
                await handleOffer(sessionData.offer, pc);
              } else if (sessionData.answer && userType === 'psychologist' && !pc.remoteDescription) {
                await handleAnswer(sessionData.answer, pc);
              }

              // Process ICE candidates
              if (sessionData.ice_candidates) {
                await processIceCandidates(sessionData.ice_candidates, pc);
              }
            }
          )
          .subscribe();

        // If psychologist, create initial offer
        if (userType === 'psychologist') {
          setTimeout(() => {
            if (isMounted) {
              createOffer(pc);
            }
          }, 1000);
        }

        return () => {
          console.log('🔌 Unsubscribing from realtime channel');
          supabase.removeChannel(channel);
        };
        
      } catch (error) {
        console.error('❌ WebRTC initialization failed:', error);
        if (isMounted) {
          setError(error instanceof Error ? error.message : 'Erro ao inicializar videochamada');
        }
      }
    };

    initialize();

    return () => {
      isMounted = false;
      cleanup();
    };
  }, [sessionId, userType, initializeMedia, createPeerConnection, cleanup]);

  return {
    localVideoRef,
    remoteVideoRef,
    localStream,
    remoteStream,
    connectionState,
    isConnected,
    error,
    session,
    toggleAudio,
    toggleVideo,
    cleanup
  };
};
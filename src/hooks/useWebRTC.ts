import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getWebRTCConnectionManager } from '@/utils/webrtc-manager';
import { flowLock } from '@/utils/flow-lock';
import { stateMachineRegistry, type WebRTCState } from '@/utils/state-machine';
import { loopDetector } from '@/utils/loop-detector';

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
  const [isInitializing, setIsInitializing] = useState(false);
  const [webrtcState, setWebrtcState] = useState<WebRTCState>('idle');
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const initializationRef = useRef<boolean>(false);
  const cleanupRef = useRef<boolean>(false);
  const { toast } = useToast();
  const connectionManager = getWebRTCConnectionManager();
  const stateMachine = useRef(stateMachineRegistry.getOrCreate(sessionId));

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
    console.log('🔗 Creating managed peer connection...');
    
    try {
      // Use the singleton connection manager
      const pc = await connectionManager.getConnection(sessionId, {
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
      console.log('✅ Managed peer connection created successfully');
      return pc;
    } catch (error) {
      console.error('❌ Failed to create managed peer connection:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('WEBRTC_TOO_MANY_CONNECTIONS')) {
          setError('Muitas conexões ativas. Recarregue a página e tente novamente.');
          toast({
            title: 'Erro de Conexão',
            description: 'Muitas conexões WebRTC ativas. Recarregue a página.',
            variant: 'destructive',
          });
        } else if (error.message.includes('Cannot create so many PeerConnections')) {
          setError('Limite de conexões atingido. Aguarde alguns segundos e tente novamente.');
          toast({
            title: 'Limite de Conexões',
            description: 'Muitas conexões simultâneas. Aguarde e tente novamente.',
            variant: 'destructive',
          });
        } else {
          setError('Erro ao criar conexão WebRTC');
        }
      }
      throw error;
    }
  }, [sessionId, connectionManager, onConnectionStateChange, toast]);

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
    // Prevent multiple cleanup calls
    if (cleanupRef.current) {
      loopDetector.trace(sessionId, 'cleanup_skip_already_running');
      return;
    }
    
    cleanupRef.current = true;
    loopDetector.trace(sessionId, 'cleanup_start');
    
    // Transition to cleaning state
    if (stateMachine.current.canTransitionTo('cleaning')) {
      stateMachine.current.transitionTo('cleaning');
      setWebrtcState('cleaning');
    }
    
    console.log('🧹 Cleaning up WebRTC resources...');
    
    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop();
        console.log(`🛑 Stopped ${track.kind} track`);
      });
    }
    
    // Use connection manager for proper cleanup
    if (sessionId) {
      connectionManager.cleanupConnection(sessionId);
    }
    
    // Release flow lock
    flowLock.releaseLock(sessionId);
    
    setLocalStream(null);
    setRemoteStream(null);
    setPeerConnection(null);
    setIsConnected(false);
    setConnectionState('closed');
    setIsInitializing(false);
    
    // Transition back to idle
    stateMachine.current.transitionTo('idle');
    setWebrtcState('idle');
    
    cleanupRef.current = false;
    loopDetector.trace(sessionId, 'cleanup_complete');
  }, [localStream, sessionId, connectionManager]);

  // Initialize WebRTC with loop protection
  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;
    
    const initialize = async () => {
      // Only initialize if in idle state
      if (webrtcState !== 'idle') {
        loopDetector.trace(sessionId, `initialize_skip_wrong_state_${webrtcState}`);
        return;
      }

      // Prevent multiple initializations with flow lock
      if (!flowLock.acquireLock(sessionId, 'webrtc_initialization')) {
        loopDetector.trace(sessionId, 'initialize_skip_lock_exists');
        return;
      }

      // Prevent duplicate initialization
      if (isInitializing || initializationRef.current) {
        flowLock.releaseLock(sessionId);
        loopDetector.trace(sessionId, 'initialize_skip_already_running');
        return;
      }

      if (!sessionId) {
        flowLock.releaseLock(sessionId);
        throw new Error('Session ID is required');
      }

      try {
        loopDetector.trace(sessionId, 'initialize_start');
        
        // Transition to initializing state
        stateMachine.current.transitionTo('initializing');
        setWebrtcState('initializing');
        
        console.log(`🚀 Initializing managed WebRTC for session: ${sessionId}`);
        setIsInitializing(true);
        initializationRef.current = true;
        
        const stream = await initializeMedia();
        if (!isMounted) {
          flowLock.releaseLock(sessionId);
          return;
        }
        
        loopDetector.trace(sessionId, 'media_initialized');
        
        const pc = await createPeerConnection(stream);
        if (!isMounted) {
          flowLock.releaseLock(sessionId);
          return;
        }
        
        loopDetector.trace(sessionId, 'peer_connection_created');

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

        unsubscribe = () => {
          console.log('🔌 Unsubscribing from realtime channel');
          supabase.removeChannel(channel);
        };

        // If psychologist, create initial offer
        if (userType === 'psychologist') {
          setTimeout(() => {
            if (isMounted) {
              createOffer(pc);
            }
          }, 1000);
        }

        // Transition to connected state
        stateMachine.current.transitionTo('connected');
        setWebrtcState('connected');
        
        loopDetector.trace(sessionId, 'initialize_complete');
        
      } catch (error) {
        console.error('❌ WebRTC initialization failed:', error);
        
        if (isMounted) {
          // Transition to error state
          stateMachine.current.transitionTo('error');
          setWebrtcState('error');
          
          setError(error instanceof Error ? error.message : 'Erro ao inicializar videochamada');
          setIsInitializing(false);
          initializationRef.current = false;
          
          loopDetector.trace(sessionId, `initialize_error_${error instanceof Error ? error.message : 'unknown'}`);
        }
      } finally {
        flowLock.releaseLock(sessionId);
      }
    };

    // Only initialize once per sessionId
    initialize();

    return () => {
      isMounted = false;
      initializationRef.current = false;
      setIsInitializing(false);
      
      if (unsubscribe) {
        unsubscribe();
      }
      
      // Only cleanup if not in a valid connected state
      if (webrtcState !== 'connected') {
        cleanup();
      }
    };
  }, [sessionId, userType]); // Minimal dependencies to prevent loop

  return {
    localVideoRef,
    remoteVideoRef,
    localStream,
    remoteStream,
    connectionState,
    isConnected,
    error,
    session,
    isInitializing,
    webrtcState,
    toggleAudio,
    toggleVideo,
    cleanup
  };
};
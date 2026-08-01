import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getWebRTCConnectionManager } from '@/utils/webrtc-manager';
import { flowLock } from '@/utils/flow-lock';
import { stateMachineRegistry, type WebRTCState } from '@/utils/state-machine';
import { loopDetector } from '@/utils/loop-detector';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useMediaDeviceManager } from '@/hooks/useMediaDeviceManager';

interface WebRTCSession {
  id: string;
  emergency_request_id?: string;
  psychologist_id?: string;
  patient_id?: string;
  status: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  ice_candidates?: RTCIceCandidateInit[];
  ended_by?: string;
  ended_by_type?: string;
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
  const [callEndedBy, setCallEndedBy] = useState<{userId: string, userType: string} | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [isNetworkOffline, setIsNetworkOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const initializationRef = useRef<boolean>(false);
  const cleanupRef = useRef<boolean>(false);
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const graceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAppliedOfferRef = useRef<string | null>(null);
  const lastAppliedAnswerRef = useRef<string | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const callEndedByRef = useRef<{userId: string, userType: string} | null>(null);
  const attemptReconnectRef = useRef<((pc: RTCPeerConnection) => void) | null>(null);
  const { toast } = useToast();
  const connectionManager = getWebRTCConnectionManager();
  const stateMachine = useRef(stateMachineRegistry.getOrCreate(sessionId));
  const { preferences, isLoading: prefsLoading } = useUserPreferences();
  const mediaManager = useMediaDeviceManager();

  // Reconnection is intentionally generous: an involuntary drop must never be
  // treated as the end of the call.
  const MAX_RECONNECT_ATTEMPTS = 12;

  useEffect(() => {
    callEndedByRef.current = callEndedBy;
  }, [callEndedBy]);


  const clearReconnectTimers = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (graceTimerRef.current) {
      clearTimeout(graceTimerRef.current);
      graceTimerRef.current = null;
    }
  }, []);


  const initializeMedia = useCallback(async () => {
    try {
      console.log('🎥 Initializing media devices with preferences...');
      
      const result = await mediaManager.getMediaStream(
        preferences?.mic_device_id || undefined,
        preferences?.camera_device_id || undefined
      );

      if (result.error) {
        // Show specific error message
        const errorMessage = result.error.message + (result.error.details ? ` - ${result.error.details}` : '');
        console.error('❌ Media device error:', result.error);
        
        setError(errorMessage);
        toast({
          title: `Erro de ${result.error.type === 'permission' ? 'Permissão' : 'Dispositivo'}`,
          description: errorMessage,
          variant: 'destructive',
        });

        // If we have a stream but with warnings, proceed anyway
        if (result.stream.getTracks().length > 0) {
          console.log('⚠️ Proceeding with available stream despite warnings');
        } else {
          throw new Error(errorMessage);
        }
      }

      const stream = result.stream;
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Apply preferred audio output device if supported
      if (preferences?.speaker_device_id) {
        try {
          await mediaManager.setAudioOutputDevice(preferences.speaker_device_id);
        } catch (error) {
          console.warn('⚠️ Failed to apply audio output preference:', error);
        }
      }

      console.log('✅ Media devices initialized successfully');
      return stream;
    } catch (err) {
      console.error('❌ Media initialization failed completely:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao inicializar mídia';
      setError(errorMessage);
      toast({
        title: 'Erro de Mídia',
        description: errorMessage,
        variant: 'destructive',
      });
      throw err;
    }
  }, [toast, preferences, mediaManager, localVideoRef]);

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

      pcRef.current = pc;

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        const endedBy = callEndedByRef.current;
        console.log(`🔄 Connection state changed: ${state}`);
        setConnectionState(state);
        setIsConnected(state === 'connected');
        onConnectionStateChange?.(state);

        if (state === 'failed') {
          // A hard ICE failure is NOT a call termination. Only a signalled,
          // deliberate end (persisted in the database) ends the call.
          if (endedBy) {
            const endedByName = endedBy.userType === 'psychologist' ? 'O psicólogo' : 'O paciente';
            setError(`${endedByName} finalizou a chamada.`);
          } else {
            attemptReconnectRef.current?.(pc);
          }
        } else if (state === 'disconnected') {
          // Transient — give it a short grace period before forcing a reconnect
          console.log('⏳ Connection transient disconnect, awaiting recovery...');
          if (!endedBy) {
            setIsReconnecting(true);
            if (!graceTimerRef.current) {
              graceTimerRef.current = setTimeout(() => {
                graceTimerRef.current = null;
                if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                  attemptReconnectRef.current?.(pc);
                }
              }, 3000);
            }
          }
        } else if (state === 'connected') {
          clearReconnectTimers();
          reconnectAttemptsRef.current = 0;
          setReconnectAttempt(0);
          setIsReconnecting(false);
          setError(null);
          setCallEndedBy(null);
          toast({
            title: 'Conectado!',
            description: 'Videochamada estabelecida com sucesso.',
          });
        }
      };

      // ICE-level watchdog: some browsers keep `connectionState` optimistic
      // while ICE has already dropped.
      pc.oniceconnectionstatechange = () => {
        const iceState = pc.iceConnectionState;
        console.log(`🧊 ICE connection state: ${iceState}`);
        if (callEndedByRef.current) return;

        if (iceState === 'failed') {
          attemptReconnectRef.current?.(pc);
        } else if (iceState === 'disconnected') {
          setIsReconnecting(true);
          if (!graceTimerRef.current) {
            graceTimerRef.current = setTimeout(() => {
              graceTimerRef.current = null;
              if (['disconnected', 'failed'].includes(pc.iceConnectionState)) {
                attemptReconnectRef.current?.(pc);
              }
            }, 3000);
          }
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

  const createOffer = async (pc: RTCPeerConnection, iceRestart = false) => {
    try {
      console.log('📝 Creating offer...', { iceRestart });
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
        iceRestart
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

  // Automatic reconnection with exponential backoff + ICE restart
  const attemptReconnect = (pc: RTCPeerConnection) => {
    if (cleanupRef.current || callEndedByRef.current) return;
    if (reconnectTimerRef.current) return; // already scheduled
    if (pc.connectionState === 'closed') return;

    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      // Still NOT an ended call — the room stays open and the user can retry.
      setIsReconnecting(false);
      setError('Não foi possível restabelecer a conexão automaticamente. A chamada continua aberta — verifique sua internet e toque em "Tentar reconectar".');
      return;
    }

    const attempt = reconnectAttemptsRef.current + 1;
    reconnectAttemptsRef.current = attempt;
    setReconnectAttempt(attempt);
    setIsReconnecting(true);
    setError(null);

    const delay = Math.min(1000 * 2 ** (attempt - 1), 8000);
    console.log(`🔁 Scheduling reconnect attempt ${attempt} in ${delay}ms`);

    reconnectTimerRef.current = setTimeout(async () => {
      reconnectTimerRef.current = null;
      if (cleanupRef.current || callEndedByRef.current) return;
      if (pc.connectionState === 'connected' || pc.connectionState === 'closed') return;

      // No point burning attempts while the device has no network at all.
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        reconnectAttemptsRef.current = Math.max(0, reconnectAttemptsRef.current - 1);
        setTimeout(() => attemptReconnectRef.current?.(pc), 2000);
        return;
      }

      try {
        pc.restartIce?.();
        // The offerer (psychologist) renegotiates; the answerer waits for the new offer
        if (userType === 'psychologist') {
          await createOffer(pc, true);
        }
      } catch (e) {
        console.warn('Reconnect attempt failed:', e);
      }

      // Re-evaluate after giving the attempt time to settle
      setTimeout(() => {
        if (cleanupRef.current || callEndedByRef.current) return;
        if (pc.connectionState !== 'connected' && pc.connectionState !== 'closed') {
          attemptReconnect(pc);
        }
      }, 5000);
    }, delay);
  };

  attemptReconnectRef.current = attemptReconnect;

  /** Manual retry used by the UI after automatic attempts are exhausted. */
  const forceReconnect = useCallback(() => {
    const pc = pcRef.current;
    if (!pc || cleanupRef.current || callEndedByRef.current) return;
    clearReconnectTimers();
    reconnectAttemptsRef.current = 0;
    setReconnectAttempt(0);
    setError(null);
    attemptReconnectRef.current?.(pc);
  }, [clearReconnectTimers]);

  // Detect the device going offline/online. Losing the network is an
  // involuntary drop: keep the call alive and resume as soon as we are back.
  useEffect(() => {
    const handleOffline = () => {
      console.log('🌐 Device went offline');
      setIsNetworkOffline(true);
      if (!callEndedByRef.current && !cleanupRef.current) {
        setIsReconnecting(true);
      }
    };

    const handleOnline = () => {
      console.log('🌐 Device is back online');
      setIsNetworkOffline(false);
      const pc = pcRef.current;
      if (!pc || cleanupRef.current || callEndedByRef.current) return;
      if (pc.connectionState === 'connected') return;
      clearReconnectTimers();
      reconnectAttemptsRef.current = 0;
      setReconnectAttempt(0);
      attemptReconnectRef.current?.(pc);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [clearReconnectTimers]);

  // Coming back from a background tab / locked screen often leaves ICE stale.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const pc = pcRef.current;
      if (!pc || cleanupRef.current || callEndedByRef.current) return;
      if (['disconnected', 'failed'].includes(pc.connectionState)) {
        attemptReconnectRef.current?.(pc);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);



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
    pcRef.current = null;
    clearReconnectTimers();
    setIsReconnecting(false);
    setReconnectAttempt(0);
    reconnectAttemptsRef.current = 0;

    loopDetector.trace(sessionId, 'cleanup_start');

    
    // Transition to cleaning state
    if (stateMachine.current.canTransitionTo('cleaning')) {
      stateMachine.current.transitionTo('cleaning');
      setWebrtcState('cleaning');
    }
    
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
    if (remoteStream) {
      console.log('🛑 Stopping remote stream tracks...');
      remoteStream.getTracks().forEach(track => {
        if (track.readyState !== 'ended') {
          track.stop();
          console.log(`🛑 Stopped remote ${track.kind} track`);
        }
      });
      
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
        console.log('🧹 Cleared remote video element');
      }
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
    setCallEndedBy(null);
    
    // Transition back to idle
    stateMachine.current.transitionTo('idle');
    setWebrtcState('idle');
    
    cleanupRef.current = false;
    loopDetector.trace(sessionId, 'cleanup_complete');
    
    console.log('✅ Complete WebRTC cleanup finished');
  }, [localStream, remoteStream, peerConnection, sessionId, connectionManager, localVideoRef, remoteVideoRef]);
  
  const updateDeviceStream = useCallback(async (newStream: MediaStream) => {
    if (!peerConnection || !localStream) return;
    
    try {
      console.log('🔄 Updating device stream for remote peer...');
      
      // Replace video track in peer connection
      const videoTrack = newStream.getVideoTracks()[0];
      const audioTrack = newStream.getAudioTracks()[0];
      
      const senders = peerConnection.getSenders();
      
      for (const sender of senders) {
        if (sender.track) {
          if (sender.track.kind === 'video' && videoTrack) {
            await sender.replaceTrack(videoTrack);
            console.log('✅ Video track replaced in peer connection');
          } else if (sender.track.kind === 'audio' && audioTrack) {
            await sender.replaceTrack(audioTrack);
            console.log('✅ Audio track replaced in peer connection');
          }
        }
      }
      
      // Stop OLD stream tracks to release devices
      const oldStream = localStream;
      oldStream.getTracks().forEach(track => {
        try {
          track.stop();
          console.log(`🛑 Stopped old ${track.kind} track after device change`);
        } catch (e) {
          console.warn('Failed stopping old track:', e);
        }
      });
      
      // Update local stream
      setLocalStream(newStream);
      
      // Update local video element
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = newStream;
      }
      
      console.log('✅ Device stream updated successfully');
    } catch (error) {
      console.error('❌ Error updating device stream:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar dispositivos na chamada',
        variant: 'destructive',
      });
    }
  }, [peerConnection, localStream, localVideoRef, toast]);

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

      // Wait for preferences to load before initializing
      if (prefsLoading) {
        flowLock.releaseLock(sessionId);
        loopDetector.trace(sessionId, 'initialize_skip_preferences_loading');
        return;
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

        // Reopen the session if it carries a stale "completed" state from a
        // previous call/reconnection — otherwise both peers would immediately
        // think the other one hung up.
        const joinedAt = Date.now();
        try {
          const { data: existingSession } = await supabase
            .from('webrtc_sessions')
            .select('status, ended_at')
            .eq('id', sessionId)
            .maybeSingle();

          if (existingSession?.status === 'completed') {
            console.log('♻️ Reopening stale completed session');
            await supabase
              .from('webrtc_sessions')
              .update({
                status: 'active',
                ended_at: null,
                ended_by: null,
                ended_by_type: null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', sessionId);
          }
        } catch (e) {
          console.warn('Could not verify session state:', e);
        }

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

              // Emit session update for parent component to handle mute/camera status
              window.dispatchEvent(new CustomEvent('webrtc-session-update', { 
                detail: sessionData 
              }));

              // Check if call was ended by someone — ignore stale terminations
              // that happened before we joined this call.
              if (isRealTermination(sessionData as any, joinedAt)) {
                setCallEndedBy({
                  userId: sessionData.ended_by!,
                  userType: sessionData.ended_by_type!
                });
              }



              // Handle offer/answer exchange (also supports renegotiation / ICE restart)
              if (sessionData.offer && userType === 'patient') {
                const sdp = (sessionData.offer as any)?.sdp;
                if (sdp && sdp !== lastAppliedOfferRef.current) {
                  lastAppliedOfferRef.current = sdp;
                  await handleOffer(sessionData.offer, pc);
                }
              } else if (sessionData.answer && userType === 'psychologist') {
                const sdp = (sessionData.answer as any)?.sdp;
                if (sdp && sdp !== lastAppliedAnswerRef.current && pc.signalingState !== 'stable') {
                  lastAppliedAnswerRef.current = sdp;
                  await handleAnswer(sessionData.answer, pc);
                }
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

  }, [sessionId, userType, prefsLoading]);

  // (Removed duplicate delayed-initialize effect that caused duplicate realtime
  //  channel subscriptions and orphan media streams.)

  return {
    localVideoRef,
    remoteVideoRef,
    localStream,
    remoteStream,
    peerConnection,
    connectionState,
    isConnected,
    error,
    session,
    isInitializing,
    webrtcState,
    callEndedBy,
    isReconnecting,
    reconnectAttempt,
    isNetworkOffline,
    forceReconnect,
    toggleAudio,

    toggleVideo,
    cleanup,
    updateDeviceStream
  };
};
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { isRealTermination, getTerminationMessage } from '@/lib/callTermination';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Camera, CameraOff, PhoneOff, Loader2, AlertTriangle, Settings, Shield, Video, WifiOff, RefreshCw, Activity, UserRound } from 'lucide-react';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useCallPresence } from '@/hooks/useCallPresence';
import { useParticipantHeartbeat } from '@/hooks/useParticipantHeartbeat';

import { useSharedCallTimer } from '@/hooks/useSharedCallTimer';

import { getConnectionBannerState, isRemoteDropInvoluntary } from '@/lib/callBanner';

import { useToast } from '@/hooks/use-toast';
import VoiceMeter from '@/components/sos/VoiceMeter';
import { ConnectionQuality } from '@/components/sos/ConnectionQuality';
import { supabase } from '@/integrations/supabase/client';
import { trackSosEvent, SOS_EVENTS } from '@/lib/sosTrace';
import { FeedbackModal } from '@/components/sos/FeedbackModal';
import { VideoCallSettingsModal } from '@/components/sos/VideoCallSettingsModal';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  END_REASONS,
  UNRESOLVED_CRISIS_OPTIONS,
  completionReasonFor,
  unresolvedCrisisLabel,
} from '@/lib/emergencyEndReasons';
import { sosLog } from '@/lib/sosLogger';
import { endEmergencySession } from '@/lib/endEmergencySession';
import CallDiagnosticsPanel from '@/components/sos/CallDiagnosticsPanel';
import PatientContextPanel from '@/components/sos/PatientContextPanel';
import {
  isDiagnosticsEnabled,
  isDiagnosticsShortcut,
  persistDiagnosticsFlag,
  type DiagnosticsInput,
} from '@/lib/callDiagnostics';
import { buildTraceId } from '@/lib/sosTrace';

export interface EndCallInfo {
  reason: string;
  endedByType: 'psychologist' | 'patient';
  crisisResolved?: boolean | null;
  notes?: string | null;
}

interface EmergencyVideoCallProps {
  sessionId?: string;
  userType?: 'psychologist' | 'patient';
  onEndCall?: (info?: EndCallInfo) => void;
  timeLimit?: number; // in seconds
}

const EmergencyVideoCall: React.FC<EmergencyVideoCallProps> = ({ 
  sessionId: propSessionId, 
  userType: propUserType, 
  onEndCall,
  timeLimit = 1200 // 20 minutes default
}) => {
  const { sessionId: paramSessionId } = useParams<{ sessionId: string }>();
  // Emergency request behind this room — resolved lazily, used for SOS tracing.
  const emergencyRequestIdRef = useRef<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { preferences, isLoading: prefsLoading, loadPreferences } = useUserPreferences();
  
  // Use the URL parameter as the session ID (this should be the WebRTC session ID, not the emergency request ID)
  const sessionId = propSessionId || paramSessionId;
  const [userType, setUserType] = useState<'psychologist' | 'patient'>(propUserType || 'patient');
  const endCallRef = useRef<(reason?: string) => void>(() => {});
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [initTimedOut, setInitTimedOut] = useState(false);
  const [sessionValid, setSessionValid] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  // Step 2 (psychologist only): was the patient's crisis resolved?
  const [showCrisisStep, setShowCrisisStep] = useState(false);
  const [crisisResolved, setCrisisResolved] = useState<'sim' | 'nao'>('sim');
  const [unresolvedReason, setUnresolvedReason] = useState<string>(UNRESOLVED_CRISIS_OPTIONS[0].value);
  const [endNotes, setEndNotes] = useState('');
  const endInfoRef = useRef<EndCallInfo>({ reason: END_REASONS.OTHER, endedByType: 'patient' });
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Safety net: never leave the user stuck on "Conectando..." forever
  // (blocked permission prompt, frozen device, stalled negotiation...).
  useEffect(() => {
    if (!isLoading) {
      setInitTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => setInitTimedOut(true), 45000);
    return () => window.clearTimeout(timer);
  }, [isLoading]);

  const [userInfo, setUserInfo] = useState<{
    name: string; 
    details: string;
    consultations?: number;
    sosCount?: number;
    rating?: number;
  }>({name: '', details: ''});
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [remoteMuted, setRemoteMuted] = useState(false);
  const [remoteIsCameraOff, setRemoteIsCameraOff] = useState(false);
  // Name announced by the peer over the data channel (used on the avatar).
  const [remoteDisplayName, setRemoteDisplayName] = useState<string | null>(null);
  // Timestamp of the last data-channel media update — database events older
  // than it are ignored so the slow round-trip never overrides the fast path.
  const lastMediaSignalAtRef = useRef(0);
  /** Mirrors of the local media state so concurrent toggles never read stale values. */
  const isMutedRef = useRef(false);
  const isCameraOffRef = useRef(false);
  const [callTerminatedMessage, setCallTerminatedMessage] = useState<string | null>(null);
  // Moment this client joined the call — used to ignore stale "call ended" events.
  const joinedAtRef = useRef<number>(Date.now());
  // Diagnostics overlay (incident triage). Opt-in via ?debug=1, stored flag or Ctrl+Shift+D.
  const [showDiagnostics, setShowDiagnostics] = useState(() =>
    isDiagnosticsEnabled(typeof window !== 'undefined' ? window.location.search : '', globalThis.localStorage)
  );
  // Patient triage context (psychologist only).
  const [showPatientContext, setShowPatientContext] = useState(false);



  const {
    localVideoRef,
    remoteVideoRef,
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
    session,
    toggleAudio,
    toggleVideo,
    cleanup,
    updateDeviceStream,
    sendCallEndedSignal,
    remoteMediaState,
    isRemoteMediaStale,
    sendMediaState

  } = useWebRTC({
    sessionId: sessionId || '',
    userType,
    onConnectionStateChange: (state) => {
      if (state === 'connected') {
        setIsLoading(false);
      } else if (state === 'failed') {
        if (callEndedBy) {
          const endedByName = callEndedBy.userType === 'psychologist' ? 'O psicólogo' : 'O paciente';
          toast({
            title: 'Chamada Finalizada',
            description: `${endedByName} finalizou a chamada.`,
            variant: 'default',
          });
        } else {
          // Involuntary drop — the call remains open while we reconnect.
          toast({
            title: 'Conexão instável',
            description: 'A conexão caiu. A chamada continua ativa e estamos reconectando...',
          });
        }
      }
    }
  });

  // Presence inside the room — distinguishes an involuntary drop of the other
  // participant from a deliberate call termination.
  const { remotePresent, remoteLeftAt } = useCallPresence({
    sessionId,
    userType,
    enabled: Boolean(sessionId) && !callTerminatedMessage,
  });

  // Durable heartbeat: lets the server tell "tab closed for a moment" apart
  // from a room that both participants really abandoned.
  useParticipantHeartbeat({
    sessionId,
    userType,
    enabled: Boolean(sessionId) && !callTerminatedMessage,
  });


  const remoteDroppedInvoluntarily = isRemoteDropInvoluntary(
    remotePresent,
    remoteLeftAt,
    Boolean(callTerminatedMessage)
  );

  const banner = getConnectionBannerState({
    isReconnecting,
    isNetworkOffline,
    remoteDroppedInvoluntarily,
    callTerminated: Boolean(callTerminatedMessage),
    reconnectAttempt,
    userType,
  });

  // Session timer shared by both participants (paused on any drop).
  const { timeLeft, isPaused: isTimerPaused } = useSharedCallTimer({
    sessionId,
    userType,
    timeLimit,
    running:
      isConnected &&
      remotePresent &&
      !isReconnecting &&
      !isNetworkOffline &&
      !callTerminatedMessage,
    onExpire: useCallback(() => {
      endCallRef.current?.(END_REASONS.TIME_LIMIT);
    }, []),
  });

  // Ctrl/Cmd + Shift + D toggles diagnostics during an incident.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isDiagnosticsShortcut(event)) return;
      event.preventDefault();
      setShowDiagnostics((prev) => {
        persistDiagnosticsFlag(!prev, globalThis.localStorage);
        return !prev;
      });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Snapshot of the whole flow, refreshed on every render while the panel is open.
  const diagnosticsData: DiagnosticsInput = {
    sessionId,
    requestId: emergencyRequestIdRef.current,
    traceId: buildTraceId(emergencyRequestIdRef.current, sessionId),
    userType,
    connectionState,
    iceConnectionState: peerConnection?.iceConnectionState ?? null,
    signalingState: peerConnection?.signalingState ?? null,
    isConnected,
    isReconnecting,
    reconnectAttempt,
    isNetworkOffline,
    hasLocalStream: Boolean(localStream),
    hasRemoteStream: Boolean(remoteStream),
    localTracks: localStream?.getTracks().map((t) => `${t.kind}:${t.readyState}${t.enabled ? '' : ' (off)'}`),
    remoteTracks: remoteStream?.getTracks().map((t) => `${t.kind}:${t.readyState}`),
    dataChannelState: null,
    isMuted,
    isCameraOff,
    remoteMuted,
    remoteCameraOff: remoteIsCameraOff,
    remotePresent,
    remoteLeftAt,
    heartbeatEnabled: Boolean(sessionId) && !callTerminatedMessage,
    timeLeft,
    timeLimit,
    isTimerPaused,
    callTerminatedMessage,
    callEndedBy,
    error,
  };


  // Get current user name for initials
  useEffect(() => {
    const getCurrentUserName = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Check if user is psychologist
        const { data: psychologist } = await supabase
          .from('psychologists')
          .select('full_name')
          .eq('user_id', user.id)
          .single();

        if (psychologist?.full_name) {
          setCurrentUserName(psychologist.full_name);
          return;
        }

        // Check profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .single();

        if (profile?.full_name) {
          setCurrentUserName(profile.full_name);
        }
      } catch (error) {
        console.error('Error getting current user name:', error);
      }
    };

    getCurrentUserName();
  }, []);

  // Enhanced session validation with intelligent delay
  useEffect(() => {
    let detachSessionUpdate: (() => void) | undefined;

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
        
        // Set up listener for remote peer status updates
        const handleSessionUpdate = (event: CustomEvent) => {
          const sessionData = event.detail;
          const remoteUserType = userType === 'patient' ? 'psychologist' : 'patient';
          // The data channel is the fast path; skip stale database echoes.
          if (Date.now() - lastMediaSignalAtRef.current < 5000) return;
          
          // Update remote mute status
          const remoteMutedKey = `${remoteUserType}_muted`;
          if (sessionData[remoteMutedKey] !== undefined) {
            setRemoteMuted(sessionData[remoteMutedKey]);
          }
          
          // Update remote camera status
          const remoteCameraOffKey = `${remoteUserType}_camera_off`;
          if (sessionData[remoteCameraOffKey] !== undefined) {
            setRemoteIsCameraOff(sessionData[remoteCameraOffKey]);
          }
        };

        window.addEventListener('webrtc-session-update', handleSessionUpdate as EventListener);
        // Registered on the effect scope so it is really removed on unmount.
        detachSessionUpdate = () =>
          window.removeEventListener('webrtc-session-update', handleSessionUpdate as EventListener);

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

    return () => {
      detachSessionUpdate?.();
    };
  }, [sessionId, navigate, toast]);


  // Load and apply user preferences on connection (only once, and only if needed)
  const appliedPrefsRef = React.useRef(false);
  useEffect(() => {
    const applySavedSettings = async () => {
      if (!isConnected || prefsLoading || !localStream || !updateDeviceStream) return;
      if (appliedPrefsRef.current) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: prefs } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (!prefs) {
          appliedPrefsRef.current = true;
          return;
        }

        // Skip if current tracks already match the preferred devices
        const currentVideoSettings = localStream.getVideoTracks()[0]?.getSettings();
        const currentAudioSettings = localStream.getAudioTracks()[0]?.getSettings();
        const videoMatches = !prefs.camera_device_id || currentVideoSettings?.deviceId === prefs.camera_device_id;
        const audioMatches = !prefs.mic_device_id || currentAudioSettings?.deviceId === prefs.mic_device_id;

        if (videoMatches && audioMatches) {
          appliedPrefsRef.current = true;
          return;
        }

        console.log('📱 Applying saved device preferences...');
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: prefs.camera_device_id ? { deviceId: { exact: prefs.camera_device_id } } : true,
          audio: prefs.mic_device_id ? { deviceId: { exact: prefs.mic_device_id } } : true,
        });

        await updateDeviceStream(newStream);
        appliedPrefsRef.current = true;
        console.log('✅ Device preferences applied successfully');
      } catch (error) {
        console.warn('⚠️ Could not apply saved device preferences:', error);
        appliedPrefsRef.current = true;
      }
    };

    applySavedSettings();
  }, [isConnected, prefsLoading, localStream, updateDeviceStream]);

  // Enhanced cleanup function - defined early to avoid dependency issues
  const enhancedCleanup = useCallback(async () => {
    console.log('🧹 Starting enhanced cleanup...');
    
    // 1. Stop all local stream tracks completely
    if (localStream) {
      localStream.getTracks().forEach(track => {
        if (track.readyState !== 'ended') {
          track.stop();
          track.enabled = false;
          console.log(`🛑 Enhanced stop ${track.kind} track (readyState: ${track.readyState})`);
        }
      });
    }
    
    // 2. Stop all remote stream tracks if any
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => {
        if (track.readyState !== 'ended') {
          track.stop();
          track.enabled = false;
          console.log(`🛑 Enhanced stop remote ${track.kind} track`);
        }
      });
    }
    
    // 3. Close peer connection with transceivers
    if (peerConnection) {
      try {
        // Stop all transceivers first
        peerConnection.getTransceivers().forEach(transceiver => {
          if (transceiver.stop) {
            transceiver.stop();
            console.log(`🛑 Enhanced stop ${transceiver.direction} transceiver`);
          }
        });
        
        // Remove all senders
        peerConnection.getSenders().forEach(sender => {
          if (sender.track) {
            peerConnection.removeTrack(sender);
            console.log(`🗑️ Enhanced remove ${sender.track.kind} sender`);
          }
        });
        
        if (peerConnection.connectionState !== 'closed') {
          peerConnection.close();
          console.log('🔌 Enhanced peer connection closed');
        }
      } catch (error) {
        console.warn('⚠️ Enhanced peer connection cleanup error:', error);
      }
    }
    
    // 4. Clear video elements immediately with null assignment
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
      localVideoRef.current.load(); // Force video element reset
      console.log('🧹 Enhanced clear local video element');
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
      remoteVideoRef.current.load(); // Force video element reset  
      console.log('🧹 Enhanced clear remote video element');
    }
    
    // 5. Verify every track really ended (no extra getUserMedia — that would
    // re-open the camera and ask for permission again)
    const pendingTracks = [
      ...(localStream?.getTracks() ?? []),
      ...(remoteStream?.getTracks() ?? []),
    ].filter((track) => track.readyState !== 'ended');

    if (pendingTracks.length > 0) {
      pendingTracks.forEach((track) => {
        try {
          track.stop();
        } catch {
          /* noop */
        }
      });
      console.warn(`⚠️ ${pendingTracks.length} track(s) needed a second stop`);
    }

    // 6. Force garbage collection and memory cleanup
    if ((window as any).gc) {
      setTimeout(() => (window as any).gc(), 100);
    }
    
    console.log('✅ Enhanced cleanup completed');
  }, [localStream, remoteStream, peerConnection, localVideoRef, remoteVideoRef]);

  // Real-time synchronization of call status via Supabase
  useEffect(() => {
    if (!sessionId) return;

    console.log('📡 Setting up real-time session status synchronization...');
    
    const channel = supabase
      .channel(`webrtc-session-updates-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'webrtc_sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload) => {
          const newData = payload.new;
          const remoteUserType = userType === 'patient' ? 'psychologist' : 'patient';
          
          console.log('📡 Received session update:', newData);
          const mediaFromSignalIsFresher = Date.now() - lastMediaSignalAtRef.current < 5000;
          
          // Update remote mute status
          if (!mediaFromSignalIsFresher && newData[`${remoteUserType}_muted`] !== undefined) {
            setRemoteMuted(newData[`${remoteUserType}_muted`]);
            console.log('🎤 Remote mute status updated:', newData[`${remoteUserType}_muted`]);
          }
          
          // Update remote camera status
          if (!mediaFromSignalIsFresher && newData[`${remoteUserType}_camera_off`] !== undefined) {
            setRemoteIsCameraOff(newData[`${remoteUserType}_camera_off`]);
            console.log('📹 Remote camera status updated:', newData[`${remoteUserType}_camera_off`]);
          }
          
          // Check if call was terminated (ignore stale terminations from
          // previous sessions/reconnections)
          if (isRealTermination(newData, joinedAtRef.current)) {
            const message = getTerminationMessage(newData.ended_by_type);

            console.log('📞 Call terminated:', message);
            setCallTerminatedMessage(message);

            // Execute enhanced cleanup after a brief delay
            setTimeout(() => {
              enhancedCleanup();
              setShowFeedbackModal(true);
            }, 1000);
          }


        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Cleaning up real-time session subscription');
      supabase.removeChannel(channel);
    };
  }, [sessionId, userType, enhancedCleanup]);

  // Fast path: camera/mic/avatar of the remote peer via WebRTC data channel.
  useEffect(() => {
    if (!remoteMediaState) return;
    lastMediaSignalAtRef.current = Date.now();
    setRemoteMuted(remoteMediaState.muted);
    setRemoteIsCameraOff(remoteMediaState.cameraOff);
    if (remoteMediaState.displayName) setRemoteDisplayName(remoteMediaState.displayName);
  }, [remoteMediaState]);

  // Announce our own state as soon as the channel is usable and on every change.
  useEffect(() => {
    sendMediaState({
      userType,
      cameraOff: isCameraOff,
      muted: isMuted,
      displayName: currentUserName || null,
      avatarUrl: null,
    });
  }, [sendMediaState, userType, isCameraOff, isMuted, currentUserName, isConnected]);

  // Sync initial remote mute/camera status from current session
  useEffect(() => {
    if (!session) return;
    const remoteType = userType === 'patient' ? 'psychologist' : 'patient';
    const s: any = session;
    if (typeof s[`${remoteType}_muted`] === 'boolean') {
      setRemoteMuted(s[`${remoteType}_muted`]);
    }
    if (typeof s[`${remoteType}_camera_off`] === 'boolean') {
      setRemoteIsCameraOff(s[`${remoteType}_camera_off`]);
    }
  }, [session, userType]);

  // Monitor local stream changes to ensure video is updated
  useEffect(() => {
    const updateLocalVideo = () => {
      if (localVideoRef.current && localStream) {
        // Only update if necessary
        if (localVideoRef.current.srcObject !== localStream) {
          localVideoRef.current.srcObject = localStream;
          localVideoRef.current.play().catch(error => {
            console.warn('Video play error, retrying...', error);
            setTimeout(updateLocalVideo, 100);
          });
          console.log('📹 Local video stream updated');
        }
      }
    };
    
    updateLocalVideo();

    // Short-lived verification window (some browsers attach the stream late).
    // A perpetual 2s interval kept the CPU busy for the whole call.
    let attempts = 0;
    const interval = setInterval(() => {
      attempts += 1;
      updateLocalVideo();
      if (attempts >= 5 || localVideoRef.current?.srcObject === localStream) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [localStream, localVideoRef]);

 
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

      emergencyRequestIdRef.current = webrtcSession.emergency_request_id;

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

  // Shared session timer: pauses when someone drops, resumes from the same
  // value on reconnection and ends the call for both when it expires.
  const warned5MinRef = React.useRef(false);
  const warned1MinRef = React.useRef(false);
  useEffect(() => {
    if (timeLeft === 300 && !warned5MinRef.current) {
      warned5MinRef.current = true;
      toast({ title: 'Aviso', description: 'A chamada será encerrada em 5 minutos.' });
    }
    if (timeLeft === 60 && !warned1MinRef.current) {
      warned1MinRef.current = true;
      toast({
        title: 'Atenção',
        description: 'A chamada será encerrada em 1 minuto.',
        variant: 'destructive',
      });
    }
  }, [timeLeft, toast]);


  const handleMuteToggle = async () => {
    try {
      // The track is the source of truth — never derive state from a stale render.
      const muted = toggleAudio();
      isMutedRef.current = muted;
      setIsMuted(muted);

      // Fast path: tell the peer right away (no database round-trip).
      // The signal carries a monotonic seq, so concurrent toggles stay ordered.
      lastMediaSignalAtRef.current = Date.now();
      sendMediaState({
        userType,
        muted,
        cameraOff: isCameraOffRef.current,
        displayName: currentUserName || null,
        avatarUrl: null,
      });

      // Durable copy (used on join/refresh). A failure here must not desync the
      // UI from the actual track state, so we keep the local value.
      if (sessionId) {
        const { error } = await supabase
          .from('webrtc_sessions')
          .update({
            [`${userType}_muted`]: muted,
            updated_at: new Date().toISOString()
          } as any)
          .eq('id', sessionId);

        if (error) console.error('Error persisting mute status:', error);
      }
    } catch (error) {
      console.error('Failed to toggle audio:', error);
    }
  };

  const handleCameraToggle = async () => {
    try {
      // Execute toggle first: the track result is the source of truth.
      const cameraOff = toggleVideo();
      isCameraOffRef.current = cameraOff;
      setIsCameraOff(cameraOff);

      // Fast path: tell the peer right away (no database round-trip).
      lastMediaSignalAtRef.current = Date.now();
      sendMediaState({
        userType,
        muted: isMutedRef.current,
        cameraOff,
        displayName: currentUserName || null,
        avatarUrl: null,
      });
      
      // Communicate camera status to remote peer via Supabase
      if (sessionId) {
        try {
          const { error } = await supabase
            .from('webrtc_sessions')
            .update({ 
              [`${userType}_camera_off`]: cameraOff,
              updated_at: new Date().toISOString()
            } as any)
            .eq('id', sessionId);
          
          if (error) console.error('Error persisting camera status:', error);
        } catch (error) {
          console.error('Failed to persist camera status:', error);
        }
      }
      
      // If reactivating camera, ensure stream is updated
      if (!cameraOff && localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = true;
          // Force update of local video element
          if (localVideoRef.current && localVideoRef.current.srcObject) {
            localVideoRef.current.srcObject = localStream;
            localVideoRef.current.play().catch(console.error);
            console.log('📹 Local video element refreshed');
          }
        }
      }
      
      console.log('📹 Video toggled:', cameraOff ? 'off' : 'on');
    } catch (error) {
      console.error('Failed to toggle camera:', error);
      setIsCameraOff(prev => !prev);
    }
  };


  const handleEndCall = async (info?: Partial<EndCallInfo>) => {
    const endInfo: EndCallInfo = {
      reason: info?.reason ?? completionReasonFor(userType),
      endedByType: userType,
      crisisResolved: info?.crisisResolved ?? null,
      notes: info?.notes ?? null,
    };
    endInfoRef.current = endInfo;

    // Single termination flow: signal → persist → trace → hardware/WebRTC cleanup.
    const { data: auth } = await supabase.auth.getUser();
    await endEmergencySession({
      requestId: emergencyRequestIdRef.current,
      sessionId,
      userId: auth.user?.id ?? null,
      endedBy: userType,
      reason: endInfo.reason,
      crisisResolved: endInfo.crisisResolved,
      notes: endInfo.notes,
      sendCallEndedSignal: sendCallEndedSignal,
      stopMedia: enhancedCleanup,
      closeWebRTC: cleanup,
      onFinished: () => setShowFeedbackModal(true),
    });
  };


  // Allows the shared timer to end the call when it expires.
  useEffect(() => {
    endCallRef.current = (reason?: string) => {
      handleEndCall({ reason: reason || END_REASONS.TIME_LIMIT });
    };
  });

  /** Step 1 → patients finish right away, psychologists answer the outcome. */
  const confirmEndCall = () => {
    setShowEndConfirm(false);
    if (userType === 'psychologist') {
      setShowCrisisStep(true);
      return;
    }
    handleEndCall({ reason: END_REASONS.COMPLETED_BY_PATIENT });
  };

  /** Step 2 (psychologist): crisis outcome + optional observations. */
  const confirmCrisisOutcome = () => {
    const resolved = crisisResolved === 'sim';
    const notes = [
      resolved ? null : `Motivo: ${unresolvedCrisisLabel(unresolvedReason)}`,
      endNotes.trim() || null,
    ]
      .filter(Boolean)
      .join(' — ');

    setShowCrisisStep(false);
    handleEndCall({
      reason: END_REASONS.COMPLETED_BY_PSYCHOLOGIST,
      crisisResolved: resolved,
      notes: notes || null,
    });
  };

  /**
   * Closing the outcome modal must never leave the psychologist stuck:
   * the product rule is to consider the crisis resolved and finish.
   */
  const handleCrisisStepOpenChange = (open: boolean) => {
    if (open) return;
    setShowCrisisStep(false);
    handleEndCall({
      reason: END_REASONS.COMPLETED_BY_PSYCHOLOGIST,
      crisisResolved: true,
    });
  };


  const handleFeedbackClose = () => {
    setShowFeedbackModal(false);

    // Safety net: if any termination path failed before releasing hardware,
    // the camera/microphone must still be freed here.
    try {
      enhancedCleanup();
    } catch (error) {
      console.warn('[SOS] cleanup on feedback close failed', error);
    }



    toast({
      title: 'Chamada Finalizada',
      description: 'A videochamada foi encerrada com sucesso.',
    });

    // Let the parent close the emergency request (and redirect).
    if (onEndCall) {
      onEndCall(endInfoRef.current);
      return;
    }

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

  // Helper to determine what error/message to display
  const getDisplayError = () => {
    // Priority 1: Call termination message from real-time updates
    if (callTerminatedMessage) {
      return callTerminatedMessage;
    }
    
    // Priority 2: Call ended by someone (from WebRTC hook)
    if (callEndedBy) {
      const endedByName = callEndedBy.userType === 'psychologist' ? 'O psicólogo' : 'O paciente';
      return `${endedByName} encerrou a chamada de vídeo.`;
    }
    
    // Priority 3: Generic connection error
    if (error?.includes('finalizou a chamada')) {
      return error;
    }
    
    // Priority 4: Any other error
    if (error) {
      return `Erro na conexão: ${error}`;
    }
    
    return null;
  };

  const status = getConnectionStatus();
  const displayError = getDisplayError();

  if (isLoading && initTimedOut) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            Não conseguimos iniciar a chamada
          </h2>
          <p className="text-sm text-muted-foreground">
            Verifique se o navegador liberou o acesso à câmera e ao microfone e se
            nenhum outro aplicativo está usando esses dispositivos.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            <Button onClick={() => window.location.reload()}>Tentar novamente</Button>
            <Button variant="outline" onClick={() => navigate('/home')}>
              Voltar para o início
            </Button>
          </div>
        </div>
      </div>
    );
  }

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

  if (displayError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-8 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 mx-auto text-destructive" />
            <h3 className="text-xl font-semibold text-destructive">
              {callEndedBy ? 'Chamada Finalizada' : 'Erro na Videochamada'}
            </h3>
            <p className="text-muted-foreground">{displayError}</p>
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
    <div className="fixed inset-0 bg-background flex flex-col overflow-hidden">
      {showDiagnostics && (
        <CallDiagnosticsPanel
          data={diagnosticsData}
          onClose={() => {
            persistDiagnosticsFlag(false, globalThis.localStorage);
            setShowDiagnostics(false);
          }}
        />
      )}

      {showPatientContext && userType === 'psychologist' && (
        <PatientContextPanel
          requestId={emergencyRequestIdRef.current}
          onClose={() => setShowPatientContext(false)}
        />
      )}

      {/* Header fixo com informações - Responsivo */}
      <div className="fixed top-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-b border-border z-50 safe-area-top">
        <div className="flex items-center justify-between p-4 max-w-7xl mx-auto">
          {/* Informações do participante - Adaptável */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-primary flex items-center justify-center shadow-lg flex-shrink-0">
              <span className="text-white font-semibold text-sm md:text-lg">
                {userType === 'patient' ? (userInfo.name?.charAt(0) || 'Dr') : (userInfo.name?.charAt(0) || 'P')}
              </span>
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <div className="font-semibold text-sm md:text-lg truncate">
                {userType === 'patient' && userInfo.name ? `Dr. ${userInfo.name}` : 
                 userType === 'psychologist' && userInfo.name ? userInfo.name : 
                 'Conectando...'}
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${status.color === 'green' ? 'bg-success animate-pulse' : 'bg-warning'} shadow-sm`}></div>
                <span className="text-xs text-muted-foreground font-medium hidden sm:inline">{status.text}</span>
              </div>
            </div>
          </div>
          
          {/* Timer com destaque progressivo */}
          <div className="text-center px-2">
            <div
              className={`text-lg md:text-2xl font-mono font-bold px-2 md:px-4 py-1 md:py-2 rounded-lg transition-colors ${
                isTimerPaused
                  ? 'bg-muted text-muted-foreground opacity-70'
                  : timeLeft <= 60
                  ? 'bg-destructive text-destructive-foreground animate-pulse'
                  : timeLeft <= 300
                  ? 'bg-warning/20 text-warning-foreground'
                  : 'bg-muted'
              }`}
              title={isTimerPaused ? 'Tempo pausado — aguardando reconexão' : 'Tempo restante da sessão SOS'}
            >
              {formatTime(timeLeft)}
            </div>
            {isTimerPaused && (
              <div className="text-[10px] md:text-xs text-muted-foreground mt-1">Pausado</div>
            )}
          </div>

        </div>
      </div>

      {/* Área principal do vídeo - Tela inteira */}
      <div className="absolute inset-0 top-[72px] md:top-[88px] bottom-[100px] md:bottom-[120px] bg-background overflow-hidden">
        {/* Vídeo remoto - Tela inteira */}
        <div className="absolute inset-0">
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover"
            onLoadedData={() => console.log('🎥 Remote video loaded')}
            onError={(e) => console.error('❌ Remote video error:', e)}
          />
          
          {/* Remote camera off overlay */}
          {isConnected && remoteIsCameraOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="text-center">
                <div className="w-32 h-32 md:w-40 md:h-40 mx-auto rounded-full bg-gradient-primary flex items-center justify-center mb-4 shadow-2xl">
                  <span className="text-white font-bold text-3xl md:text-5xl">
                    {(remoteDisplayName || userInfo.name)?.charAt(0)?.toUpperCase() ||
                      (userType === 'patient' ? 'Dr' : 'P')}
                  </span>
                </div>
                <div className="text-muted-foreground text-base md:text-lg px-4">
                  {userType === 'patient'
                    ? 'Dr. ' + (remoteDisplayName || userInfo.name || 'Psicólogo')
                    : remoteDisplayName || userInfo.name || 'Paciente'}{' '}
                  desligou a câmera
                </div>
              </div>
            </div>
          )}
          
          {/* Remote mute indicator */}
          {isConnected && remoteMuted && (
            <div className="absolute top-4 left-4 bg-destructive/90 backdrop-blur-sm rounded-full p-2 md:p-3 shadow-lg z-20">
              <MicOff className="text-white" size={16} />
            </div>
          )}

          {/* Additional remote mute text indicator */}
          {isConnected && remoteMuted && (
            <div className="absolute top-16 left-4 bg-background/70 backdrop-blur-sm rounded-lg px-3 py-1 shadow-lg z-20">
              <div className="flex items-center gap-1 text-destructive">
                <MicOff size={14} />
                <span className="text-xs font-medium">Microfone desligado</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Connection quality indicator - Responsivo */}
        {peerConnection && isConnected && (
          <div className="absolute top-4 right-4 z-30">
            <ConnectionQuality peerConnection={peerConnection} />
          </div>
        )}
        
        {/* Banner de queda de conexão / reconexão automática */}
        {banner.visible && (
          <div
            data-testid="connection-banner"
            className="absolute top-4 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md"
          >
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-warning/90 text-warning-foreground px-4 py-3 shadow-lg backdrop-blur-sm text-center">
              <div className="flex items-center gap-2">
                {banner.variant === 'offline' ? (
                  <WifiOff className="w-4 h-4" />
                ) : (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                <span className="text-xs md:text-sm font-medium">{banner.title}</span>
              </div>
              <span className="text-[11px] md:text-xs opacity-90">{banner.description}</span>
              {banner.showRetry && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 text-xs"
                  onClick={forceReconnect}
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Tentar reconectar
                </Button>
              )}
            </div>
          </div>
        )}


        {/* Aviso: estado de câmera/microfone do outro participante pode estar desatualizado */}
        {isRemoteMediaStale && isConnected && (
          <div
            data-testid="remote-media-stale"
            className={`absolute ${banner.visible ? 'top-24' : 'top-4'} left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-full bg-muted/90 text-muted-foreground px-3 py-1.5 shadow-md backdrop-blur-sm`}
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="text-[11px] md:text-xs font-medium">
              Status de câmera/microfone desatualizado — sincronizando...
            </span>
          </div>
        )}

        {/* Placeholder quando não conectado */}
        {!isConnected && (
          <div className="absolute inset-0 flex items-center justify-center bg-background">
            <div className="text-center space-y-6 md:space-y-8 max-w-md mx-4">
              <div className="relative">
                <div className="w-32 h-32 md:w-40 md:h-40 mx-auto rounded-full bg-gradient-primary flex items-center justify-center shadow-2xl">
                  {connectionState === 'connecting' ? (
                    <Loader2 className="w-12 h-12 md:w-16 md:h-16 animate-spin text-white" />
                  ) : (
                    <span className="text-white font-bold text-3xl md:text-5xl">
                      {userType === 'patient' ? 'Dr' : (userInfo.name?.charAt(0) || 'P')}
                    </span>
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 w-6 h-6 md:w-8 md:h-8 bg-warning rounded-full flex items-center justify-center animate-pulse">
                  <div className="w-2 h-2 md:w-3 md:h-3 bg-white rounded-full"></div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-xl md:text-3xl font-semibold">
                  {isReconnecting
                    ? 'Tentando reconectar...'
                    : userType === 'psychologist' ? 'Aguardando paciente...' : 'Conectando com psicólogo...'}
                </h3>
                <p className="text-muted-foreground text-sm md:text-lg">
                  {isReconnecting
                    ? 'A conexão caiu. Restabelecendo automaticamente, aguarde...'
                    : connectionState === 'connecting' ? 'Estabelecendo conexão segura...' : status.text}
                </p>
                <div className="flex items-center justify-center gap-2 mt-4">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Vídeo próprio (self-view) - Responsivo e sobreposto */}
        <div className="absolute bottom-20 md:bottom-24 right-4 w-32 h-24 md:w-48 md:h-36 bg-card rounded-xl md:rounded-2xl border-2 border-border overflow-hidden shadow-2xl transition-transform cursor-pointer z-20">
          {isCameraOff ? (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <div className="text-center">
                <div className="w-10 h-10 md:w-16 md:h-16 mx-auto rounded-full bg-gradient-primary flex items-center justify-center mb-1 md:mb-2">
                  <span className="text-white font-semibold text-xs md:text-lg">
                    {currentUserName?.charAt(0)?.toUpperCase() || (userType === 'patient' ? 'P' : 'Dr')}
                  </span>
                </div>
                <CameraOff className="text-muted-foreground mx-auto mb-1" size={16} />
                <div className="text-xs text-muted-foreground font-medium">Câmera desligada</div>
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
                onLoadedData={() => {
                  console.log('📹 Local video loaded and playing');
                }}
                onError={(e) => {
                  console.error('❌ Local video error:', e);
                  // Try to reload the video on error
                  if (localVideoRef.current && localStream) {
                    setTimeout(() => {
                      if (localVideoRef.current) {
                        localVideoRef.current.srcObject = localStream;
                        localVideoRef.current.play().catch(console.error);
                      }
                    }, 500);
                  }
                }}
              />
              {/* Status indicators overlay */}
              <div className="absolute inset-0 pointer-events-none">
                {isMuted && (
                  <div className="absolute top-1 left-1 md:top-2 md:left-2 bg-destructive/90 backdrop-blur-sm rounded-full p-1 md:p-2 shadow-lg">
                    <MicOff className="text-white" size={12} />
                  </div>
                )}
              </div>
              {/* Name label with local audio meter */}
              <div className="absolute bottom-1 left-1 right-1 md:bottom-2 md:left-2 md:right-2">
                <div className="bg-background/60 backdrop-blur-sm rounded px-1 py-0.5 md:px-2 md:py-1">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground text-xs font-medium">Você</span>
                    <VoiceMeter stream={localStream} size="small" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Indicador de participante remoto com medidor - Sobreposto */}
        {isConnected && (
          <div className="absolute top-4 left-4 z-30">
            <div className="flex items-center gap-2 bg-background/70 backdrop-blur-md rounded-xl px-3 py-2 shadow-lg border border-border">
              <span className="text-foreground font-medium text-sm max-w-32 truncate">
                {userType === 'patient' ? (userInfo.name || 'Psicólogo') : (userInfo.name || 'Paciente')}
              </span>
              <VoiceMeter stream={remoteStream} size="small" />
            </div>
          </div>
        )}
      </div>

      {/* Barra de controles fixa na parte inferior - Sobreposta */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 safe-area-bottom z-40">
        {/* Indicadores de segurança - Desktop apenas */}
        <div className="hidden md:flex justify-center items-center gap-6 mb-4 text-muted-foreground text-sm">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-success" />
            <span>Conexão criptografada</span>
          </div>
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-primary" />
            <span>Qualidade HD</span>
          </div>
        </div>

        {/* Controles principais - Responsivos */}
        <div className="flex justify-center items-center gap-4 md:gap-6 max-w-sm md:max-w-md mx-auto">
          {/* Botão de microfone */}
          <button
            onClick={handleMuteToggle}
            className={`group relative w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all duration-200 ${
              isMuted 
                ? 'bg-destructive hover:bg-destructive/90 shadow-lg shadow-destructive/30' 
                : 'bg-muted hover:bg-muted/80 shadow-lg'
            }`}
          >
            {isMuted ? (
              <MicOff className="text-white" size={18} />
            ) : (
              <Mic className="text-foreground" size={18} />
            )}
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-popover text-popover-foreground px-3 py-1 rounded-md text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              {isMuted ? 'Ativar microfone' : 'Desativar microfone'}
            </div>
          </button>

          {/* Botão de câmera */}
          <button
            onClick={handleCameraToggle}
            className={`group relative w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all duration-200 ${
              isCameraOff 
                ? 'bg-destructive hover:bg-destructive/90 shadow-lg shadow-destructive/30' 
                : 'bg-muted hover:bg-muted/80 shadow-lg'
            }`}
          >
            {isCameraOff ? (
              <CameraOff className="text-white" size={18} />
            ) : (
              <Camera className="text-foreground" size={18} />
            )}
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-popover text-popover-foreground px-3 py-1 rounded-md text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              {isCameraOff ? 'Ativar câmera' : 'Desativar câmera'}
            </div>
          </button>

          {/* Botão de configurações */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="group relative w-12 h-12 md:w-14 md:h-14 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-all duration-200 shadow-lg"
          >
            <Settings className="text-foreground" size={18} />
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-popover text-popover-foreground px-3 py-1 rounded-md text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Configurações
            </div>
          </button>

          {/* Modo de diagnóstico (triagem de incidentes) */}
          <button
            onClick={() => setShowDiagnostics((v) => !v)}
            aria-pressed={showDiagnostics}
            className={`group relative w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg ${
              showDiagnostics ? 'bg-primary hover:bg-primary/90' : 'bg-muted hover:bg-muted/80'
            }`}
          >
            <Activity className={showDiagnostics ? 'text-primary-foreground' : 'text-foreground'} size={18} />
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-popover text-popover-foreground px-3 py-1 rounded-md text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              Diagnóstico (Ctrl+Shift+D)
            </div>
          </button>

          {/* Contexto do paciente (apenas psicólogo) */}
          {userType === 'psychologist' && (
            <button
              onClick={() => setShowPatientContext((v) => !v)}
              aria-pressed={showPatientContext}
              aria-label="Contexto do paciente"
              className={`group relative w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg ${
                showPatientContext ? 'bg-primary hover:bg-primary/90' : 'bg-muted hover:bg-muted/80'
              }`}
            >
              <UserRound
                className={showPatientContext ? 'text-primary-foreground' : 'text-foreground'}
                size={18}
              />
              <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-popover text-popover-foreground px-3 py-1 rounded-md text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Contexto do paciente
              </div>
            </button>
          )}



          {/* Botão de encerrar chamada */}
          <button
            onClick={() => setShowEndConfirm(true)}
            className="group relative w-14 h-14 md:w-16 md:h-16 rounded-full bg-destructive hover:bg-destructive/90 flex items-center justify-center transition-all duration-200 shadow-lg shadow-destructive/30"
          >
            <PhoneOff className="text-white" size={20} />
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-popover text-popover-foreground px-3 py-1 rounded-md text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
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
          console.log('🔄 Stream updated from settings modal');
        }}
        onDeviceStreamUpdate={updateDeviceStream}
      />

      {/* Etapa 1 — confirmação de encerramento */}
      <AlertDialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja finalizar a chamada?</AlertDialogTitle>
            <AlertDialogDescription>
              A chamada será encerrada para os dois participantes.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Continuar chamada</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmEndCall}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {userType === 'psychologist' ? 'Encerrar chamada' : 'Finalizar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Etapa 2 — desfecho do atendimento (somente psicólogo) */}
      <AlertDialog open={showCrisisStep} onOpenChange={handleCrisisStepOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>A crise do paciente foi resolvida?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa informação fica registrada no histórico do atendimento.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <RadioGroup
            value={crisisResolved}
            onValueChange={(v) => setCrisisResolved(v as 'sim' | 'nao')}
            className="grid grid-cols-2 gap-2 py-1"
          >
            {(['sim', 'nao'] as const).map((v) => (
              <div key={v} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <RadioGroupItem value={v} id={`crisis-${v}`} />
                <Label htmlFor={`crisis-${v}`} className="cursor-pointer text-sm font-normal">
                  {v === 'sim' ? 'Sim' : 'Não'}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {crisisResolved === 'nao' && (
            <div className="space-y-2">
              <Label className="text-sm">Qual foi o motivo principal?</Label>
              <RadioGroup
                value={unresolvedReason}
                onValueChange={setUnresolvedReason}
                className="max-h-52 gap-2 overflow-y-auto"
              >
                {UNRESOLVED_CRISIS_OPTIONS.map((o) => (
                  <div key={o.value} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <RadioGroupItem value={o.value} id={`unresolved-${o.value}`} />
                    <Label htmlFor={`unresolved-${o.value}`} className="cursor-pointer text-sm font-normal">
                      {o.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="end-notes" className="text-sm">Observações (opcional)</Label>
            <Textarea
              id="end-notes"
              value={endNotes}
              onChange={(e) => setEndNotes(e.target.value)}
              placeholder="Registre observações relevantes do atendimento"
              rows={3}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogAction onClick={confirmCrisisOutcome} className="w-full sm:w-auto">
              Finalizar atendimento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
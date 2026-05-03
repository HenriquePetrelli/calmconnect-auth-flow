import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Camera, CameraOff, PhoneOff, Loader2, AlertTriangle, Settings, Shield, Video } from 'lucide-react';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useToast } from '@/hooks/use-toast';
import VoiceMeter from '@/components/sos/VoiceMeter';
import { ConnectionQuality } from '@/components/sos/ConnectionQuality';
import { supabase } from '@/integrations/supabase/client';
import { FeedbackModal } from '@/components/sos/FeedbackModal';
import { VideoCallSettingsModal } from '@/components/sos/VideoCallSettingsModal';
import { useUserPreferences } from '@/hooks/useUserPreferences';

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
  const { preferences, isLoading: prefsLoading, loadPreferences } = useUserPreferences();
  
  // Use the URL parameter as the session ID (this should be the WebRTC session ID, not the emergency request ID)
  const sessionId = propSessionId || paramSessionId;
  const [userType, setUserType] = useState<'psychologist' | 'patient'>(propUserType || 'patient');
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionValid, setSessionValid] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
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
  const [callTerminatedMessage, setCallTerminatedMessage] = useState<string | null>(null);

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
    session,
    toggleAudio,
    toggleVideo,
    cleanup,
    updateDeviceStream
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
          toast({
            title: 'Conexão Perdida',
            description: 'A conexão da videochamada foi perdida.',
            variant: 'destructive',
          });
        }
      }
    }
  });


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
        // Cleanup listener when component unmounts
        return () => window.removeEventListener('webrtc-session-update', handleSessionUpdate as EventListener);
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
  }, [sessionId, navigate, toast]);

  // Load and apply user preferences on connection
  useEffect(() => {
    const applySavedSettings = async () => {
      if (!isConnected || prefsLoading) return;
      
      try {
        console.log('🔧 Applying saved device preferences...');
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: preferences } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (preferences && updateDeviceStream) {
          console.log('📱 Found saved preferences, applying them...');
          
          // Get new stream with preferred devices
          const newStream = await navigator.mediaDevices.getUserMedia({
            video: preferences.camera_device_id ? 
              { deviceId: preferences.camera_device_id } : true,
            audio: preferences.mic_device_id ? 
              { deviceId: preferences.mic_device_id } : true
          });
          
          // Update the stream in the peer connection
          await updateDeviceStream(newStream);
          
          console.log('✅ Device preferences applied successfully');
        }
      } catch (error) {
        console.warn('⚠️ Could not apply saved device preferences:', error);
      }
    };

    applySavedSettings();
  }, [isConnected, prefsLoading, updateDeviceStream]);

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
    
    // 5. Force device release by getting and immediately stopping a temporary stream
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      tempStream.getTracks().forEach(track => track.stop());
      console.log('📵 Devices forcefully released');
    } catch (error) {
      console.log('⚠️ Force release not needed or possible:', error);
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
      .channel('webrtc-session-updates')
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
          
          // Update remote mute status
          if (newData[`${remoteUserType}_muted`] !== undefined) {
            setRemoteMuted(newData[`${remoteUserType}_muted`]);
            console.log('🎤 Remote mute status updated:', newData[`${remoteUserType}_muted`]);
          }
          
          // Update remote camera status
          if (newData[`${remoteUserType}_camera_off`] !== undefined) {
            setRemoteIsCameraOff(newData[`${remoteUserType}_camera_off`]);
            console.log('📹 Remote camera status updated:', newData[`${remoteUserType}_camera_off`]);
          }
          
          // Check if call was terminated
          if (newData.status === 'completed' && newData.ended_by && newData.ended_by_type) {
            const endedByType = newData.ended_by_type;
            const endedByName = endedByType === 'psychologist' ? 'O psicólogo' : 'O paciente';
            
            console.log('📞 Call terminated by:', endedByName);
            setCallTerminatedMessage(`${endedByName} encerrou a chamada de vídeo.`);
            
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
    
    // Set up interval for continuous verification
    const interval = setInterval(updateLocalVideo, 2000);
    
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

  const handleMuteToggle = async () => {
    try {
      // First update local state immediately for visual feedback
      setIsMuted(prev => !prev);
      
      // Execute toggle in WebRTC hook
      const muted = toggleAudio();
      
      // Communicate status via Supabase
      if (sessionId) {
        const { error } = await supabase
          .from('webrtc_sessions')
          .update({ 
            [`${userType}_muted`]: muted,
            updated_at: new Date().toISOString()
          } as any)
          .eq('id', sessionId);
        
        if (error) {
          console.error('Error updating mute status:', error);
          // Revert local state on error
          setIsMuted(prev => !prev);
        } else {
          console.log('🎤 Mute status updated in database:', muted);
        }
      }
      
      console.log('🎤 Audio toggled:', muted ? 'muted' : 'unmuted');
    } catch (error) {
      console.error('Failed to toggle audio:', error);
      setIsMuted(prev => !prev); // Revert on error
    }
  };

  const handleCameraToggle = async () => {
    try {
      // Immediate visual feedback
      setIsCameraOff(prev => !prev);
      
      // Execute toggle
      const cameraOff = toggleVideo();
      
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
          
          if (error) {
            console.error('Error updating camera status:', error);
            setIsCameraOff(prev => !prev);
          } else {
            console.log('📹 Camera status updated in database:', cameraOff);
          }
        } catch (error) {
          console.error('Failed to update camera status:', error);
          setIsCameraOff(prev => !prev);
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


  const handleEndCall = async () => {
    try {
      console.log('🔄 Starting complete call cleanup...');
      
      // 1. Update session status and mark who ended the call FIRST
      if (sessionId) {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from('webrtc_sessions')
          .update({ 
            status: 'completed',
            ended_by: user?.id,
            ended_by_type: userType,
            ended_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId);
        
        if (error) {
          console.error('Error updating session status:', error);
        } else {
          console.log('📝 Session marked as completed in database');
        }
      }
      
      // 2. Enhanced cleanup of all media devices
      await enhancedCleanup();
      
      // 3. Call cleanup from hook
      cleanup();
      
      console.log('✅ Complete call cleanup finished');

      // Show feedback modal
      setShowFeedbackModal(true);
    } catch (error) {
      console.error('❌ Error ending call:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao finalizar chamada',
        variant: 'destructive',
      });
      
      if (onEndCall) {
        onEndCall();
      } else {
        navigate('/home');
      }
    }
  };

  const handleFeedbackClose = () => {
    setShowFeedbackModal(false);
    
    toast({
      title: 'Chamada Finalizada',
      description: 'A videochamada foi encerrada com sucesso.',
    });

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
          
          {/* Timer - Responsivo */}
          <div className="text-center px-2">
            <div className="text-lg md:text-2xl font-mono font-bold bg-muted px-2 md:px-4 py-1 md:py-2 rounded-lg">
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>
      </div>

      {/* Área principal do vídeo - Tela inteira */}
      <div className="absolute inset-0 top-[72px] md:top-[88px] bottom-[100px] md:bottom-[120px] bg-background overflow-hidden">
        
        {/* Continuous local video stream updater */}
        {localStream && (
          <div style={{ display: 'none' }}>
            <video
              ref={(el) => {
                if (el && localVideoRef.current !== el) {
                  localVideoRef.current = el;
                }
                if (el && localStream) {
                  el.srcObject = localStream;
                  el.play().catch(console.error);
                }
              }}
            />
          </div>
        )}
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
                    {userType === 'patient' ? (userInfo.name?.charAt(0)?.toUpperCase() || 'Dr') : (userInfo.name?.charAt(0)?.toUpperCase() || 'P')}
                  </span>
                </div>
                <div className="text-muted-foreground text-base md:text-lg px-4">
                  {userType === 'patient' ? 'Dr. ' + (userInfo.name || 'Psicólogo') : (userInfo.name || 'Paciente')} desligou a câmera
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
                  {userType === 'psychologist' ? 'Aguardando paciente...' : 'Conectando com psicólogo...'}
                </h3>
                <p className="text-muted-foreground text-sm md:text-lg">
                  {connectionState === 'connecting' ? 'Estabelecendo conexão segura...' : status.text}
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

        {/* Real-time local video stream updater */}
        {localStream && (
          <div className="absolute inset-0 pointer-events-none">
            <video
              key={`local-stream-${Date.now()}`}
              ref={(el) => {
                if (el && localStream) {
                  // Continuously update to ensure live video feed
                  const updateVideo = () => {
                    if (el.srcObject !== localStream) {
                      el.srcObject = localStream;
                      el.play().catch(console.error);
                    }
                  };
                  updateVideo();
                  // Update every second to ensure stream continuity
                  const interval = setInterval(updateVideo, 1000);
                  return () => clearInterval(interval);
                }
              }}
              style={{ display: 'none' }}
              autoPlay
              playsInline
              muted
            />
          </div>
        )}

        {/* Vídeo próprio (self-view) - Responsivo e sobreposto */}
        <div className="absolute bottom-20 md:bottom-24 right-4 w-32 h-24 md:w-48 md:h-36 bg-card rounded-xl md:rounded-2xl border-2 border-border overflow-hidden shadow-2xl transition-transform hover:scale-105 cursor-pointer z-20">
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

          {/* Botão de encerrar chamada */}
          <button
            onClick={handleEndCall}
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
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import { useNavigate, useLocation } from "react-router-dom";
import CancelConfirmationModal from "@/components/sos/CancelConfirmationModal";
import SupportiveMessages from "@/components/sos/SupportiveMessages";
import { supabase } from "@/integrations/supabase/client";
import { useEmergencySOS } from "@/hooks/useEmergencySOS";

const SOS = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [availableProfessionals, setAvailableProfessionals] = useState(0);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');
  const { cancelRequest, createEmergencyRequest } = useEmergencySOS();
  
  // Get requestId from navigation state (passed from SOSButton)
  const expectedRequestId = location.state?.requestId;
  
  // Use ref to store requestId for cleanup without causing re-renders
  const requestIdRef = useRef<string | null>(null);
  const acceptedRef = useRef<boolean>(false);
  
  // Update ref when requestId changes
  useEffect(() => {
    requestIdRef.current = requestId;
  }, [requestId]);

  // Cleanup function that runs only when component unmounts (user leaves the page)
  useEffect(() => {
    return () => {
      // Only cleanup if we have a requestId, the request was NOT accepted, and we're leaving the page
      if (requestIdRef.current && !acceptedRef.current) {
        console.log(`User left SOS page without acceptance, cleaning up pending request: ${requestIdRef.current}`);
        cancelRequest(requestIdRef.current).catch(console.error);
      } else if (acceptedRef.current) {
        console.log('Skipping cleanup: emergency was accepted, preserving request and session.');
      }
    };
  }, []); // Empty dependency array - only runs on unmount

  // Fetch latest emergency request for current user and subscribe for acceptance
  useEffect(() => {
    let reqChannel: any = null;
    
    // Listen for emergency acceptance events
    const handleEmergencyAccepted = (event: CustomEvent) => {
      const { sessionId, requestId } = event.detail;
      console.log('Emergency accepted, redirecting to call:', { sessionId, requestId });
      acceptedRef.current = true;
      navigate(`/emergency-call/${sessionId}?userType=patient&requestId=${requestId}`);
    };
    
    window.addEventListener('emergencyAccepted', handleEmergencyAccepted as EventListener);
    
    const init = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const currentUserId = auth.user?.id;
      if (!currentUserId) {
        navigate('/home');
        return;
      }
      
      setUserId(currentUserId);

      // If we have an expected requestId from navigation, use it
      // Otherwise, get the most recent pending/waiting request
      let data: any = null;
      
      if (expectedRequestId) {
        // Fetch the specific request we just created
        const { data: specificRequest } = await supabase
          .from('emergency_requests')
          .select('id, status, room_url, video_room_id, created_at')
          .eq('id', expectedRequestId)
          .eq('patient_id', currentUserId)
          .maybeSingle();
        data = specificRequest;
      } else {
        // Fallback: Get the most recent pending/waiting request
        const { data: latestRequest } = await supabase
          .from('emergency_requests')
          .select('id, status, room_url, video_room_id, created_at')
          .eq('patient_id', currentUserId)
          .in('status', ['pending', 'waiting'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        data = latestRequest;
      }

      // If no existing request, create one now
      if (!data) {
        try {
          console.log('🆘 No existing request found, creating one from SOS page...');
          const newId = await createEmergencyRequest();
          if (newId) {
            const { data: created } = await supabase
              .from('emergency_requests')
              .select('id, status, room_url, video_room_id, created_at')
              .eq('id', newId)
              .maybeSingle();
            data = created;
          }
        } catch (err) {
          console.error('❌ Failed to create emergency request from SOS page:', err);
          setLoading(false);
          navigate('/home');
          return;
        }
      }

      if (data) {
        const id = (data as any).id as string;
        setRequestId(id);

        // Only navigate to call if this specific request is accepted
        const sessionId = (data as any).video_room_id || (data as any).room_url;
        if ((data as any).status === 'accepted' && sessionId) {
          navigate(`/emergency-call/${sessionId}?userType=patient&requestId=${id}`);
          return;
        }

        // Subscribe to updates for this request
        reqChannel = supabase
          .channel(`emergency_watch_${id}`)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'emergency_requests', filter: `id=eq.${id}` }, (payload) => {
            const n = payload.new as any;
            const sessionId = n.video_room_id || n.room_url;
            if (n.status === 'accepted' && sessionId) {
              console.log('✅ Realtime acceptance received. Redirecting to call.', { sessionId, id });
              acceptedRef.current = true;
              navigate(`/emergency-call/${sessionId}?userType=patient&requestId=${id}`);
              if (reqChannel) supabase.removeChannel(reqChannel);
            }
          })
          .subscribe();
      }
      setLoading(false);
    };

    init();

    return () => {
      if (reqChannel) supabase.removeChannel(reqChannel);
      window.removeEventListener('emergencyAccepted', handleEmergencyAccepted as EventListener);
    };
  }, [navigate]);

  // Track online professionals
  useEffect(() => {
    let active = true;
    const fetchOnline = async () => {
      const { count } = await supabase
        .from('psychologist_presence')
        .select('*', { count: 'exact', head: true });
      if (active) setAvailableProfessionals(count ?? 0);
    };
    fetchOnline();

    const channel = supabase
      .channel('presence_watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'psychologist_presence' }, () => {
        fetchOnline();
      })
      .subscribe();

    // Fallback polling in case the realtime socket drops
    const interval = window.setInterval(fetchOnline, 15000);

    return () => {
      active = false;
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);


  const handleCancelConfirm = async () => {
    setShowCancelModal(false);
    if (requestId) {
      try {
        console.log(`User manually cancelled request: ${requestId}`);
        await cancelRequest(requestId);
      } catch (error) {
        console.error('Error cancelling request:', error);
      }
    }
    navigate('/home');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        Preparando sua solicitação...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageHeader title="Solicitar ajuda" onBack={() => setShowCancelModal(true)} />

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8">
        {/* Status da busca */}
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-6">
            {/* Loader animado */}
            <div className="w-20 h-20 mx-auto">
              <div className="relative w-full h-full">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                <div className="absolute inset-2 rounded-full border-2 border-primary/40 border-b-transparent animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }}></div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-foreground">
                Buscando profissional...
              </h2>
              <p className="text-primary font-medium">
                Profissionais online: {availableProfessionals}
              </p>
              <p className="text-muted-foreground text-sm">
                Assim que um psicólogo aceitar, abriremos a sala de vídeo automaticamente.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Mensagens de apoio */}
        <SupportiveMessages />

        {/* Botão cancelar */}
        <Button
          variant="outline"
          onClick={() => setShowCancelModal(true)}
          className="px-8"
        >
          Cancelar
        </Button>
      </div>

      <CancelConfirmationModal
        open={showCancelModal}
        onOpenChange={setShowCancelModal}
        onConfirm={handleCancelConfirm}
      />
    </div>
  );
};

export default SOS;
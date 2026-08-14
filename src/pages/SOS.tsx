import { useState, useEffect, useRef } from "react";
import { AlertTriangle, Phone, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import { useNavigate, useLocation } from "react-router-dom";
import CancelConfirmationModal from "@/components/sos/CancelConfirmationModal";
import SupportiveMessages from "@/components/sos/SupportiveMessages";
import { supabase } from "@/integrations/supabase/client";
import { useEmergencySOS } from "@/hooks/useEmergencySOS";
import { notifySosQueueChanged, subscribeSosQueue } from "@/lib/sosQueueChannel";


/** Server-side TTL for pending SOS requests (finalize_stale_emergency_sessions). */
const QUEUE_TTL_MS = 10 * 60 * 1000;

const formatCountdown = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const SOS = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [availableProfessionals, setAvailableProfessionals] = useState(0);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(QUEUE_TTL_MS / 1000);
  const [expired, setExpired] = useState(false);
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
        cancelRequest(requestIdRef.current, 'abandoned')
          .catch(console.error)
          .finally(() => notifySosQueueChanged({ requestId: requestIdRef.current }));
      } else if (acceptedRef.current) {
        console.log('Skipping cleanup: emergency was accepted, preserving request and session.');
      }
    };
  }, []); // Empty dependency array - only runs on unmount

  // Closing the tab / app must also drop the request from the psychologist queue.
  useEffect(() => {
    const handleUnload = () => {
      const id = requestIdRef.current;
      if (!id || acceptedRef.current || !userId) return;

      const payload = JSON.stringify({ request_id: id, patient_id: userId });
      try {
        navigator.sendBeacon(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/emergency-cleanup`,
          new Blob([payload], { type: 'application/json' })
        );
      } catch (error) {
        console.error('[SOS] failed to cleanup on unload', error);
      }
      notifySosQueueChanged({ requestId: id });
    };

    window.addEventListener('pagehide', handleUnload);
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('pagehide', handleUnload);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [userId]);


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
      // Otherwise, get the most recent pending request
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
        // Fallback: Get the most recent pending request
        const { data: latestRequest } = await supabase
          .from('emergency_requests')
          .select('id, status, room_url, video_room_id, created_at')
          .eq('patient_id', currentUserId)
          .eq('status', 'pending')
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
        setCreatedAt((data as any).created_at ?? new Date().toISOString());
        // Wake up every psychologist dashboard immediately.
        notifySosQueueChanged({ requestId: id });


        // Only navigate to call if this specific request is accepted
        const sessionId = (data as any).video_room_id || (data as any).room_url;
        if (['accepted', 'in_progress'].includes((data as any).status) && sessionId) {
          acceptedRef.current = true;
          navigate(`/emergency-call/${sessionId}?userType=patient&requestId=${id}`);
          return;
        }

        // Subscribe to updates for this request
        reqChannel = supabase
          .channel(`emergency_watch_${id}`)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'emergency_requests', filter: `id=eq.${id}` }, (payload) => {
            const n = payload.new as any;
            const sessionId = n.video_room_id || n.room_url;
            if (['accepted', 'in_progress'].includes(n.status) && sessionId) {
              console.log('✅ Realtime acceptance received. Redirecting to call.', { sessionId, id });
              acceptedRef.current = true;
              navigate(`/emergency-call/${sessionId}?userType=patient&requestId=${id}`);
              if (reqChannel) supabase.removeChannel(reqChannel);
            } else if (['cancelled', 'completed'].includes(n.status)) {
              // The server finalized the wait (10 min TTL) — say it explicitly.
              acceptedRef.current = true;
              setExpired(true);
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

  // Track professionals that are really available (fresh heartbeat + free)
  useEffect(() => {
    let active = true;
    const fetchOnline = async () => {
      const { data, error } = await supabase.rpc('count_available_psychologists');
      if (active && !error) setAvailableProfessionals(Number(data ?? 0));
    };
    fetchOnline();

    const channel = supabase
      .channel(`presence_watch_${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'psychologist_presence' }, () => {
        fetchOnline();
      })
      .subscribe();

    // A psychologist accepting/declining also changes availability.
    const unsubscribeQueue = subscribeSosQueue(fetchOnline);

    // Fallback polling in case the realtime socket drops
    const interval = window.setInterval(fetchOnline, 8000);

    return () => {
      active = false;
      window.clearInterval(interval);
      unsubscribeQueue();
      supabase.removeChannel(channel);
    };
  }, []);


  // Countdown mirroring the server-side 10 minute TTL for pending requests.
  useEffect(() => {
    if (!createdAt || expired) return;
    const deadline = new Date(createdAt).getTime() + QUEUE_TTL_MS;

    const tick = () => {
      const left = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) setExpired(true);
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [createdAt, expired]);



  const handleCancelConfirm = async () => {
    setShowCancelModal(false);
    if (requestId) {
      try {
        console.log(`User manually cancelled request: ${requestId}`);
        await cancelRequest(requestId, 'cancelled_by_patient');
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
            {!expired && (
              <div className="w-20 h-20 mx-auto">
                <div className="relative w-full h-full">
                  <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                  <div className="absolute inset-2 rounded-full border-2 border-primary/40 border-b-transparent animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }}></div>
                </div>
              </div>
            )}

            {expired ? (
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold text-foreground">
                  Nenhum profissional pôde atender
                </h2>
                <p className="text-muted-foreground text-sm">
                  Sua solicitação expirou após o tempo máximo de espera. Você pode tentar novamente
                  ou usar os recursos de apoio abaixo.
                </p>
                <Button onClick={() => window.location.reload()} className="w-full">
                  Tentar novamente
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold text-foreground">
                  Buscando profissional...
                </h2>
                <p className="text-primary font-medium">
                  Profissionais disponíveis: {availableProfessionals}
                </p>
                <p className="text-2xl font-mono font-semibold text-foreground tabular-nums">
                  {formatCountdown(secondsLeft)}
                </p>
                <p className="text-muted-foreground text-sm">
                  Assim que um psicólogo aceitar, abriremos a sala de vídeo automaticamente.
                </p>
              </div>
            )}
          </CardContent>
        </Card>


        {/* Nenhum profissional online: orientar em vez de deixar esperando */}
        {availableProfessionals === 0 && (
          <Card className="w-full max-w-md border-destructive/30 bg-destructive/5">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-foreground">
                    Nenhum profissional online agora
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Sua solicitação continua na fila e será atendida assim que alguém ficar disponível.
                    Enquanto isso, você pode usar estes recursos:
                  </p>
                </div>
              </div>

              <div className="grid gap-2">
                <Button variant="secondary" onClick={() => navigate('/breathing')}>
                  <Wind className="h-4 w-4" />
                  Respiração guiada
                </Button>
                <Button variant="outline" asChild>
                  <a href="tel:188">
                    <Phone className="h-4 w-4" />
                    Ligar para o CVV (188)
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="tel:192">
                    <Phone className="h-4 w-4" />
                    Emergência médica (192)
                  </a>
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Em risco imediato de vida, procure o serviço de emergência mais próximo.
              </p>
            </CardContent>
          </Card>
        )}


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
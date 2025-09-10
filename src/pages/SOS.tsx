import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CancelConfirmationModal from "@/components/sos/CancelConfirmationModal";
import SupportiveMessages from "@/components/sos/SupportiveMessages";
import { supabase } from "@/integrations/supabase/client";
import { useSOSCleanup } from "@/hooks/useSOSCleanup";
import { useEmergencySOS } from "@/hooks/useEmergencySOS";

const SOS = () => {
  const navigate = useNavigate();
  const [availableProfessionals, setAvailableProfessionals] = useState(0);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');
  const { cancelRequest } = useEmergencySOS();

  // Enable automatic cleanup only when we have a valid requestId and user
  useSOSCleanup({ requestId: requestId && userId ? requestId : null, enabled: !!requestId && !!userId });

  // Fetch latest emergency request for current user and subscribe for acceptance
  useEffect(() => {
    let reqChannel: any = null;
    const init = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const currentUserId = auth.user?.id;
      if (!currentUserId) {
        navigate('/home');
        return;
      }
      
      setUserId(currentUserId);

      // Get the most recent request from this user
      const { data } = await supabase
        .from('emergency_requests')
        .select('id, status, room_url, created_at')
        .eq('patient_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        const id = (data as any).id as string;
        setRequestId(id);

        // Navigate to call when accepted and we have a room
        if ((data as any).status === 'accepted' && (data as any).room_url) {
          navigate(`/emergency/call/${id}`);
        }

        // Subscribe to updates for this request
        reqChannel = supabase
          .channel(`emergency_watch_${id}`)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'emergency_requests', filter: `id=eq.${id}` }, (payload) => {
            const n = payload.new as any;
            if (n.status === 'accepted' && n.room_url) {
              navigate(`/emergency/call/${id}`);
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
    };
  }, [navigate]);

  // Track online professionals
  useEffect(() => {
    const fetchOnline = async () => {
      const { count } = await supabase
        .from('psychologist_presence')
        .select('*', { count: 'exact', head: true });
      setAvailableProfessionals(count ?? 0);
    };
    fetchOnline();

    const channel = supabase
      .channel('presence_watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'psychologist_presence' }, () => {
        fetchOnline();
      });

    // Subscribe without returning the Promise to React
    channel.subscribe();

    return () => {
      // Cleanup without returning a Promise
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCancelConfirm = async () => {
    setShowCancelModal(false);
    if (requestId) {
      try {
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
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-border">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setShowCancelModal(true)}
        >
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Solicitar ajuda</h1>
      </div>

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
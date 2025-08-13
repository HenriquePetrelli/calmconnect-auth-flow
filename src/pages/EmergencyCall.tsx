import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const EmergencyCall = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Chamada de Emergência | Soliv";
  }, []);

  // Fetch and subscribe to request changes
  useEffect(() => {
    const load = async () => {
      if (!requestId) return;
      setLoading(true);
      const { data } = await supabase
        .from("emergency_requests")
        .select("id, room_url, started_at, ended_at, status")
        .eq("id", requestId)
        .maybeSingle();

      if (data) {
        setRoomUrl((data as any).room_url ?? null);
        setStartedAt((data as any).started_at ?? null);
      }
      setLoading(false);

      // Subscribe to row updates
      const channel = supabase
        .channel(`emergency_call_${requestId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'emergency_requests', filter: `id=eq.${requestId}` },
          (payload) => {
            const n = payload.new as any;
            setRoomUrl(n.room_url ?? null);
            setStartedAt(n.started_at ?? null);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    load();
  }, [requestId]);

  // Mark call as started
  useEffect(() => {
    const markStarted = async () => {
      if (!requestId) return;
      const { data } = await supabase
        .from('emergency_requests')
        .select('started_at')
        .eq('id', requestId)
        .maybeSingle();

      if (data && !(data as any).started_at) {
        await supabase
          .from('emergency_requests')
          .update({ started_at: new Date().toISOString(), status: 'in_progress' })
          .eq('id', requestId);
        // Mark SOS usage for Plus plans when call actually connects
        await supabase.functions.invoke('mark-sos-used', { body: { request_id: requestId } });
      }
    };

    markStarted();
  }, [requestId]);

  const endCall = async () => {
    if (!requestId) return;
    const end = new Date();
    let duration: number | null = null;
    if (startedAt) {
      duration = Math.max(0, Math.floor((end.getTime() - new Date(startedAt).getTime()) / 1000));
    }
    await supabase
      .from('emergency_requests')
      .update({ ended_at: end.toISOString(), status: 'completed', duration })
      .eq('id', requestId);
    navigate('/home');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando chamada...</div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="p-4 border-b">
        <h1 className="text-xl font-semibold">Chamada de Emergência</h1>
      </header>
      <main className="flex-1">
        {roomUrl ? (
          <iframe src={roomUrl} title="Daily Call" className="w-full h-[calc(100vh-9rem)] border-0" allow="camera; microphone; display-capture; autoplay" />
        ) : (
          <div className="h-full flex items-center justify-center text-center p-8 text-muted-foreground">
            Aguardando link da sala...
          </div>
        )}
      </main>
      <footer className="p-4 border-t flex justify-center">
        <Button variant="destructive" onClick={endCall}>Encerrar Chamada</Button>
      </footer>
    </div>
  );
};

export default EmergencyCall;

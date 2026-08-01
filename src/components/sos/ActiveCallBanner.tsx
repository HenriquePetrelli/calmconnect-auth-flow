import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PhoneCall, Video } from 'lucide-react';
import { useActiveEmergencyCall } from '@/hooks/useActiveEmergencyCall';

const formatElapsed = (startedAt: string | null) => {
  if (!startedAt) return null;
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const ActiveCallBanner = () => {
  const { activeCall } = useActiveEmergencyCall();
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState<string | null>(null);

  useEffect(() => {
    if (!activeCall?.startedAt) {
      setElapsed(null);
      return;
    }
    setElapsed(formatElapsed(activeCall.startedAt));
    const id = window.setInterval(() => setElapsed(formatElapsed(activeCall.startedAt)), 1000);
    return () => window.clearInterval(id);
  }, [activeCall?.startedAt]);

  if (!activeCall) return null;

  return (
    <div
      role="status"
      className="mt-4 mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 flex flex-col sm:flex-row sm:items-center gap-3"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/15">
          <PhoneCall className="h-5 w-5 text-destructive" />
          <span className="absolute inset-0 rounded-full border-2 border-destructive/40 animate-ping" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            Chamada de emergência em andamento
          </p>
          <p className="text-xs text-muted-foreground">
            {elapsed
              ? `A sala continua aberta • ${elapsed}`
              : 'A sala continua aberta até que a chamada seja encerrada.'}
          </p>
        </div>
      </div>
      <Button
        onClick={() =>
          navigate(
            `/emergency-call/${activeCall.sessionId}?userType=${activeCall.role}&requestId=${activeCall.requestId}`
          )
        }
        className="bg-destructive hover:bg-destructive/90 text-white shrink-0"
      >
        <Video className="h-4 w-4 mr-2" />
        Retornar à chamada
      </Button>
    </div>
  );
};

export default ActiveCallBanner;

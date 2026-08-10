import React, { useEffect, useMemo, useState } from 'react';
import { Copy, X, Activity, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  buildDiagnosticsGroups,
  buildDiagnosticsSnapshot,
  type DiagnosticsInput,
  type DiagnosticsTone,
} from '@/lib/callDiagnostics';

const toneClass: Record<DiagnosticsTone, string> = {
  ok: 'text-emerald-400',
  warn: 'text-amber-400',
  error: 'text-destructive',
  idle: 'text-muted-foreground',
};

interface TraceEvent {
  id: string;
  event_type: string;
  actor_type: string;
  created_at: string;
  message: string | null;
}

interface CallDiagnosticsPanelProps {
  data: DiagnosticsInput;
  onClose: () => void;
}

/**
 * Incident triage overlay for the SOS call.
 * Read-only: it never mutates call state, it only mirrors it.
 */
export const CallDiagnosticsPanel: React.FC<CallDiagnosticsPanelProps> = ({ data, onClose }) => {
  const { toast } = useToast();
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const groups = useMemo(() => buildDiagnosticsGroups(data), [data]);

  const loadEvents = React.useCallback(async () => {
    if (!data.sessionId && !data.requestId) return;
    setLoadingEvents(true);
    try {
      let query = supabase
        .from('sos_trace_events')
        .select('id, event_type, actor_type, created_at, message')
        .order('created_at', { ascending: false })
        .limit(15);

      query = data.requestId
        ? query.eq('emergency_request_id', data.requestId)
        : query.eq('session_id', data.sessionId as string);

      const { data: rows } = await query;
      setEvents((rows as TraceEvent[]) ?? []);
    } finally {
      setLoadingEvents(false);
    }
  }, [data.sessionId, data.requestId]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const copySnapshot = async () => {
    const snapshot = [
      buildDiagnosticsSnapshot(data),
      '',
      '[Eventos]',
      ...events.map((e) => `- ${e.created_at} ${e.event_type} (${e.actor_type})${e.message ? ` — ${e.message}` : ''}`),
    ].join('\n');

    try {
      await navigator.clipboard.writeText(snapshot);
      toast({ title: 'Diagnóstico copiado', description: 'Cole no chamado de suporte.' });
    } catch {
      toast({ title: 'Não foi possível copiar', variant: 'destructive' });
    }
  };

  return (
    <aside
      role="complementary"
      aria-label="Diagnóstico da chamada"
      className="fixed right-3 top-3 bottom-3 z-50 flex w-[min(24rem,calc(100vw-1.5rem))] flex-col rounded-2xl border border-border/60 bg-background/95 shadow-2xl backdrop-blur"
    >
      <header className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="text-sm font-semibold">Diagnóstico da chamada</h2>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={copySnapshot} aria-label="Copiar diagnóstico">
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar diagnóstico">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="space-y-5 px-4 py-4">
          {groups.map((group) => (
            <section key={group.title} className="space-y-1.5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.title}</h3>
              <dl className="space-y-1">
                {group.rows.map((row) => (
                  <div key={row.label} className="flex items-start justify-between gap-3 text-xs">
                    <dt className="text-muted-foreground">{row.label}</dt>
                    <dd className={`max-w-[55%] break-all text-right font-mono ${toneClass[row.tone]}`}>{row.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}

          <section className="space-y-1.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Eventos recentes
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => void loadEvents()}
                aria-label="Atualizar eventos"
              >
                <RefreshCw className={`h-3 w-3 ${loadingEvents ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            {events.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum evento registrado ainda.</p>
            ) : (
              <ul className="space-y-1">
                {events.map((event) => (
                  <li key={event.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono text-foreground/90">{event.event_type}</span>
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Badge variant="outline" className="px-1 py-0 text-[10px]">
                        {event.actor_type}
                      </Badge>
                      {new Date(event.created_at).toLocaleTimeString('pt-BR')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </ScrollArea>
    </aside>
  );
};

export default CallDiagnosticsPanel;

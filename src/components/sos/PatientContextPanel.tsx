import React from 'react';
import { X, UserRound, Activity, History, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSosPatientContext } from '@/hooks/useSosPatientContext';
import { describeEndReason, formatDateTime, formatDuration, sosStatusLabel } from '@/lib/sosHistory';

interface PatientContextPanelProps {
  requestId: string | null;
  onClose: () => void;
}

const moodLabel = (value?: number | null) => (value == null ? '—' : `${value}/5`);

/**
 * Read-only triage summary of the patient, shown to the psychologist during
 * an ongoing SOS call. It never mutates call state.
 */
export const PatientContextPanel: React.FC<PatientContextPanelProps> = ({ requestId, onClose }) => {
  const { context, loading, error } = useSosPatientContext(requestId, true);
  const patient = context?.patient;

  return (
    <aside
      role="complementary"
      aria-label="Contexto do paciente"
      className="fixed left-3 top-3 bottom-3 z-50 flex w-[min(22rem,calc(100vw-1.5rem))] flex-col rounded-2xl border border-border/60 bg-background/95 shadow-2xl backdrop-blur"
    >
      <header className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <UserRound className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="text-sm font-semibold">Contexto do paciente</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar contexto do paciente">
          <X className="h-4 w-4" />
        </Button>
      </header>

      <ScrollArea className="flex-1">
        <div className="space-y-5 px-4 py-4">
          {loading && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Carregando…
            </p>
          )}

          {!loading && (error || !context) && (
            <p className="text-xs text-muted-foreground">
              Não foi possível carregar o contexto deste paciente agora.
            </p>
          )}

          {patient && (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Identificação</h3>
              <p className="text-sm font-medium text-foreground">{patient.full_name ?? 'Paciente'}</p>
              <p className="text-xs text-muted-foreground">
                {[patient.city, patient.state].filter(Boolean).join(' • ') || 'Localização não informada'}
              </p>
              <p className="text-xs text-muted-foreground">
                Humor mais recente: <span className="text-foreground">{moodLabel(patient.last_mood_value)}</span>
                {patient.last_mood_date ? ` (${new Date(patient.last_mood_date).toLocaleDateString('pt-BR')})` : ''}
              </p>
            </section>
          )}

          {patient?.symptoms && patient.symptoms.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sintomas relatados</h3>
              <div className="flex flex-wrap gap-1.5">
                {patient.symptoms.slice(0, 12).map((s) => (
                  <Badge key={s} variant="outline" className="text-[11px] font-normal">
                    {s}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {context && context.progress.length > 0 && (
            <section className="space-y-2">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Activity className="h-3 w-3" aria-hidden="true" /> Registros recentes
              </h3>
              <ul className="space-y-1.5">
                {context.progress.map((p) => (
                  <li key={p.session_date} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">
                      {new Date(p.session_date).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="text-foreground">
                      Humor {moodLabel(p.mood_rating)} · Ansiedade {p.anxiety_level ?? '—'} · Estresse{' '}
                      {p.stress_level ?? '—'}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {context && (
            <section className="space-y-2">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <History className="h-3 w-3" aria-hidden="true" /> Histórico de SOS ({context.sos_total})
              </h3>
              {context.sos_history.length === 0 ? (
                <p className="text-xs text-muted-foreground">Primeira solicitação deste paciente.</p>
              ) : (
                <ul className="space-y-2">
                  {context.sos_history.map((r) => (
                    <li key={r.id} className="rounded-lg border border-border/60 px-2.5 py-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">{formatDateTime(r.created_at)}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {sosStatusLabel(r.status)}
                        </Badge>
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        {formatDuration(r.duration)} · {describeEndReason(r.end_reason)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
};

export default PatientContextPanel;

import React from 'react';
import { Activity, History, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useSosPatientContext } from '@/hooks/useSosPatientContext';
import SafetyPlanSection from '@/components/sos/SafetyPlanSection';
import { describeEndReason, formatDateTime, formatDuration, sosStatusLabel } from '@/lib/sosHistory';

interface PatientContextPanelProps {
  requestId: string | null;
}

const moodLabel = (value?: number | null) => (value == null ? '—' : `${value}/5`);

/**
 * Read-only triage summary of the patient, shown to the psychologist during
 * an ongoing SOS call (inside the call's side panel). It never mutates call state.
 */
export const PatientContextPanel: React.FC<PatientContextPanelProps> = ({ requestId }) => {
  const { context, loading, error } = useSosPatientContext(requestId, true);
  const patient = context?.patient;

  return (
    <div className="space-y-5">
      {loading && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Carregando…
        </p>
      )}

      {!loading && (error || !context) && (
        <p className="text-xs text-muted-foreground">Não foi possível carregar o contexto deste paciente agora.</p>
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

      {context && <SafetyPlanSection requestId={requestId} />}

      {patient?.symptoms && patient.symptoms.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sintomas relatados</h3>
          <div className="flex flex-wrap gap-1.5">
            {patient.symptoms.slice(0, 12).map((s) => (
              <Badge key={s} variant="outline" className="text-xs font-normal">
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
                <span className="text-muted-foreground">{new Date(p.session_date).toLocaleDateString('pt-BR')}</span>
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
                    <Badge variant="outline" className="text-xs">
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
  );
};

export default PatientContextPanel;

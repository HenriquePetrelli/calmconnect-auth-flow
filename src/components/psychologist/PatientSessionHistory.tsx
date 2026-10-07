import { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, FileText } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { usePatientSessionHistory } from '@/hooks/usePatientSessionHistory';
import { formatBrazilTime } from '@/utils/timezone';
import { SharedScreenings } from './SharedScreenings';

/**
 * Questionários compartilhados e resumos das consultas anteriores de um
 * paciente. Usado na janela "Histórico" e no painel lateral da chamada.
 */
export const PatientSessionHistory = ({ patientId }: { patientId: string | null }) => {
  const { sessions, loading, fetchHistory } = usePatientSessionHistory();

  useEffect(() => {
    if (patientId) fetchHistory(patientId);
  }, [patientId, fetchHistory]);

  if (!patientId) return null;

  return (
    <div className="space-y-4">
      <SharedScreenings patientId={patientId} />

      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhuma consulta concluída ainda"
          description="Quando você concluir uma consulta com este paciente e registrar um resumo, ele aparecerá aqui."
          variant="muted"
        />
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <Card key={session.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatBrazilTime(session.scheduled_at, "dd 'de' MMM 'de' yyyy")}
                </div>
                {session.session_summary ? (
                  <p className="whitespace-pre-wrap text-sm text-foreground">{session.session_summary}</p>
                ) : (
                  <p className="text-sm italic text-muted-foreground">Sem resumo registrado para esta sessão.</p>
                )}
                {session.notes && (
                  <p className="border-t pt-1 text-xs text-muted-foreground">
                    <strong>Observações do agendamento:</strong> {session.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

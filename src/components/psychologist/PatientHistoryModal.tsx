import { useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, FileText, History } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { usePatientSessionHistory } from '@/hooks/usePatientSessionHistory';
import { formatBrazilTime } from '@/utils/timezone';

interface PatientHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string | null;
  patientName: string;
}

export const PatientHistoryModal = ({ isOpen, onClose, patientId, patientName }: PatientHistoryModalProps) => {
  const { sessions, loading, fetchHistory } = usePatientSessionHistory();

  useEffect(() => {
    if (isOpen && patientId) {
      fetchHistory(patientId);
    }
  }, [isOpen, patientId, fetchHistory]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Histórico de {patientName}
          </DialogTitle>
          <DialogDescription>
            Resumos das consultas anteriores concluídas com este paciente.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
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
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatBrazilTime(session.scheduled_at, "dd 'de' MMM 'de' yyyy")}
                  </div>
                  {session.session_summary ? (
                    <p className="text-sm text-foreground whitespace-pre-wrap">{session.session_summary}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Sem resumo registrado para esta sessão.</p>
                  )}
                  {session.notes && (
                    <p className="text-xs text-muted-foreground pt-1 border-t">
                      <strong>Observações do agendamento:</strong> {session.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

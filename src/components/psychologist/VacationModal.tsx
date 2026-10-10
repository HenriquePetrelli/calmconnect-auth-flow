import { useEffect, useState } from 'react';
import { Palmtree } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { formatBR, toISODate, type VacationConflict, type VacationPeriod } from '@/hooks/usePsychologistVacation';

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

interface VacationModalProps {
  open: boolean;
  onClose: () => void;
  activeVacation: VacationPeriod | null;
  upcomingVacation: VacationPeriod | null;
  saving: boolean;
  setVacation: (startDate: string, endDate: string, cancelAppointments?: boolean) => Promise<boolean>;
  checkConflicts?: (startDate: string, endDate: string) => Promise<VacationConflict[]>;
  cancelVacation: () => Promise<boolean>;
}

/**
 * Férias do psicólogo: agendar um período (de-até) ou cancelar o que está
 * ativo/agendado. O horário-padrão continua salvo e volta a valer sozinho.
 */
const VacationModal = ({
  open,
  onClose,
  activeVacation,
  upcomingVacation,
  saving,
  setVacation,
  checkConflicts,
  cancelVacation,
}: VacationModalProps) => {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Consultas marcadas no período: o psicólogo decide antes de confirmar.
  const [conflicts, setConflicts] = useState<VacationConflict[]>([]);
  const [cancelAppointments, setCancelAppointments] = useState(true);
  const current = activeVacation ?? upcomingVacation;
  const today = toISODate(new Date());

  useEffect(() => {
    if (!open) return;
    setStart('');
    setEnd('');
    setError(null);
    setConflicts([]);
    setCancelAppointments(true);
  }, [open]);

  useEffect(() => {
    if (!checkConflicts || !start || !end || start > end) {
      setConflicts([]);
      return;
    }
    let cancelled = false;
    void checkConflicts(start, end).then((list) => {
      if (!cancelled) setConflicts(list);
    });
    return () => {
      cancelled = true;
    };
  }, [checkConflicts, start, end]);

  const handleSchedule = async () => {
    setError(null);
    if (!start || !end) {
      setError('Preencha as duas datas');
      return;
    }
    if (start < today) {
      setError('A data de início não pode ser no passado');
      return;
    }
    if (start > end) {
      setError('A data de início deve ser antes ou igual à de término');
      return;
    }
    if (await setVacation(start, end, conflicts.length > 0 && cancelAppointments)) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
              <Palmtree className="h-4 w-4" />
            </span>
            Férias
          </DialogTitle>
          <DialogDescription>
            Nesse período nenhum paciente consegue marcar consulta com você. Seu horário-padrão continua salvo e
            volta a valer sozinho quando as férias terminam.
          </DialogDescription>
        </DialogHeader>

        {current ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-3 text-sm text-foreground">
              {activeVacation ? 'Você está de férias' : 'Férias agendadas'} de{' '}
              <strong>{formatBR(current.start_date)}</strong> até <strong>{formatBR(current.end_date)}</strong>.
            </div>
            <p className="text-xs text-muted-foreground">
              Para mudar as datas, cancele estas férias e agende de novo. Consultas já confirmadas nesse período
              não são canceladas automaticamente: confira em Consultas.
            </p>
            <Button variant="outline" className="w-full" onClick={() => void cancelVacation()} disabled={saving}>
              {saving ? 'Cancelando...' : activeVacation ? 'Encerrar férias agora' : 'Cancelar férias'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="vacation-start">De</Label>
                <Input
                  id="vacation-start"
                  type="date"
                  value={start}
                  min={today}
                  onChange={(e) => setStart(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vacation-end">Até</Label>
                <Input
                  id="vacation-end"
                  type="date"
                  value={end}
                  min={start || today}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </div>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            {conflicts.length > 0 ? (
              <div className="space-y-2 rounded-lg border border-border bg-card p-3 text-sm" data-testid="vacation-conflicts">
                <p className="font-medium text-foreground">
                  {conflicts.length === 1 ? 'Você tem 1 consulta nesse período' : `Você tem ${conflicts.length} consultas nesse período`}
                </p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {conflicts.map((c) => (
                    <li key={c.id}>
                      {formatWhen(c.starts_at)} · {c.patient_name || 'Paciente'}
                      {c.status === 'pending' ? ' (pedido)' : ''}
                    </li>
                  ))}
                </ul>
                <label className="flex items-start gap-2 pt-1 text-xs text-foreground">
                  <Checkbox
                    checked={cancelAppointments}
                    onCheckedChange={(v) => setCancelAppointments(v === true)}
                    aria-label="Cancelar essas consultas e avisar os pacientes"
                  />
                  <span>Cancelar essas consultas e avisar os pacientes (a consulta do mês volta para eles).</span>
                </label>
                {!cancelAppointments && (
                  <p className="text-xs text-muted-foreground">
                    As consultas continuam marcadas: você precisará atender ou cancelar cada uma em Consultas.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Se houver consultas marcadas nesse período, elas aparecem aqui antes de confirmar.
              </p>
            )}
            <Button className="w-full" onClick={handleSchedule} disabled={saving}>
              {saving ? 'Salvando...' : 'Agendar férias'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VacationModal;

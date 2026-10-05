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
import { formatBR, toISODate, type VacationPeriod } from '@/hooks/usePsychologistVacation';

interface VacationModalProps {
  open: boolean;
  onClose: () => void;
  activeVacation: VacationPeriod | null;
  upcomingVacation: VacationPeriod | null;
  saving: boolean;
  setVacation: (startDate: string, endDate: string) => Promise<boolean>;
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
  cancelVacation,
}: VacationModalProps) => {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [error, setError] = useState<string | null>(null);
  const current = activeVacation ?? upcomingVacation;
  const today = toISODate(new Date());

  useEffect(() => {
    if (!open) return;
    setStart('');
    setEnd('');
    setError(null);
  }, [open]);

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
    if (await setVacation(start, end)) onClose();
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
            <p className="text-xs text-muted-foreground">
              Consultas já confirmadas nesse período não são canceladas automaticamente: confira em Consultas.
            </p>
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

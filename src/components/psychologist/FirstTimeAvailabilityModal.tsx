import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { CalendarClock } from 'lucide-react';
import { usePsychologistAvailability, type AvailabilityBlock } from '@/hooks/usePsychologistAvailability';
import { DAY_LABELS, DAYS_DISPLAY_ORDER } from '@/lib/psychologistAvailability';

interface FirstTimeAvailabilityModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

interface DayDraft {
  enabled: boolean;
  start: string;
  end: string;
}

type DraftDays = Record<number, DayDraft>;

// Segunda a sexta pré-marcadas como ponto de partida comum — o psicólogo
// ajusta ou desliga o que não se aplica antes de salvar.
const initialDraft = (): DraftDays =>
  DAYS_DISPLAY_ORDER.reduce(
    (acc, day) => ({
      ...acc,
      [day]: { enabled: day >= 1 && day <= 5, start: '08:00', end: '18:00' },
    }),
    {} as DraftDays
  );

/**
 * Configuração inicial do horário-padrão, mostrada só uma vez (quando o
 * psicólogo ainda não tem nenhum horário cadastrado). Depois disso, mudar o
 * padrão é sempre em "Minha agenda" — a confirmação semanal nunca mexe nele.
 */
export const FirstTimeAvailabilityModal: React.FC<FirstTimeAvailabilityModalProps> = ({ open, onClose, onSaved }) => {
  const { saving, save } = usePsychologistAvailability();
  const [draft, setDraft] = useState<DraftDays>(initialDraft());

  const errorsByDay = Object.fromEntries(
    DAYS_DISPLAY_ORDER.map((day) => [
      day,
      draft[day]?.enabled && draft[day].start >= draft[day].end
        ? 'O horário de início deve ser antes do término'
        : null,
    ])
  ) as Record<number, string | null>;
  const hasErrors = Object.values(errorsByDay).some(Boolean);

  const toggleDay = (day: number, enabled: boolean) => {
    setDraft((prev) => ({ ...prev, [day]: { ...prev[day], enabled } }));
  };

  const updateRange = (day: number, field: 'start' | 'end', value: string) => {
    setDraft((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  };

  const handleSave = async () => {
    if (hasErrors) return;
    const blocks: AvailabilityBlock[] = DAYS_DISPLAY_ORDER.filter((day) => draft[day]?.enabled).map((day) => ({
      day_of_week: day,
      start_time: draft[day].start,
      end_time: draft[day].end,
    }));
    const ok = await save(blocks);
    if (ok) onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" />
            Configure sua agenda
          </DialogTitle>
          <DialogDescription>
            Escolha os dias e horários em que você atende. Isso vale toda semana a partir de agora — dá pra mudar
            quando quiser em "Minha agenda", e bloquear ou abrir um horário só numa semana específica na
            confirmação semanal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {DAYS_DISPLAY_ORDER.map((day) => {
            const d = draft[day];
            return (
              <div key={day} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">{DAY_LABELS[day]}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{d.enabled ? 'Atende' : 'Não atende'}</span>
                    <Switch checked={d.enabled} onCheckedChange={(v) => toggleDay(day, v)} />
                  </div>
                </div>
                {d.enabled && (
                  <>
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        type="time"
                        value={d.start}
                        onChange={(e) => updateRange(day, 'start', e.target.value)}
                        className="w-full h-8"
                      />
                      <span className="text-xs text-muted-foreground shrink-0">até</span>
                      <Input
                        type="time"
                        value={d.end}
                        onChange={(e) => updateRange(day, 'end', e.target.value)}
                        className="w-full h-8"
                      />
                    </div>
                    {errorsByDay[day] && <p className="text-xs text-destructive mt-1">{errorsByDay[day]}</p>}
                  </>
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Configurar depois
          </Button>
          <Button onClick={handleSave} disabled={saving || hasErrors}>
            {saving ? 'Salvando...' : 'Salvar minha agenda'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FirstTimeAvailabilityModal;

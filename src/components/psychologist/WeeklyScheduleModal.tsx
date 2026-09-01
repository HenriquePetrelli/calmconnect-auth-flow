import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Badge } from '@/components/ui/badge';
import { CalendarCheck, X, Ban, Plus } from 'lucide-react';
import { usePsychologistAvailability } from '@/hooks/usePsychologistAvailability';
import {
  usePsychologistAvailabilityOverrides,
  type AvailabilityOverrideRow,
} from '@/hooks/usePsychologistAvailabilityOverrides';
import {
  DAY_LABELS,
  applyOverridesToDayBlocks,
  getWeekStartISO,
  weekDatesFrom,
  type EditableBlock,
  type OverrideType,
} from '@/lib/psychologistAvailability';

interface WeeklyScheduleModalProps {
  open: boolean;
  onClose: () => void;
  onConfirmed: (weekStartISO: string) => void;
}

const formatDayDate = (isoDate: string): string => {
  const [, m, d] = isoDate.split('-');
  return `${d}/${m}`;
};

const dayOfWeekFromISO = (isoDate: string): number => {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
};

const OVERRIDE_BADGE_CLASS: Record<OverrideType, string> = {
  bloqueio: 'bg-destructive/10 text-destructive border-destructive/20',
  abertura: 'bg-success/10 text-success border-success/20',
};

export const WeeklyScheduleModal: React.FC<WeeklyScheduleModalProps> = ({ open, onClose, onConfirmed }) => {
  const navigate = useNavigate();
  const weekStart = useMemo(() => getWeekStartISO(new Date()), []);
  const dates = useMemo(() => weekDatesFrom(weekStart), [weekStart]);
  const weekEnd = dates[6];

  const { blocks: baseBlocks, loading: loadingBase } = usePsychologistAvailability();
  const {
    overrides,
    loading: loadingOverrides,
    addOverride,
    removeOverride,
  } = usePsychologistAvailabilityOverrides(weekStart, weekEnd);

  const [editing, setEditing] = useState<{ date: string; type: OverrideType } | null>(null);
  const [draftStart, setDraftStart] = useState('08:00');
  const [draftEnd, setDraftEnd] = useState('09:00');
  const [draftError, setDraftError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const baseBlocksByDay = useMemo(() => {
    const byDay: Record<number, EditableBlock[]> = {};
    for (const b of baseBlocks) {
      byDay[b.day_of_week] = [...(byDay[b.day_of_week] ?? []), { start_time: b.start_time, end_time: b.end_time }];
    }
    return byDay;
  }, [baseBlocks]);

  const overridesByDate = useMemo(() => {
    const byDate: Record<string, AvailabilityOverrideRow[]> = {};
    for (const o of overrides) {
      byDate[o.date] = [...(byDate[o.date] ?? []), o];
    }
    return byDate;
  }, [overrides]);

  const loading = loadingBase || loadingOverrides;

  const startAdding = (date: string, type: OverrideType) => {
    setEditing({ date, type });
    setDraftStart('08:00');
    setDraftEnd('09:00');
    setDraftError(null);
  };

  const cancelAdding = () => setEditing(null);

  const submitDraft = async () => {
    if (!editing) return;
    if (!draftStart || !draftEnd || draftStart >= draftEnd) {
      setDraftError('O horário de início deve ser antes do término');
      return;
    }
    setSaving(true);
    const ok = await addOverride({ date: editing.date, start_time: draftStart, end_time: draftEnd, type: editing.type });
    setSaving(false);
    if (ok) setEditing(null);
  };

  const handleConfirm = () => onConfirmed(weekStart);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-primary" />
            Sua agenda desta semana
          </DialogTitle>
          <DialogDescription>
            Estes são os horários que os pacientes vão ver para agendar com você esta semana. Se precisar bloquear
            um horário pontual ou abrir um horário extra, faça aqui — sem alterar seu padrão semanal.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Carregando...</div>
        ) : (
          <div className="space-y-3">
            {dates.map((date) => {
              const dayOfWeek = dayOfWeekFromISO(date);
              const dayOverrides = overridesByDate[date] ?? [];
              const effectiveBlocks = applyOverridesToDayBlocks(baseBlocksByDay[dayOfWeek] ?? [], dayOverrides);
              const isEditingThisDay = editing?.date === date;

              return (
                <div key={date} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground">
                      {DAY_LABELS[dayOfWeek]} <span className="text-muted-foreground font-normal">· {formatDayDate(date)}</span>
                    </p>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => startAdding(date, 'bloqueio')}>
                        <Ban className="w-3 h-3 mr-1" />
                        Bloquear
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => startAdding(date, 'abertura')}>
                        <Plus className="w-3 h-3 mr-1" />
                        Abrir extra
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {effectiveBlocks.length === 0 ? (
                      <span className="text-xs text-muted-foreground">Sem atendimento</span>
                    ) : (
                      effectiveBlocks.map((b, i) => (
                        <Badge key={i} variant="outline" className="font-normal">
                          {b.start_time}–{b.end_time}
                        </Badge>
                      ))
                    )}
                  </div>

                  {dayOverrides.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {dayOverrides.map((o) => (
                        <Badge key={o.id} variant="outline" className={`gap-1 font-normal ${OVERRIDE_BADGE_CLASS[o.type]}`}>
                          {o.type === 'bloqueio' ? 'Bloqueado' : 'Extra'} {o.start_time}–{o.end_time}
                          <button
                            onClick={() => removeOverride(o.id)}
                            aria-label="Remover exceção"
                            className="hover:opacity-70"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  {isEditingThisDay && (
                    <div className="mt-3 p-2 rounded-md bg-muted/40 flex items-center gap-2 flex-wrap">
                      <Input
                        type="time"
                        value={draftStart}
                        onChange={(e) => setDraftStart(e.target.value)}
                        className="w-28 h-8"
                      />
                      <span className="text-xs text-muted-foreground">até</span>
                      <Input
                        type="time"
                        value={draftEnd}
                        onChange={(e) => setDraftEnd(e.target.value)}
                        className="w-28 h-8"
                      />
                      <Button size="sm" className="h-8" onClick={submitDraft} disabled={saving}>
                        {saving ? 'Salvando...' : editing?.type === 'bloqueio' ? 'Bloquear' : 'Adicionar'}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8" onClick={cancelAdding}>
                        Cancelar
                      </Button>
                      {draftError && <p className="text-xs text-destructive w-full">{draftError}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate('/psychologist-availability')}>
            Editar horário padrão
          </Button>
          <Button onClick={handleConfirm}>Confirmar agenda da semana</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WeeklyScheduleModal;

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { CalendarCheck, X, Plus, ChevronDown, Lock, Info, Palmtree, Plane } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePsychologistAvailability, type AvailabilityBlock } from '@/hooks/usePsychologistAvailability';
import { usePsychologistAvailabilityOverrides } from '@/hooks/usePsychologistAvailabilityOverrides';
import { usePsychologistVacation } from '@/hooks/usePsychologistVacation';
import {
  DAY_LABELS,
  DAYS_DISPLAY_ORDER,
  getWeekStartISO,
  weekDatesFrom,
  halfHourGridSlots,
  addHalfHour,
  minutesToTime,
} from '@/lib/psychologistAvailability';

interface WeeklyScheduleModalProps {
  open: boolean;
  onClose: () => void;
  onConfirmed: (weekStartISO: string) => void;
}

interface DayDraft {
  enabled: boolean;
  start: string;
  end: string;
}

type DraftDays = Record<number, DayDraft>;

const DEFAULT_RANGE = { start: '08:00', end: '18:00' };
const OCCUPIED_STATUSES = ['scheduled', 'pending'];

const formatDayDate = (isoDate: string): string => {
  const [, m, d] = isoDate.split('-');
  return `${d}/${m}`;
};

const dayOfWeekFromISO = (isoDate: string): number => {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
};

const deriveDraftDays = (blocks: AvailabilityBlock[]): DraftDays => {
  const byDay: Record<number, AvailabilityBlock[]> = {};
  for (const b of blocks) {
    byDay[b.day_of_week] = [...(byDay[b.day_of_week] ?? []), b];
  }
  const draft: DraftDays = {};
  for (const day of DAYS_DISPLAY_ORDER) {
    const dayBlocks = byDay[day] ?? [];
    if (dayBlocks.length === 0) {
      draft[day] = { enabled: false, ...DEFAULT_RANGE };
    } else {
      const starts = dayBlocks.map((b) => b.start_time).sort();
      const ends = dayBlocks.map((b) => b.end_time).sort();
      draft[day] = { enabled: true, start: starts[0], end: ends[ends.length - 1] };
    }
  }
  return draft;
};

const sameBaseBlocks = (a: AvailabilityBlock[], b: AvailabilityBlock[]): boolean => {
  const norm = (arr: AvailabilityBlock[]) =>
    [...arr].map((x) => `${x.day_of_week}|${x.start_time}|${x.end_time}`).sort().join(',');
  return norm(a) === norm(b);
};

export const WeeklyScheduleModal: React.FC<WeeklyScheduleModalProps> = ({ open, onClose, onConfirmed }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const weekStart = useMemo(() => getWeekStartISO(new Date()), []);
  const dates = useMemo(() => weekDatesFrom(weekStart), [weekStart]);
  const weekEnd = dates[6];

  const { blocks: baseBlocks, loading: loadingBase, save: saveBase } = usePsychologistAvailability();
  const {
    overrides,
    loading: loadingOverrides,
    addOverride,
    removeOverride,
    applyChanges,
  } = usePsychologistAvailabilityOverrides(weekStart, weekEnd);
  const {
    activeVacation,
    loading: loadingVacation,
    saving: savingVacation,
    cancelVacation,
  } = usePsychologistVacation();

  const [draftDays, setDraftDays] = useState<DraftDays>({});
  const [blockedByDate, setBlockedByDate] = useState<Record<string, Set<string>>>({});
  const [occupiedByDate, setOccupiedByDate] = useState<Record<string, Set<string>>>({});
  const [loadingOccupied, setLoadingOccupied] = useState(true);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [addingExtraForDate, setAddingExtraForDate] = useState<string | null>(null);
  const [extraStart, setExtraStart] = useState('18:00');
  const [extraEnd, setExtraEnd] = useState('19:00');
  const [extraError, setExtraError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Seed do rascunho a partir do horário-padrão salvo.
  useEffect(() => {
    if (!loadingBase) setDraftDays(deriveDraftDays(baseBlocks));
  }, [baseBlocks, loadingBase]);

  // Seed dos horários bloqueados a partir das exceções já salvas para a semana.
  useEffect(() => {
    if (loadingOverrides) return;
    const byDate: Record<string, Set<string>> = {};
    for (const o of overrides) {
      if (o.type !== 'bloqueio') continue;
      byDate[o.date] = new Set([...(byDate[o.date] ?? []), o.start_time]);
    }
    setBlockedByDate(byDate);
  }, [overrides, loadingOverrides]);

  // Consultas já marcadas na semana, pra não deixar bloquear horário que já tem paciente.
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      setLoadingOccupied(true);
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select('scheduled_at, duration')
          .eq('psychologist_id', user.id)
          .in('status', OCCUPIED_STATUSES)
          .gte('scheduled_at', new Date(`${weekStart}T00:00:00`).toISOString())
          .lte('scheduled_at', new Date(`${weekEnd}T23:59:59`).toISOString());

        if (error) throw error;
        if (!active) return;

        const byDate: Record<string, Set<string>> = {};
        (data ?? []).forEach((row) => {
          const dt = new Date(row.scheduled_at);
          const dateKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
          const duration = row.duration || 50;
          const startMin = dt.getHours() * 60 + dt.getMinutes();
          const set = byDate[dateKey] ?? new Set<string>();
          for (let m = Math.floor(startMin / 30) * 30; m < startMin + duration; m += 30) {
            set.add(minutesToTime(m));
          }
          byDate[dateKey] = set;
        });
        setOccupiedByDate(byDate);
      } catch (error) {
        console.error('Erro ao carregar consultas da semana:', error);
      } finally {
        if (active) setLoadingOccupied(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user, weekStart, weekEnd]);

  const loading = loadingBase || loadingOverrides || loadingOccupied || loadingVacation;

  const overridesByDate = useMemo(() => {
    const byDate: Record<string, typeof overrides> = {};
    for (const o of overrides) {
      byDate[o.date] = [...(byDate[o.date] ?? []), o];
    }
    return byDate;
  }, [overrides]);

  const dayErrors = useMemo(() => {
    const errors: Record<number, string | null> = {};
    for (const day of DAYS_DISPLAY_ORDER) {
      const d = draftDays[day];
      errors[day] = d?.enabled && d.start >= d.end ? 'O horário de início deve ser antes do término' : null;
    }
    return errors;
  }, [draftDays]);
  const hasErrors = Object.values(dayErrors).some(Boolean);

  const toggleDayEnabled = (day: number, enabled: boolean) => {
    setDraftDays((prev) => ({ ...prev, [day]: { ...(prev[day] ?? DEFAULT_RANGE), enabled } }));
    if (!enabled && expandedDay === day) setExpandedDay(null);
  };

  const updateDayRange = (day: number, field: 'start' | 'end', value: string) => {
    setDraftDays((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  };

  const toggleSlot = (date: string, slot: string) => {
    if (occupiedByDate[date]?.has(slot)) return;
    setBlockedByDate((prev) => {
      const set = new Set(prev[date] ?? []);
      if (set.has(slot)) set.delete(slot);
      else set.add(slot);
      return { ...prev, [date]: set };
    });
  };

  const startAddingExtra = (date: string) => {
    setAddingExtraForDate(date);
    setExtraStart('18:00');
    setExtraEnd('19:00');
    setExtraError(null);
  };

  const submitExtra = async () => {
    if (!addingExtraForDate) return;
    if (!extraStart || !extraEnd || extraStart >= extraEnd) {
      setExtraError('O horário de início deve ser antes do término');
      return;
    }
    const ok = await addOverride({ date: addingExtraForDate, start_time: extraStart, end_time: extraEnd, type: 'abertura' });
    if (ok) setAddingExtraForDate(null);
  };

  const handleConfirm = async () => {
    if (hasErrors) return;
    setSaving(true);
    try {
      const nextBaseBlocks: AvailabilityBlock[] = DAYS_DISPLAY_ORDER
        .filter((day) => draftDays[day]?.enabled)
        .map((day) => ({ day_of_week: day, start_time: draftDays[day].start, end_time: draftDays[day].end }));

      if (!sameBaseBlocks(nextBaseBlocks, baseBlocks)) {
        const ok = await saveBase(nextBaseBlocks);
        if (!ok) return;
      }

      const toAdd: Array<{ date: string; start_time: string; end_time: string; type: 'bloqueio' }> = [];
      const toRemoveIds: string[] = [];
      for (const date of dates) {
        const draftSet = blockedByDate[date] ?? new Set<string>();
        const existingBloqueios = (overridesByDate[date] ?? []).filter((o) => o.type === 'bloqueio');

        for (const slot of draftSet) {
          if (!existingBloqueios.some((o) => o.start_time === slot)) {
            toAdd.push({ date, start_time: slot, end_time: addHalfHour(slot), type: 'bloqueio' });
          }
        }
        for (const o of existingBloqueios) {
          if (!draftSet.has(o.start_time)) toRemoveIds.push(o.id);
        }
      }

      if (toAdd.length > 0 || toRemoveIds.length > 0) {
        const ok = await applyChanges(toAdd, toRemoveIds);
        if (!ok) return;
      }

      onConfirmed(weekStart);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-primary" />
            Sua agenda desta semana
          </DialogTitle>
          <DialogDescription>
            Confirme os dias e horários em que você atende. Para bloquear ou liberar um horário pontual, abra
            "Personalizar horários" no dia — horários em verde estão disponíveis.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Carregando...</div>
        ) : activeVacation ? (
          <div className="py-6 text-center space-y-3">
            <Palmtree className="w-8 h-8 text-secondary mx-auto" />
            <p className="text-sm font-medium text-foreground">
              Você está de férias até {formatDayDate(activeVacation.end_date)}
            </p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Sua agenda fica marcada como indisponível para pacientes nesse período. Seu horário-padrão continua
              salvo e a confirmação semanal volta automaticamente quando as férias terminarem.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void cancelVacation()}
              disabled={savingVacation}
            >
              {savingVacation ? 'Encerrando...' : 'Encerrar férias agora'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {dates.map((date) => {
              const dayOfWeek = dayOfWeekFromISO(date);
              const draft = draftDays[dayOfWeek] ?? { enabled: false, ...DEFAULT_RANGE };
              const dayOverrides = overridesByDate[date] ?? [];
              const aberturas = dayOverrides.filter((o) => o.type === 'abertura');
              const gridSlots = draft.enabled ? halfHourGridSlots(draft.start, draft.end) : [];
              const blockedCount = (blockedByDate[date] ?? new Set()).size;
              const isExpanded = expandedDay === dayOfWeek;

              return (
                <div key={date} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground">
                      {DAY_LABELS[dayOfWeek]}{' '}
                      <span className="text-muted-foreground font-normal">· {formatDayDate(date)}</span>
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{draft.enabled ? 'Atende' : 'Não atende'}</span>
                      <Switch checked={draft.enabled} onCheckedChange={(v) => toggleDayEnabled(dayOfWeek, v)} />
                    </div>
                  </div>

                  {draft.enabled && (
                    <>
                      <div className="flex items-center gap-2 mt-2">
                        <Input
                          type="time"
                          value={draft.start}
                          onChange={(e) => updateDayRange(dayOfWeek, 'start', e.target.value)}
                          className="w-full h-8"
                        />
                        <span className="text-xs text-muted-foreground shrink-0">até</span>
                        <Input
                          type="time"
                          value={draft.end}
                          onChange={(e) => updateDayRange(dayOfWeek, 'end', e.target.value)}
                          className="w-full h-8"
                        />
                      </div>
                      {dayErrors[dayOfWeek] && <p className="text-xs text-destructive mt-1">{dayErrors[dayOfWeek]}</p>}

                      {aberturas.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {aberturas.map((o) => (
                            <Badge key={o.id} variant="outline" className="gap-1 font-normal bg-success/10 text-success border-success/20">
                              Extra {o.start_time}–{o.end_time}
                              <button onClick={() => removeOverride(o.id)} aria-label="Remover horário extra" className="hover:opacity-70">
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}

                      <Collapsible open={isExpanded} onOpenChange={(v) => setExpandedDay(v ? dayOfWeek : null)} className="mt-2">
                        <CollapsibleTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 text-xs w-full justify-between">
                            <span>
                              Personalizar horários
                              {blockedCount > 0 && <span className="text-destructive"> · {blockedCount} bloqueado{blockedCount > 1 ? 's' : ''}</span>}
                            </span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2 space-y-2">
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Info className="w-3 h-3 shrink-0" />
                            Horários em verde estão disponíveis. Clique para bloquear ou liberar um horário.
                          </p>
                          <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                            {gridSlots.map((slot) => {
                              const isOccupied = occupiedByDate[date]?.has(slot);
                              const isBlocked = blockedByDate[date]?.has(slot);
                              return (
                                <button
                                  key={slot}
                                  type="button"
                                  disabled={isOccupied}
                                  onClick={() => toggleSlot(date, slot)}
                                  title={isOccupied ? 'Já tem consulta marcada' : isBlocked ? 'Clique para liberar' : 'Clique para bloquear'}
                                  className={`text-xs rounded-md py-1.5 border transition-colors ${
                                    isOccupied
                                      ? 'bg-muted text-muted-foreground border-border cursor-not-allowed'
                                      : isBlocked
                                        ? 'bg-background text-foreground border-input hover:bg-accent'
                                        : 'bg-success/15 text-success border-success/30 hover:bg-success/25'
                                  }`}
                                >
                                  {isOccupied && <Lock className="w-2.5 h-2.5 inline mr-1" />}
                                  {slot}
                                </button>
                              );
                            })}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                      {addingExtraForDate === date ? (
                        <div className="mt-2 p-2 rounded-md bg-muted/40 flex items-center gap-2 flex-wrap">
                          <Input type="time" value={extraStart} onChange={(e) => setExtraStart(e.target.value)} className="w-28 h-8" />
                          <span className="text-xs text-muted-foreground">até</span>
                          <Input type="time" value={extraEnd} onChange={(e) => setExtraEnd(e.target.value)} className="w-28 h-8" />
                          <Button size="sm" className="h-8" onClick={submitExtra}>Adicionar</Button>
                          <Button size="sm" variant="ghost" className="h-8" onClick={() => setAddingExtraForDate(null)}>Cancelar</Button>
                          {extraError && <p className="text-xs text-destructive w-full">{extraError}</p>}
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-7 text-xs mt-1 text-muted-foreground" onClick={() => startAddingExtra(date)}>
                          <Plus className="w-3 h-3 mr-1" />
                          Adicionar horário extra
                        </Button>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between">
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/psychologist-availability')}>
              Editar horário padrão
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/psychologist-availability')}>
              <Plane className="w-3.5 h-3.5 mr-1" />
              {activeVacation ? 'Gerenciar férias' : 'Tirar férias'}
            </Button>
          </div>
          {!activeVacation && (
            <Button onClick={handleConfirm} disabled={saving || loading || hasErrors}>
              {saving ? 'Salvando...' : 'Confirmar horários livres da semana'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WeeklyScheduleModal;

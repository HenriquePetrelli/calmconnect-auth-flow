import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, CalendarCheck, CalendarClock, Palmtree, Copy } from 'lucide-react';
import VacationModal from '@/components/psychologist/VacationModal';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import BookingRulesCard from '@/components/psychologist/BookingRulesCard';
import PageTitle from '@/components/PageTitle';
import { WeeklyScheduleModal } from '@/components/psychologist/WeeklyScheduleModal';
import { useAuth } from '@/contexts/AuthContext';
import { usePsychologistAvailability, type AvailabilityBlock } from '@/hooks/usePsychologistAvailability';
import { formatBR, usePsychologistVacation } from '@/hooks/usePsychologistVacation';
import { DAY_LABELS, DAYS_DISPLAY_ORDER, validateDayBlocks, type EditableBlock } from '@/lib/psychologistAvailability';
import RouteSkeleton from "@/components/skeletons/RouteSkeleton";

type DraftByDay = Record<number, EditableBlock[]>;

const emptyDraft = (): DraftByDay =>
  DAYS_DISPLAY_ORDER.reduce((acc, day) => ({ ...acc, [day]: [] }), {} as DraftByDay);

const blocksToDraft = (blocks: AvailabilityBlock[]): DraftByDay => {
  const draft = emptyDraft();
  for (const b of blocks) {
    draft[b.day_of_week] = [...(draft[b.day_of_week] ?? []), { start_time: b.start_time, end_time: b.end_time }];
  }
  return draft;
};

const PsychologistAvailability = () => {
  const { blocks, loading, saving, save } = usePsychologistAvailability();
  const { user } = useAuth();
  const [weekOpen, setWeekOpen] = useState(false);
  const [draft, setDraft] = useState<DraftByDay>(emptyDraft());

  const {
    activeVacation,
    upcomingVacation,
    loading: loadingVacation,
    saving: savingVacation,
    setVacation,
    cancelVacation,
  } = usePsychologistVacation();
  const [vacationOpen, setVacationOpen] = useState(false);
  const currentVacation = activeVacation ?? upcomingVacation;

  useEffect(() => {
    document.title = 'Minha Agenda | Soliv';
  }, []);

  useEffect(() => {
    if (!loading) setDraft(blocksToDraft(blocks));
  }, [blocks, loading]);

  const errorsByDay = Object.fromEntries(
    DAYS_DISPLAY_ORDER.map((day) => [day, validateDayBlocks(draft[day] ?? [])])
  ) as Record<number, string | null>;
  const hasErrors = Object.values(errorsByDay).some(Boolean);

  const toggleDay = (day: number, enabled: boolean) => {
    setDraft((prev) => ({
      ...prev,
      [day]: enabled ? [{ start_time: '08:00', end_time: '18:00' }] : [],
    }));
  };

  const addBlock = (day: number) => {
    setDraft((prev) => ({
      ...prev,
      [day]: [...(prev[day] ?? []), { start_time: '08:00', end_time: '18:00' }],
    }));
  };

  const removeBlock = (day: number, index: number) => {
    setDraft((prev) => ({
      ...prev,
      [day]: (prev[day] ?? []).filter((_, i) => i !== index),
    }));
  };

  const updateBlock = (day: number, index: number, field: keyof EditableBlock, value: string) => {
    setDraft((prev) => ({
      ...prev,
      [day]: (prev[day] ?? []).map((b, i) => (i === index ? { ...b, [field]: value } : b)),
    }));
  };

  // "Copiar para outros dias": replicates one day's intervals onto the
  // chosen days, replacing whatever they had.
  const [copyTargets, setCopyTargets] = useState<number[]>([]);
  const [copyFrom, setCopyFrom] = useState<number | null>(null);
  const applyCopy = () => {
    if (copyFrom === null) return;
    const source = (draft[copyFrom] ?? []).map((b) => ({ ...b }));
    setDraft((prev) => {
      const next = { ...prev };
      for (const day of copyTargets) next[day] = source.map((b) => ({ ...b }));
      return next;
    });
    setCopyFrom(null);
    setCopyTargets([]);
  };

  const handleSave = async () => {
    if (hasErrors) return;
    const flat: AvailabilityBlock[] = DAYS_DISPLAY_ORDER.flatMap((day) =>
      (draft[day] ?? []).map((b) => ({ day_of_week: day, start_time: b.start_time, end_time: b.end_time }))
    );
    await save(flat);
  };

  if (loading) {
    return <RouteSkeleton />;
  }

  return (
    <div className="max-w-3xl space-y-4">
        <PageTitle
          title="Agenda"
          description="Horário-padrão, férias e regras de agendamento"
          action={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-10 gap-2" onClick={() => setVacationOpen(true)}>
                <Palmtree className="h-4 w-4" />
                Férias
              </Button>
              <Button variant="outline" size="sm" className="h-10 gap-2" onClick={() => setWeekOpen(true)}>
                <CalendarCheck className="h-4 w-4" />
                Agenda semanal
              </Button>
            </div>
          }
        />
        <Card className="border-border/60">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
              <CalendarClock className="h-5 w-5" />
            </div>
            <p className="text-sm text-muted-foreground">
              Este é o seu horário-padrão, que se repete toda semana. Pacientes só vão conseguir marcar horários
              dentro dos blocos que você configurar aqui. Dias sem nenhum horário ficam indisponíveis para
              agendamento. Para bloquear um horário pontual ou abrir um horário extra só numa semana específica,
              use "Agenda semanal" — não é preciso mexer no padrão para isso.
            </p>
          </CardContent>
        </Card>

        {!loadingVacation && currentVacation && (
          <Card className="border-border/60">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
                <Palmtree className="h-5 w-5" />
              </div>
              <p className="flex-1 text-sm text-foreground">
                {activeVacation ? 'Você está de férias' : 'Férias agendadas'} de{' '}
                <strong>{formatBR(currentVacation.start_date)}</strong> até{' '}
                <strong>{formatBR(currentVacation.end_date)}</strong>.
              </p>
              <Button variant="ghost" size="sm" onClick={() => setVacationOpen(true)}>
                Ver
              </Button>
            </CardContent>
          </Card>
        )}

        {DAYS_DISPLAY_ORDER.map((day) => {
          const dayBlocks = draft[day] ?? [];
          const enabled = dayBlocks.length > 0;
          const error = errorsByDay[day];

          return (
            <Card key={day}>
              {/* Mesmo espaço em cima e embaixo; com horários, eles ocupam a parte de baixo. */}
              <CardHeader className={enabled ? 'px-5 pb-3 pt-5' : 'p-5'}>
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{DAY_LABELS[day]}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-normal text-muted-foreground">
                      {enabled ? 'Atende' : 'Não atende'}
                    </span>
                    <Switch checked={enabled} onCheckedChange={(checked) => toggleDay(day, checked)} />
                  </div>
                </CardTitle>
              </CardHeader>
              {enabled && (
                <CardContent className="space-y-3 px-5 pb-5 pt-0">
                  {dayBlocks.map((block, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={block.start_time}
                        onChange={(e) => updateBlock(day, index, 'start_time', e.target.value)}
                        className="w-full"
                      />
                      <span className="text-muted-foreground text-sm shrink-0">até</span>
                      <Input
                        type="time"
                        value={block.end_time}
                        onChange={(e) => updateBlock(day, index, 'end_time', e.target.value)}
                        className="w-full"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeBlock(day, index)}
                        aria-label="Remover horário"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}

                  {error && <p className="text-xs text-destructive">{error}</p>}

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => addBlock(day)}>
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar horário
                    </Button>
                    <Popover
                      open={copyFrom === day}
                      onOpenChange={(open) => {
                        setCopyFrom(open ? day : null);
                        setCopyTargets([]);
                      }}
                    >
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" disabled={Boolean(error)}>
                          <Copy className="w-4 h-4 mr-1" />
                          Copiar para outros dias
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 space-y-2">
                        <p className="text-sm font-medium">Usar os horários de {DAY_LABELS[day].toLowerCase()} em:</p>
                        {DAYS_DISPLAY_ORDER.filter((d) => d !== day).map((d) => (
                          <div key={d} className="flex min-h-10 items-center gap-2">
                            <Checkbox
                              id={`copy-${day}-${d}`}
                              checked={copyTargets.includes(d)}
                              onCheckedChange={(checked) =>
                                setCopyTargets((prev) => (checked ? [...prev, d] : prev.filter((x) => x !== d)))
                              }
                            />
                            <label htmlFor={`copy-${day}-${d}`} className="text-sm">
                              {DAY_LABELS[d]}
                            </label>
                          </div>
                        ))}
                        <p className="text-xs text-muted-foreground">Os horários desses dias serão substituídos.</p>
                        <Button size="sm" className="w-full" onClick={applyCopy} disabled={copyTargets.length === 0}>
                          Copiar
                        </Button>
                      </PopoverContent>
                    </Popover>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}

        <BookingRulesCard />

        {/* No celular fica acima da barra inferior. */}
        <div className="sticky bottom-[calc(var(--tab-height)+12px)] pt-2 md:bottom-4">
          <Button onClick={handleSave} disabled={saving || hasErrors} className="h-11 w-full shadow-lg">
            {saving ? 'Salvando...' : 'Salvar agenda'}
          </Button>
        </div>

        <VacationModal
          open={vacationOpen}
          onClose={() => setVacationOpen(false)}
          activeVacation={activeVacation}
          upcomingVacation={upcomingVacation}
          saving={savingVacation}
          setVacation={setVacation}
          cancelVacation={cancelVacation}
        />

        <WeeklyScheduleModal
          open={weekOpen}
          onClose={() => setWeekOpen(false)}
          onConfirmed={(weekStartISO) => {
            try {
              if (user?.id) localStorage.setItem(`soliv:availability-week-confirmed:${user.id}`, weekStartISO);
            } catch {
              // localStorage indisponível: fecha mesmo assim
            }
            setWeekOpen(false);
          }}
        />
    </div>
  );
};

export default PsychologistAvailability;

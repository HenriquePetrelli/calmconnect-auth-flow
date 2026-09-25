import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, CalendarClock, Palmtree, Copy } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import BookingRulesCard from '@/components/psychologist/BookingRulesCard';
import PageHeader from '@/components/PageHeader';
import { SkeletonFullPage } from '@/components/skeletons/Skeletons';
import { usePsychologistAvailability, type AvailabilityBlock } from '@/hooks/usePsychologistAvailability';
import { usePsychologistVacation, toISODate } from '@/hooks/usePsychologistVacation';
import { DAY_LABELS, DAYS_DISPLAY_ORDER, validateDayBlocks, type EditableBlock } from '@/lib/psychologistAvailability';

const formatBR = (isoDate: string): string => {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
};

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
  const [draft, setDraft] = useState<DraftByDay>(emptyDraft());

  const {
    activeVacation,
    upcomingVacation,
    loading: loadingVacation,
    saving: savingVacation,
    setVacation,
    cancelVacation,
  } = usePsychologistVacation();
  const [vacationStart, setVacationStart] = useState('');
  const [vacationEnd, setVacationEnd] = useState('');
  const [vacationError, setVacationError] = useState<string | null>(null);
  const currentVacation = activeVacation ?? upcomingVacation;
  const today = toISODate(new Date());

  const handleScheduleVacation = async () => {
    setVacationError(null);
    if (!vacationStart || !vacationEnd) {
      setVacationError('Preencha as duas datas');
      return;
    }
    if (vacationStart > vacationEnd) {
      setVacationError('A data de início deve ser antes ou igual à de término');
      return;
    }
    const ok = await setVacation(vacationStart, vacationEnd);
    if (ok) {
      setVacationStart('');
      setVacationEnd('');
    }
  };

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
    return <SkeletonFullPage />;
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Minha Agenda" backTo="/psychologist-profile" />
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <Card className="border-secondary/20 bg-secondary/5">
          <CardContent className="p-4 flex items-start gap-3">
            <CalendarClock className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Este é o seu horário-padrão, que se repete toda semana. Pacientes só vão conseguir marcar horários
              dentro dos blocos que você configurar aqui. Dias sem nenhum horário ficam indisponíveis para
              agendamento. Para bloquear um horário pontual ou abrir um horário extra só numa semana específica,
              use a confirmação semanal no seu painel — não é preciso mexer no padrão para isso.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Palmtree className="w-4 h-4 text-secondary" />
              Férias
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingVacation ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : currentVacation ? (
              <div className="space-y-3">
                <p className="text-sm text-foreground">
                  {activeVacation ? 'Você está de férias' : 'Férias agendadas'} de{' '}
                  <strong>{formatBR(currentVacation.start_date)}</strong> até{' '}
                  <strong>{formatBR(currentVacation.end_date)}</strong>.
                </p>
                <p className="text-xs text-muted-foreground">
                  Sua agenda fica indisponível para pacientes nesse período. Seus dias e horários padrão continuam
                  salvos e a confirmação semanal volta a perguntar sua disponibilidade automaticamente assim que as
                  férias terminarem.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void cancelVacation()}
                  disabled={savingVacation}
                >
                  {savingVacation ? 'Cancelando...' : 'Cancelar férias'}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Escolha de que dia até que dia você vai ficar indisponível. Seus dias e horários padrão continuam
                  salvos e voltam a valer normalmente assim que as férias terminarem.
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={vacationStart}
                    min={today}
                    onChange={(e) => setVacationStart(e.target.value)}
                    className="w-full"
                  />
                  <span className="text-muted-foreground text-sm shrink-0">até</span>
                  <Input
                    type="date"
                    value={vacationEnd}
                    min={vacationStart || today}
                    onChange={(e) => setVacationEnd(e.target.value)}
                    className="w-full"
                  />
                </div>
                {vacationError && <p className="text-xs text-destructive">{vacationError}</p>}
                <Button variant="outline" size="sm" onClick={handleScheduleVacation} disabled={savingVacation}>
                  {savingVacation ? 'Salvando...' : 'Agendar férias'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {DAYS_DISPLAY_ORDER.map((day) => {
          const dayBlocks = draft[day] ?? [];
          const enabled = dayBlocks.length > 0;
          const error = errorsByDay[day];

          return (
            <Card key={day}>
              <CardHeader className="pb-3">
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
                <CardContent className="space-y-3">
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

        <div className="sticky bottom-4 pt-2">
          <Button onClick={handleSave} disabled={saving || hasErrors} className="w-full shadow-lg">
            {saving ? 'Salvando...' : 'Salvar agenda'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PsychologistAvailability;

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, CalendarClock } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { SkeletonFullPage } from '@/components/skeletons/Skeletons';
import { usePsychologistAvailability, type AvailabilityBlock } from '@/hooks/usePsychologistAvailability';
import { DAY_LABELS, DAYS_DISPLAY_ORDER, validateDayBlocks, type EditableBlock } from '@/lib/psychologistAvailability';

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

                  <Button variant="outline" size="sm" onClick={() => addBlock(day)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar horário
                  </Button>
                </CardContent>
              )}
            </Card>
          );
        })}

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

import { useMemo, useState } from 'react';
import { AlertTriangle, BellRing, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HABIT_VISUALS } from '@/components/habits/habitVisuals';
import type { HabitDraft } from '@/hooks/useHabits';
import {
  HABIT_CATALOG,
  JOY_ACTIVITIES,
  MEALS,
  formatAmount,
  formatHabitAmount,
  isLimitHabit,
  isQuitHabit,
  isValidTime,
  shiftTime,
  waterGoalFromWeight,
  type HabitKind,
  type HabitSettings,
  type MealKey,
  type UserHabit,
} from '@/lib/habits';

interface HabitFormProps {
  kind: HabitKind;
  /** Presente ao editar. */
  habit?: UserHabit;
  saving: boolean;
  onSubmit: (draft: HabitDraft) => void;
}

const REMINDER_INTERVALS = [
  { value: '60', label: 'A cada 1 hora' },
  { value: '90', label: 'A cada 1 h 30' },
  { value: '120', label: 'A cada 2 horas' },
  { value: '180', label: 'A cada 3 horas' },
];

/** "2026-09-30T14:05" para o input datetime-local, no fuso do aparelho. */
const toLocalInput = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const num = (value: string) => {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : NaN;
};

const NumberField = ({
  id,
  label,
  value,
  onChange,
  suffix,
  prefix,
  hint,
  step = 'any',
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
  prefix?: string;
  hint?: string;
  step?: string;
}) => (
  <div className="space-y-1.5">
    <Label htmlFor={id}>{label}</Label>
    <div className="flex items-center gap-2">
      {prefix && <span className="text-sm text-muted-foreground">{prefix}</span>}
      <Input id={id} inputMode="decimal" type="number" min="0" step={step} value={value} onChange={(e) => onChange(e.target.value)} className="h-11" />
      {suffix && <span className="shrink-0 text-sm text-muted-foreground">{suffix}</span>}
    </div>
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);

const HabitForm = ({ kind, habit, saving, onSubmit }: HabitFormProps) => {
  const catalog = HABIT_CATALOG[kind];
  const quit = isQuitHabit(kind);
  const { icon: Icon, color, soft } = HABIT_VISUALS[kind];
  const settings = habit?.settings ?? catalog.defaultSettings;

  const [title, setTitle] = useState(habit?.title ?? '');
  const [goal, setGoal] = useState(String(habit?.daily_goal ?? catalog.defaultGoal ?? ''));
  const [weight, setWeight] = useState(settings.weight_kg ? String(settings.weight_kg) : '');
  const [cups, setCups] = useState<string[]>((settings.cup_sizes ?? catalog.quickAmounts ?? []).map(String));
  const [startMode, setStartMode] = useState<'now' | 'past'>('now');
  const [startedAt, setStartedAt] = useState(toLocalInput(habit?.quit_started_at ? new Date(habit.quit_started_at) : new Date()));
  const [perDay, setPerDay] = useState(String(settings.cigarettes_per_day ?? ''));
  const [perPack, setPerPack] = useState(String(settings.cigarettes_per_pack ?? 20));
  const [packPrice, setPackPrice] = useState(String(settings.pack_price ?? ''));
  const [drinksPerWeek, setDrinksPerWeek] = useState(String(settings.drinks_per_week ?? ''));
  const [pricePerDrink, setPricePerDrink] = useState(String(settings.price_per_drink ?? ''));
  const [dailyCost, setDailyCost] = useState(settings.daily_cost ? String(settings.daily_cost) : '');
  const [reason, setReason] = useState(settings.reason ?? '');
  const [cutoff, setCutoff] = useState(settings.cutoff_time ?? '14:00');
  const [doseTimes, setDoseTimes] = useState<string[]>(settings.times?.length ? settings.times : ['08:00']);
  const [bedtime, setBedtime] = useState(settings.bedtime ?? '23:00');
  const [activities, setActivities] = useState<string[]>(settings.activities ?? catalog.defaultSettings.activities ?? []);
  const [newActivity, setNewActivity] = useState('');
  // Refeições: horário de cada uma; sem horário = sem lembrete daquela refeição.
  const [mealTimes, setMealTimes] = useState<Partial<Record<MealKey, string>>>(settings.meal_times ?? (habit ? {} : catalog.defaultSettings.meal_times ?? {}));
  const [remindersEnabled, setRemindersEnabled] = useState(habit?.reminders_enabled ?? (kind === 'water' || kind === 'medication' || kind === 'meals'));
  const [reminderStart, setReminderStart] = useState(habit?.reminder_start ?? catalog.defaultReminder.start);
  const [reminderEnd, setReminderEnd] = useState(habit?.reminder_end ?? catalog.defaultReminder.end);
  const [reminderInterval, setReminderInterval] = useState(String(habit?.reminder_interval_minutes ?? catalog.defaultReminder.interval ?? 120));
  const [error, setError] = useState<string | null>(null);

  const suggestedWater = useMemo(() => (weight ? waterGoalFromWeight(num(weight)) : null), [weight]);
  const usesInterval = kind === 'water';
  const limit = isLimitHabit(kind);
  // Remédio avisa nos horários das doses; tela, 1 hora antes de dormir.
  const reminderTimeEditable = kind !== 'medication' && kind !== 'screen_time' && kind !== 'meals';
  const goalSuffix =
    catalog.unit === 'ml' ? 'ml' : catalog.unit === 'h' ? 'horas' : catalog.unit === 'mg' ? 'mg' : catalog.unit === 'count' ? catalog.countNoun?.[1] ?? '' : 'minutos';
  const goalHint: Partial<Record<HabitKind, string>> = {
    movement: 'A OMS recomenda ao menos 150 minutos por semana.',
    sleep: 'Adultos costumam precisar de 7 a 9 horas.',
    caffeine: 'Até 400 mg por dia é a referência geral para adultos (cerca de 4 a 5 xícaras de café). Na gravidez, até 200 mg.',
    screen_time: 'Conte o tempo em redes sociais, vídeos e jogos no celular. O próprio celular mostra esse total.',
    meals: 'Café da manhã, almoço e jantar: 3 é um bom começo.',
    joy: 'Uma por dia já ajuda. Atividades prazerosas são uma das técnicas com mais evidência contra a depressão.',
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const draft: HabitDraft = {
      kind,
      title: null,
      daily_goal: null,
      quit_started_at: null,
      settings: {},
      reminders_enabled: remindersEnabled,
      reminder_start: reminderStart,
      reminder_end: usesInterval ? reminderEnd : '23:59',
      reminder_interval_minutes: usesInterval ? Number(reminderInterval) : null,
    };

    if (kind === 'medication') {
      const name = title.trim();
      if (!name) {
        setError('Informe o nome do remédio.');
        return;
      }
      const times = [...new Set(doseTimes.filter(isValidTime))].sort();
      if (times.length === 0) {
        setError('Informe ao menos um horário.');
        return;
      }
      draft.title = name.slice(0, 60);
      draft.daily_goal = times.length;
      draft.settings = { times };
      draft.reminder_start = '00:00';
      draft.reminder_end = '23:59';
    } else if (!quit) {
      const goalValue = num(goal);
      if (!(goalValue >= catalog.goalMin! && goalValue <= catalog.goalMax!)) {
        setError(`${limit ? 'O limite' : 'A meta'} precisa ficar entre ${formatHabitAmount(kind, catalog.goalMin!)} e ${formatHabitAmount(kind, catalog.goalMax!)}.`);
        return;
      }
      draft.daily_goal = goalValue;
      if (kind === 'joy' && activities.length === 0) {
        setError('Escolha ao menos uma atividade.');
        return;
      }
      if (kind === 'water') {
        const cupSizes = cups.map(num).filter((c) => c >= 50 && c <= 2000);
        if (cupSizes.length === 0) {
          setError('Informe ao menos um tamanho de copo, entre 50 e 2.000 ml.');
          return;
        }
        draft.settings = { cup_sizes: cupSizes, ...(num(weight) > 0 ? { weight_kg: num(weight) } : {}) };
      }
      const extra: HabitSettings = {};
      if (kind === 'caffeine' && isValidTime(cutoff)) extra.cutoff_time = cutoff;
      if (kind === 'screen_time' && isValidTime(bedtime)) {
        extra.bedtime = bedtime;
        // O lembrete chega 1 hora antes de dormir.
        draft.reminder_start = shiftTime(bedtime, -60);
        draft.reminder_end = '23:59';
        if (draft.reminder_start >= draft.reminder_end) draft.reminder_start = '23:00';
      }
      if (kind === 'joy') extra.activities = activities.slice(0, 12);
      if (kind === 'meals') {
        const times = Object.fromEntries(Object.entries(mealTimes).filter(([, t]) => t && isValidTime(t)));
        extra.meal_times = times;
        draft.reminder_start = '00:00';
        draft.reminder_end = '23:59';
      }
      draft.settings = { ...draft.settings, ...extra };
    } else {
      const started = startMode === 'now' && !habit ? new Date() : new Date(startedAt);
      if (Number.isNaN(started.getTime()) || started.getTime() > Date.now() + 60_000) {
        setError('A data em que você parou não pode estar no futuro.');
        return;
      }
      draft.quit_started_at = started.toISOString();
      const reasonText = reason.trim().slice(0, 300);
      if (kind === 'quit_smoking') {
        draft.settings = { cigarettes_per_day: num(perDay) || 0, cigarettes_per_pack: num(perPack) || 20, pack_price: num(packPrice) || 0 };
      } else if (kind === 'quit_alcohol') {
        draft.settings = { drinks_per_week: num(drinksPerWeek) || 0, price_per_drink: num(pricePerDrink) || 0 };
      } else {
        const name = title.trim();
        if (!name) {
          setError('Dê um nome ao hábito que você quer largar.');
          return;
        }
        draft.title = name.slice(0, 60);
        draft.settings = { daily_cost: num(dailyCost) || 0 };
      }
      if (reasonText) draft.settings.reason = reasonText;
    }

    if (remindersEnabled && usesInterval && reminderEnd <= reminderStart) {
      setError('O fim dos lembretes precisa ser depois do início.');
      return;
    }

    // Ao editar, a data em que parou só muda se a pessoa mexeu nela.
    if (habit && quit && startMode === 'now') draft.quit_started_at = habit.quit_started_at;

    onSubmit(draft);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-3 rounded-2xl p-4" style={{ backgroundColor: soft }}>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-card">
          <Icon className="h-6 w-6" style={{ color }} aria-hidden="true" />
        </span>
        <div>
          <p className="font-semibold text-foreground">{catalog.title}</p>
          <p className="text-sm text-muted-foreground">{catalog.description}</p>
        </div>
      </div>

      {kind === 'quit_custom' && (
        <div className="space-y-1.5">
          <Label htmlFor="habit-title">O que você quer largar?</Label>
          <Input id="habit-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder="Ex.: refrigerante, doces, roer as unhas" className="h-11" />
        </div>
      )}

      {kind === 'medication' && (
        <section className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="habit-title">Nome do remédio</Label>
            <Input id="habit-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder="Ex.: sertralina" className="h-11" />
            <p className="text-xs text-muted-foreground">Só você vê. Se preferir, use um apelido.</p>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Horários das doses</legend>
            {doseTimes.map((time, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  aria-label={`Horário da dose ${i + 1}`}
                  type="time"
                  value={time}
                  onChange={(e) => setDoseTimes((prev) => prev.map((t, j) => (j === i ? e.target.value : t)))}
                  className="h-11"
                />
                {doseTimes.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" aria-label={`Tirar o horário ${time}`} onClick={() => setDoseTimes((prev) => prev.filter((_, j) => j !== i))}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {doseTimes.length < 6 && (
              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setDoseTimes((prev) => [...prev, '20:00'])}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Adicionar horário
              </Button>
            )}
          </fieldset>
          <p role="note" className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            Use os horários que o seu médico indicou. O Soliv só lembra: não muda dose nem orienta tratamento.
          </p>
        </section>
      )}

      {!quit && kind !== 'medication' && (
        <section className="space-y-4">
          {kind === 'water' && (
            <NumberField
              id="habit-weight"
              label="Seu peso (opcional)"
              value={weight}
              onChange={setWeight}
              suffix="kg"
              hint="Usamos 35 ml por kg para sugerir uma meta. Você pode ajustar."
            />
          )}
          {suggestedWater && (
            <button type="button" className="text-sm font-medium text-primary underline underline-offset-2" onClick={() => setGoal(String(suggestedWater))}>
              Usar a meta sugerida: {formatAmount('ml', suggestedWater)} por dia
            </button>
          )}
          <NumberField
            id="habit-goal"
            label={limit ? 'Limite por dia' : 'Meta diária'}
            value={goal}
            onChange={setGoal}
            suffix={goalSuffix}
            step={String(catalog.goalStep)}
            hint={goalHint[kind]}
          />
          {kind === 'caffeine' && (
            <div className="space-y-1.5">
              <Label htmlFor="habit-cutoff">Último café do dia até</Label>
              <Input id="habit-cutoff" type="time" value={cutoff} onChange={(e) => setCutoff(e.target.value)} className="h-11" />
              <p className="text-xs text-muted-foreground">A cafeína fica horas no corpo. Depois deste horário, avisamos que pode atrapalhar o sono.</p>
            </div>
          )}
          {kind === 'screen_time' && (
            <div className="space-y-1.5">
              <Label htmlFor="habit-bedtime">Que horas você costuma dormir?</Label>
              <Input id="habit-bedtime" type="time" value={bedtime} onChange={(e) => setBedtime(e.target.value)} className="h-11" />
              <p className="text-xs text-muted-foreground">Telas antes de deitar atrasam o sono. O lembrete chega 1 hora antes.</p>
            </div>
          )}
          {kind === 'meals' && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Horário de cada refeição</legend>
              <p className="text-xs text-muted-foreground">Ligue as refeições em que você quer lembrete e ajuste o horário.</p>
              {MEALS.map((meal) => {
                const on = Boolean(mealTimes[meal.key]);
                return (
                  <div key={meal.key} className="flex items-center gap-3">
                    <Switch
                      id={`meal-${meal.key}`}
                      checked={on}
                      onCheckedChange={(checked) =>
                        setMealTimes((prev) => {
                          const next = { ...prev };
                          if (checked) next[meal.key] = prev[meal.key] ?? meal.defaultTime;
                          else delete next[meal.key];
                          return next;
                        })
                      }
                    />
                    <Label htmlFor={`meal-${meal.key}`} className="flex-1">
                      {meal.label}
                    </Label>
                    <Input
                      aria-label={`Horário do ${meal.label.toLowerCase()}`}
                      type="time"
                      value={mealTimes[meal.key] ?? meal.defaultTime}
                      disabled={!on}
                      onChange={(e) => setMealTimes((prev) => ({ ...prev, [meal.key]: e.target.value }))}
                      className="h-11 w-32"
                    />
                  </div>
                );
              })}
            </fieldset>
          )}
          {kind === 'joy' && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Suas atividades favoritas</legend>
              <p className="text-xs text-muted-foreground">Viram botões de registro rápido. Escolha de 1 a 12.</p>
              <div className="flex flex-wrap gap-2">
                {[...new Set([...activities, ...JOY_ACTIVITIES])].map((activity) => {
                  const on = activities.includes(activity);
                  return (
                    <button
                      key={activity}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setActivities((prev) => (on ? prev.filter((a) => a !== activity) : prev.length < 12 ? [...prev, activity] : prev))}
                      className={`min-h-9 rounded-full border px-3 text-sm transition-colors ${on ? 'border-primary bg-primary/10 font-medium text-primary' : 'border-border text-foreground hover:bg-muted/50'}`}
                    >
                      {activity}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Input
                  aria-label="Outra atividade"
                  value={newActivity}
                  maxLength={40}
                  onChange={(e) => setNewActivity(e.target.value)}
                  placeholder="Outra atividade"
                  className="h-11"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  disabled={!newActivity.trim() || activities.length >= 12}
                  onClick={() => {
                    const value = newActivity.trim();
                    if (value && !activities.includes(value)) setActivities((prev) => [...prev, value]);
                    setNewActivity('');
                  }}
                >
                  Adicionar
                </Button>
              </div>
            </fieldset>
          )}
          {kind === 'water' && (
            <fieldset className="space-y-1.5">
              <legend className="text-sm font-medium">Seus copos (botões de registro rápido)</legend>
              <div className="grid grid-cols-3 gap-2">
                {cups.map((cup, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <Input
                      aria-label={`Copo ${i + 1} em ml`}
                      type="number"
                      inputMode="numeric"
                      value={cup}
                      onChange={(e) => setCups((prev) => prev.map((c, j) => (j === i ? e.target.value : c)))}
                      className="h-11"
                    />
                    <span className="text-xs text-muted-foreground">ml</span>
                  </div>
                ))}
              </div>
            </fieldset>
          )}
        </section>
      )}

      {quit && (
        <section className="space-y-4">
          <div className="space-y-2">
            <Label>{habit ? 'Quando você parou' : 'Quando você parou?'}</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant={startMode === 'now' ? 'default' : 'outline'} onClick={() => setStartMode('now')}>
                {habit ? 'Manter a data' : 'Agora'}
              </Button>
              <Button type="button" variant={startMode === 'past' ? 'default' : 'outline'} onClick={() => setStartMode('past')}>
                {habit ? 'Corrigir a data' : 'Já parei antes'}
              </Button>
            </div>
            {startMode === 'past' && (
              <Input
                aria-label="Data e hora em que parou"
                type="datetime-local"
                value={startedAt}
                max={toLocalInput(new Date())}
                onChange={(e) => setStartedAt(e.target.value)}
                className="h-11"
              />
            )}
          </div>

          {kind === 'quit_smoking' && (
            <div className="grid gap-4 sm:grid-cols-3">
              <NumberField id="habit-per-day" label="Cigarros por dia" value={perDay} onChange={setPerDay} step="1" />
              <NumberField id="habit-per-pack" label="Cigarros no maço" value={perPack} onChange={setPerPack} step="1" />
              <NumberField id="habit-pack-price" label="Preço do maço" value={packPrice} onChange={setPackPrice} prefix="R$" />
            </div>
          )}

          {kind === 'quit_alcohol' && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  id="habit-drinks"
                  label="Doses por semana"
                  value={drinksPerWeek}
                  onChange={setDrinksPerWeek}
                  step="1"
                  hint="1 dose = 1 lata de cerveja, 1 taça de vinho ou 1 dose de destilado."
                />
                <NumberField id="habit-drink-price" label="Preço médio da dose" value={pricePerDrink} onChange={setPricePerDrink} prefix="R$" />
              </div>
              <div role="note" className="flex gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                <span>
                  Se você bebe muito todos os dias, parar de uma vez pode causar abstinência perigosa (tremores, confusão,
                  convulsões). Converse com um médico antes. Em emergência, ligue 192.
                </span>
              </div>
            </>
          )}

          {kind === 'quit_custom' && (
            <NumberField id="habit-daily-cost" label="Quanto gastava por dia (opcional)" value={dailyCost} onChange={setDailyCost} prefix="R$" />
          )}

          <div className="space-y-1.5">
            <Label htmlFor="habit-reason">Por que você quer parar? (opcional)</Label>
            <Textarea
              id="habit-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={300}
              rows={3}
              placeholder="Ex.: ter mais fôlego para brincar com meus filhos"
            />
            <p className="text-xs text-muted-foreground">Mostramos o seu motivo nos momentos de vontade.</p>
          </div>
        </section>
      )}

      <section className="space-y-4 rounded-2xl border border-border p-4">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="habit-reminders" className="flex items-center gap-2 text-base">
            <BellRing className="h-4 w-4 text-primary" aria-hidden="true" />
            Lembretes
          </Label>
          <Switch id="habit-reminders" checked={remindersEnabled} onCheckedChange={setRemindersEnabled} />
        </div>
        <p className="text-sm text-muted-foreground">
          {kind === 'water'
            ? 'Avisamos no intervalo escolhido e paramos quando você bate a meta do dia.'
            : kind === 'medication'
              ? 'Avisamos em cada horário, até 2 horas depois, se a dose ainda não foi marcada.'
              : kind === 'meals'
                ? 'Avisamos no horário de cada refeição, até 2 horas depois, se ela ainda não foi marcada.'
              : kind === 'screen_time'
                ? 'Um lembrete 1 hora antes de dormir para largar o celular.'
                : kind === 'caffeine'
                  ? 'Um lembrete perto do horário do último café.'
                  : quit
                    ? 'Uma mensagem por dia com a sua contagem, para lembrar do quanto você já avançou.'
                    : 'Um lembrete por dia para anotar o seu progresso.'}
        </p>
        {remindersEnabled && reminderTimeEditable && (
          <div className="grid gap-4 sm:grid-cols-3">
            {usesInterval && (
              <div className="space-y-1.5">
                <Label>Frequência</Label>
                <Select value={reminderInterval} onValueChange={setReminderInterval}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REMINDER_INTERVALS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="habit-reminder-start">{usesInterval ? 'Das' : 'Horário'}</Label>
              <Input id="habit-reminder-start" type="time" value={reminderStart} onChange={(e) => setReminderStart(e.target.value)} className="h-11" />
            </div>
            {usesInterval && (
              <div className="space-y-1.5">
                <Label htmlFor="habit-reminder-end">Até</Label>
                <Input id="habit-reminder-end" type="time" value={reminderEnd} onChange={(e) => setReminderEnd(e.target.value)} className="h-11" />
              </div>
            )}
          </div>
        )}
        {remindersEnabled && (
          <p className="text-xs text-muted-foreground">Os lembretes chegam como notificação no aparelho em que as notificações do Soliv estão ativas.</p>
        )}
      </section>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full min-h-12" disabled={saving}>
        {saving ? 'Salvando...' : habit ? 'Salvar alterações' : 'Começar'}
      </Button>
    </form>
  );
};

export default HabitForm;

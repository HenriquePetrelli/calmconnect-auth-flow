import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BellRing, CalendarCheck, Check, Flame, HeartPulse, Pencil, PiggyBank, Plus, Trash2, Trophy, Wind } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import PageHeader from '@/components/PageHeader';
import PatientBottomNav from '@/components/PatientBottomNav';
import ProgressRing from '@/components/habits/ProgressRing';
import CravingDialog from '@/components/habits/CravingDialog';
import RelapseDialog from '@/components/habits/RelapseDialog';
import { HABIT_VISUALS } from '@/components/habits/habitVisuals';
import { quickAmountsFor } from '@/components/habits/DailyHabitCard';
import { useHabitLogger } from '@/components/habits/useHabitLogger';
import { useHabits } from '@/hooks/useHabits';
import { useNow } from '@/hooks/useNow';
import {
  HABIT_CATALOG,
  KCAL_PER_DRINK,
  MINUTES_OF_LIFE_PER_CIGARETTE,
  addDays,
  bestGoalStreak,
  cravingTriggerRanking,
  formatAmount,
  formatBRL,
  formatDurationShort,
  formatNumber,
  goalStreak,
  habitTitle,
  healthMilestoneProgress,
  isQuitHabit,
  lastDays,
  localDateString,
  milestoneLabel,
  nextMilestone,
  quitLabel,
  quitStats,
  reachedMilestones,
  splitDuration,
  totalsByDate,
  type HabitEvent,
  type UserHabit,
} from '@/lib/habits';

const WEEKDAY = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

const Stat = ({ icon: Icon, label, value, hint }: { icon: typeof Flame; label: string; value: string; hint?: string }) => (
  <div className="min-w-0 rounded-xl border border-border bg-card p-3">
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </p>
    <p className="mt-1 break-words text-lg font-bold tabular-nums text-foreground">{value}</p>
    {hint && <p className="text-[11px] leading-tight text-muted-foreground">{hint}</p>}
  </div>
);

const reminderSummary = (habit: UserHabit) => {
  if (!habit.reminders_enabled) return 'Lembretes desligados';
  if (habit.reminder_interval_minutes) {
    const h = habit.reminder_interval_minutes / 60;
    return `Lembretes a cada ${formatNumber(h, 1)} h, das ${habit.reminder_start} às ${habit.reminder_end}`;
  }
  return `Lembrete diário às ${habit.reminder_start}`;
};

// ------------------------------------------------------------ do dia

const DailyDetail = ({
  habit,
  events,
  onLog,
  onDeleteEvent,
}: {
  habit: UserHabit;
  events: HabitEvent[];
  onLog: (amount: number) => void;
  onDeleteEvent: (id: string) => void;
}) => {
  const [custom, setCustom] = useState('');
  const { icon: Icon, color, soft } = HABIT_VISUALS[habit.kind];
  const unit = HABIT_CATALOG[habit.kind].unit!;
  const goal = habit.daily_goal ?? HABIT_CATALOG[habit.kind].defaultGoal!;
  const today = localDateString();
  const totals = totalsByDate(events);
  const total = totals.get(today) ?? 0;
  const week = lastDays(totals, goal, today, 7);
  const weekAverage = week.reduce((sum, d) => sum + d.total, 0) / 7;
  const todayEntries = events.filter((e) => e.kind === 'intake' && e.local_date === today).reverse();
  const remaining = Math.max(0, goal - total);

  const submitCustom = (event: React.FormEvent) => {
    event.preventDefault();
    const value = Number(custom.replace(',', '.'));
    if (!(value > 0 && value <= 20000)) return;
    onLog(value);
    setCustom('');
  };

  return (
    <>
      <section className="flex flex-col items-center gap-3 rounded-2xl p-4 text-center sm:p-6" style={{ backgroundColor: soft }}>
        <ProgressRing value={total / goal} color={color} size={148} stroke={12} label={`${Math.round((total / goal) * 100)}% da meta de hoje`}>
          <div className="flex flex-col items-center">
            <Icon className="h-6 w-6" style={{ color }} aria-hidden="true" />
            <span className="mt-1 text-xl font-bold tabular-nums text-foreground">{formatAmount(unit, total)}</span>
            <span className="text-xs text-muted-foreground">de {formatAmount(unit, goal)}</span>
          </div>
        </ProgressRing>
        <p className="text-sm font-medium text-foreground" aria-live="polite">
          {remaining === 0 ? 'Meta de hoje batida! 🎉' : `Faltam ${formatAmount(unit, remaining)} para a meta de hoje`}
        </p>
        <div className="flex w-full gap-2">
          {quickAmountsFor(habit).map((amount) => (
            <Button key={amount} className="min-w-0 flex-1 min-h-11 gap-1 rounded-full px-2" variant="secondary" onClick={() => onLog(amount)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              {formatAmount(unit, amount)}
            </Button>
          ))}
        </div>
        <form onSubmit={submitCustom} className="flex w-full gap-2">
          <Input
            aria-label={`Outra quantidade em ${unit}`}
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder={`Outra quantidade (${unit})`}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="h-11 min-w-0 bg-card"
          />
          <Button type="submit" variant="outline" className="h-11 shrink-0" disabled={!custom}>
            Registrar
          </Button>
        </form>
      </section>

      <section className="grid grid-cols-3 gap-2">
        <Stat icon={Flame} label="Sequência" value={`${goalStreak(totals, goal, today)} d`} hint="dias seguidos na meta" />
        <Stat icon={Trophy} label="Melhor" value={`${bestGoalStreak(totals, goal, today)} d`} hint="nos últimos 60 dias" />
        <Stat icon={CalendarCheck} label="Média" value={formatAmount(unit, Math.round(weekAverage * 10) / 10)} hint="por dia na semana" />
      </section>

      <section className="space-y-2 rounded-2xl border border-border bg-card p-4" aria-labelledby="week-chart">
        <h2 id="week-chart" className="text-sm font-semibold text-foreground">Últimos 7 dias</h2>
        <div className="flex h-32 gap-2" role="list">
          {week.map((day) => {
            const [y, m, d] = day.date.split('-').map(Number);
            const weekday = WEEKDAY[new Date(y, m - 1, d).getDay()];
            return (
              <div key={day.date} role="listitem" className="flex min-w-0 flex-1 flex-col items-center gap-1" aria-label={`${weekday}: ${formatAmount(unit, day.total)}`}>
                <div className="relative flex w-full flex-1 items-end overflow-hidden rounded-md bg-muted">
                  <div
                    className="w-full rounded-md transition-all"
                    style={{ height: `${Math.min(100, (day.total / goal) * 100)}%`, backgroundColor: day.reached ? color : `${color.replace(')', ' / 0.45)')}` }}
                  />
                </div>
                <span className={`text-[11px] ${day.date === today ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>{weekday}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-2 rounded-2xl border border-border bg-card p-4" aria-labelledby="today-entries">
        <h2 id="today-entries" className="text-sm font-semibold text-foreground">Registros de hoje</h2>
        {todayEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nada registrado ainda hoje.</p>
        ) : (
          <ul className="divide-y divide-border">
            {todayEntries.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  <span className="font-medium text-foreground">{formatAmount(unit, entry.amount ?? 0)}</span>
                  <span className="ml-2 text-muted-foreground">
                    {new Date(entry.occurred_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Apagar registro de ${formatAmount(unit, entry.amount ?? 0)}`}
                  onClick={() => onDeleteEvent(entry.id)}
                  disabled={entry.id.startsWith('tmp-')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
};

// -------------------------------------------------------- largando

const QuitDetail = ({
  habit,
  events,
  onCraving,
  onRelapse,
}: {
  habit: UserHabit;
  events: HabitEvent[];
  onCraving: () => void;
  onRelapse: () => void;
}) => {
  const now = useNow(1000);
  const { color, soft } = HABIT_VISUALS[habit.kind];
  const stats = quitStats(habit, now);
  const { days, hours, minutes, seconds } = splitDuration(stats.seconds);
  const next = nextMilestone(days);
  const reached = reachedMilestones(days);
  const best = Math.max(habit.best_streak_seconds, stats.seconds);
  const weekAgo = addDays(localDateString(), -6);
  const cravings = events.filter((e) => e.kind === 'craving');
  const cravingsThisWeek = cravings.filter((e) => e.local_date >= weekAgo).length;
  const triggers = cravingTriggerRanking(cravings).slice(0, 3);
  const relapses = events.filter((e) => e.kind === 'relapse').length;
  const unitName = habit.kind === 'quit_smoking' ? 'Cigarros evitados' : 'Doses evitadas';

  return (
    <>
      <section className="rounded-2xl p-6 text-center" style={{ backgroundColor: soft }} aria-live="off">
        <p className="text-sm text-muted-foreground">Você está há</p>
        <p className="mt-1 text-5xl font-bold tabular-nums" style={{ color }}>
          {days}
          <span className="ml-2 text-xl font-semibold text-foreground">{days === 1 ? 'dia' : 'dias'}</span>
        </p>
        <p className="mt-1 font-mono text-lg tabular-nums text-foreground">
          {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </p>
        <p className="text-sm text-muted-foreground">{quitLabel(habit)}</p>
        {next && (
          <div className="mx-auto mt-4 max-w-xs space-y-1 text-left">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Próximo marco: {milestoneLabel(next.target)}</span>
              <span>{Math.round(next.progress * 100)}%</span>
            </div>
            <Progress value={next.progress * 100} className="h-2" />
          </div>
        )}
      </section>

      {habit.settings.reason && (
        <blockquote className="rounded-2xl border-l-4 border-primary bg-primary/5 p-4 text-sm">
          <span className="block text-xs text-muted-foreground">Por que você está parando</span>
          {habit.settings.reason}
        </blockquote>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="min-h-12" onClick={onCraving}>
          <Wind className="mr-2 h-4 w-4" aria-hidden="true" />
          Senti vontade
        </Button>
        <Button variant="outline" className="min-h-12" onClick={onRelapse}>
          Tive uma recaída
        </Button>
      </div>

      <section className="grid grid-cols-2 gap-2">
        <Stat icon={PiggyBank} label="Economizado" value={formatBRL(stats.moneySaved)} hint={stats.moneySaved === 0 ? 'Informe quanto gastava em Editar' : undefined} />
        {habit.kind !== 'quit_custom' && <Stat icon={Check} label={unitName} value={formatNumber(stats.unitsAvoided)} />}
        {stats.lifeRegainedMinutes !== undefined && (
          <Stat
            icon={HeartPulse}
            label="Vida recuperada"
            value={formatDurationShort(stats.lifeRegainedMinutes * 60)}
            hint={`Estimativa: ${MINUTES_OF_LIFE_PER_CIGARETTE} min por cigarro (BMJ, 2000)`}
          />
        )}
        {stats.caloriesAvoided !== undefined && (
          <Stat icon={Flame} label="Calorias evitadas" value={`${formatNumber(stats.caloriesAvoided)} kcal`} hint={`Estimativa: ${KCAL_PER_DRINK} kcal por dose`} />
        )}
        <Stat icon={Trophy} label="Recorde" value={formatDurationShort(best)} hint={relapses > 0 ? `${relapses} ${relapses === 1 ? 'recomeço' : 'recomeços'}` : undefined} />
        <Stat
          icon={Wind}
          label="Vontades (7 dias)"
          value={String(cravingsThisWeek)}
          hint={triggers.length > 0 ? `Mais comum: ${triggers.map((t) => t.trigger.toLowerCase()).join(', ')}` : undefined}
        />
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4" aria-labelledby="milestones">
        <h2 id="milestones" className="text-sm font-semibold text-foreground">Conquistas</h2>
        {reached.length === 0 ? (
          <p className="text-sm text-muted-foreground">A primeira conquista chega com 1 dia. Você consegue.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {reached.map((m) => (
              <li key={m} className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium" style={{ backgroundColor: soft, color }}>
                <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
                {milestoneLabel(m)}
              </li>
            ))}
          </ul>
        )}
      </section>

      {habit.kind === 'quit_smoking' && (
        <section className="space-y-3 rounded-2xl border border-border bg-card p-4" aria-labelledby="health">
          <h2 id="health" className="text-sm font-semibold text-foreground">Como o seu corpo se recupera</h2>
          <ol className="space-y-3">
            {healthMilestoneProgress(stats.seconds).map((m) => (
              <li key={m.when} className="space-y-1">
                <div className="flex items-start gap-2 text-sm">
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${m.reached ? 'text-white' : 'border border-border text-transparent'}`}
                    style={m.reached ? { backgroundColor: color } : undefined}
                    aria-hidden="true"
                  >
                    <Check className="h-3 w-3" />
                  </span>
                  <span>
                    <span className="font-medium text-foreground">{m.when}: </span>
                    <span className="text-muted-foreground">{m.text}</span>
                  </span>
                </div>
                {!m.reached && (
                  <div className="pl-7">
                    <Progress value={m.progress * 100} className="h-1.5" aria-label={`${Math.round(m.progress * 100)}% até ${m.when}`} />
                  </div>
                )}
              </li>
            ))}
          </ol>
          <p className="text-xs text-muted-foreground">Fontes: Organização Mundial da Saúde e INCA. O tempo varia de pessoa para pessoa.</p>
        </section>
      )}

      {habit.kind === 'quit_alcohol' && (
        <p role="note" className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
          Tremores, suor, confusão ou convulsões nos primeiros dias sem beber podem ser abstinência grave. Procure um médico ou
          ligue 192.
        </p>
      )}
    </>
  );
};

// -------------------------------------------------------------- página

const HabitDetail = () => {
  const navigate = useNavigate();
  const { habitId } = useParams();
  const { habits, eventsByHabit, loading, logIntake, deleteEvent, logCraving, registerRelapse, archiveHabit } = useHabits();
  const log = useHabitLogger(logIntake, deleteEvent);
  const [cravingOpen, setCravingOpen] = useState(false);
  const [relapseOpen, setRelapseOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const habit = habits.find((h) => h.id === habitId);
  const events = habit ? eventsByHabit.get(habit.id) ?? [] : [];

  return (
    <div className="has-tabs">
      <div className="screen">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
          <PageHeader
            title={habit ? habitTitle(habit) : 'Hábito'}
            backTo="/habitos"
            rightAction={
              habit ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Editar hábito"
                  className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  onClick={() => navigate(`/habitos/${habit.id}/editar`)}
                >
                  <Pencil className="h-5 w-5" />
                </Button>
              ) : undefined
            }
          />
        </div>

        <main className="p-4 space-y-4 max-w-2xl mx-auto">
          {loading ? (
            <Skeleton className="h-64 w-full rounded-2xl" />
          ) : !habit ? (
            <div className="space-y-3">
              <p className="text-foreground">Este hábito não está mais na sua lista.</p>
              <Button onClick={() => navigate('/habitos')}>Ver meus hábitos</Button>
            </div>
          ) : (
            <>
              {isQuitHabit(habit.kind) ? (
                <QuitDetail habit={habit} events={events} onCraving={() => setCravingOpen(true)} onRelapse={() => setRelapseOpen(true)} />
              ) : (
                <DailyDetail
                  habit={habit}
                  events={events}
                  onLog={(amount) => log(habit, events, amount)}
                  onDeleteEvent={(id) => deleteEvent(id).catch(() => toast.error('Não foi possível apagar o registro.'))}
                />
              )}

              <button
                type="button"
                onClick={() => navigate(`/habitos/${habit.id}/editar`)}
                className="flex w-full items-center gap-2 rounded-xl border border-border bg-card p-3 text-left text-sm text-muted-foreground hover:bg-muted/40"
              >
                <BellRing className="h-4 w-4 text-primary" aria-hidden="true" />
                <span className="flex-1">{reminderSummary(habit)}</span>
                <span className="font-medium text-primary">Alterar</span>
              </button>

              <Button variant="ghost" className="w-full text-destructive hover:text-destructive" onClick={() => setArchiveOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                Tirar da minha lista
              </Button>

              <CravingDialog
                open={cravingOpen}
                onOpenChange={setCravingOpen}
                reason={habit.settings.reason}
                onSave={async (intensity, triggers, note) => {
                  try {
                    await logCraving(habit.id, intensity, triggers, note);
                  } catch (error) {
                    toast.error('Não foi possível registrar agora.');
                    throw error;
                  }
                }}
              />
              {habit.quit_started_at && (
                <RelapseDialog
                  open={relapseOpen}
                  onOpenChange={setRelapseOpen}
                  currentStreakSeconds={quitStats(habit).seconds}
                  onConfirm={async (note) => {
                    try {
                      await registerRelapse(habit.id, note);
                      toast.success('Contagem recomeçada. O seu recorde continua guardado.', {
                        action: { label: 'Falar com psicólogo', onClick: () => navigate('/appointments') },
                      });
                    } catch (error) {
                      toast.error('Não foi possível registrar agora.');
                      throw error;
                    }
                  }}
                />
              )}
              <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Tirar “{habitTitle(habit)}” da lista?</AlertDialogTitle>
                    <AlertDialogDescription>Os lembretes param. O histórico fica guardado e sai junto se você excluir a conta.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={async () => {
                        try {
                          await archiveHabit(habit.id);
                          toast.success('Hábito tirado da lista');
                          navigate('/habitos', { replace: true });
                        } catch {
                          toast.error('Não foi possível tirar da lista agora.');
                        }
                      }}
                    >
                      Tirar da lista
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </main>
      </div>
      <PatientBottomNav />
    </div>
  );
};

export default HabitDetail;

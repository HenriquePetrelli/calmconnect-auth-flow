import { useNavigate } from 'react-router-dom';
import { ChevronRight, ListChecks, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProgressRing from '@/components/habits/ProgressRing';
import { HABIT_VISUALS } from '@/components/habits/habitVisuals';
import { quickAmountsFor } from '@/components/habits/DailyHabitCard';
import { useHabitLogger } from '@/components/habits/useHabitLogger';
import { useHabits } from '@/hooks/useHabits';
import { useNow } from '@/hooks/useNow';
import {
  HABIT_CATALOG,
  formatAmount,
  formatBRL,
  habitTitle,
  isQuitHabit,
  localDateString,
  quitLabel,
  quitStats,
  totalsByDate,
} from '@/lib/habits';

const MAX_ON_HOME = 4;

/** Card "Meus hábitos" da Home: o dia de hoje num relance, com registro rápido. */
const HomeHabitsCard = () => {
  const navigate = useNavigate();
  const { habits, eventsByHabit, loading, error, logIntake, deleteEvent } = useHabits();
  const log = useHabitLogger(logIntake, deleteEvent);
  const now = useNow(60_000);

  if (loading || error) return null;

  const today = localDateString();
  const shown = habits.slice(0, MAX_ON_HOME);

  return (
    <section className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-sm" aria-labelledby="home-habits">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="home-habits" className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <ListChecks className="h-5 w-5 text-primary" aria-hidden="true" />
          Meus hábitos
        </h2>
        <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => navigate('/habitos')}>
          {habits.length > 0 ? 'Ver tudo' : 'Abrir'}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      {habits.length === 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Beber mais água, dormir melhor, parar de fumar ou de beber: acompanhe o seu dia, os dias sem e o dinheiro
            economizado.
          </p>
          <Button onClick={() => navigate('/habitos/novo')} className="w-full min-h-11">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Adicionar hábito
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {shown.map((habit) => {
            const { icon: Icon, color, soft } = HABIT_VISUALS[habit.kind];
            const events = eventsByHabit.get(habit.id) ?? [];

            if (isQuitHabit(habit.kind)) {
              const stats = quitStats(habit, now);
              return (
                <li key={habit.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/habitos/${habit.id}`)}
                    className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-muted/50"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: soft }}>
                      <Icon className="h-5 w-5" style={{ color }} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-foreground">
                        {stats.days} {stats.days === 1 ? 'dia' : 'dias'} {quitLabel(habit)}
                      </span>
                      {stats.moneySaved > 0 && (
                        <span className="block text-xs text-muted-foreground">{formatBRL(stats.moneySaved)} economizados</span>
                      )}
                    </span>
                  </button>
                </li>
              );
            }

            const unit = HABIT_CATALOG[habit.kind].unit!;
            const goal = habit.daily_goal ?? HABIT_CATALOG[habit.kind].defaultGoal!;
            const total = totalsByDate(events).get(today) ?? 0;
            const quick = quickAmountsFor(habit)[0];
            return (
              <li key={habit.id} className="flex items-center gap-3 rounded-xl p-2">
                <button type="button" onClick={() => navigate(`/habitos/${habit.id}`)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <ProgressRing value={total / goal} color={color} size={40} stroke={4} label={`${habitTitle(habit)}: ${Math.round((total / goal) * 100)}%`}>
                    <Icon className="h-4 w-4" style={{ color }} aria-hidden="true" />
                  </ProgressRing>
                  <span className="min-w-0">
                    <span className="block font-semibold text-foreground">{habitTitle(habit)}</span>
                    <span className="block text-xs text-muted-foreground">
                      {formatAmount(unit, total)} de {formatAmount(unit, goal)}
                    </span>
                  </span>
                </button>
                {quick && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="shrink-0 gap-1 rounded-full"
                    onClick={() => log(habit, events, quick)}
                    aria-label={`Registrar ${formatAmount(unit, quick)} em ${habitTitle(habit)}`}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    {formatAmount(unit, quick)}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default HomeHabitsCard;

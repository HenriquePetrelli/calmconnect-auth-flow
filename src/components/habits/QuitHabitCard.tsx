import { ChevronRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { HABIT_VISUALS } from '@/components/habits/habitVisuals';
import { formatBRL, habitTitle, milestoneLabel, nextMilestone, quitStats, splitDuration, type UserHabit } from '@/lib/habits';

interface QuitHabitCardProps {
  habit: UserHabit;
  now: Date;
  onOpen: () => void;
}

const QuitHabitCard = ({ habit, now, onOpen }: QuitHabitCardProps) => {
  const { icon: Icon, color, soft } = HABIT_VISUALS[habit.kind];
  const stats = quitStats(habit, now);
  const { days, hours, minutes } = splitDuration(stats.seconds);
  const next = nextMilestone(days);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/40"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: soft }}>
          <Icon className="h-5 w-5" style={{ color }} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">{habitTitle(habit)}</p>
          <p className="text-sm text-muted-foreground">
            <span className="text-lg font-bold tabular-nums text-foreground">{days}</span> {days === 1 ? 'dia' : 'dias'}
            <span className="tabular-nums"> {hours} h {minutes} min</span>
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <p className="text-xs text-muted-foreground">Economizado</p>
          <p className="font-semibold tabular-nums text-foreground">{formatBRL(stats.moneySaved)}</p>
        </div>
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <p className="text-xs text-muted-foreground">
            {habit.kind === 'quit_smoking' ? 'Cigarros evitados' : habit.kind === 'quit_alcohol' ? 'Doses evitadas' : 'Recorde'}
          </p>
          <p className="font-semibold tabular-nums text-foreground">
            {habit.kind === 'quit_custom'
              ? `${Math.max(days, Math.floor(habit.best_streak_seconds / 86400))} dias`
              : stats.unitsAvoided.toLocaleString('pt-BR')}
          </p>
        </div>
      </div>

      {next && (
        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Próximo marco: {milestoneLabel(next.target)}</span>
            <span>{next.target - days} {next.target - days === 1 ? 'dia' : 'dias'}</span>
          </div>
          <Progress value={next.progress * 100} className="h-1.5" />
        </div>
      )}
    </button>
  );
};

export default QuitHabitCard;

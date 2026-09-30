import { Flame, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProgressRing from '@/components/habits/ProgressRing';
import { HABIT_VISUALS } from '@/components/habits/habitVisuals';
import {
  HABIT_CATALOG,
  formatAmount,
  goalStreak,
  habitTitle,
  localDateString,
  totalsByDate,
  type HabitEvent,
  type UserHabit,
} from '@/lib/habits';

interface DailyHabitCardProps {
  habit: UserHabit;
  events: HabitEvent[];
  onLog: (amount: number) => void;
  onOpen: () => void;
  compact?: boolean;
}

export const quickAmountsFor = (habit: UserHabit): number[] => {
  const catalog = HABIT_CATALOG[habit.kind];
  const cups = habit.kind === 'water' ? habit.settings.cup_sizes : undefined;
  return (cups && cups.length > 0 ? cups : catalog.quickAmounts ?? []).slice(0, 3);
};

const DailyHabitCard = ({ habit, events, onLog, onOpen, compact = false }: DailyHabitCardProps) => {
  const { icon: Icon, color, soft } = HABIT_VISUALS[habit.kind];
  const unit = HABIT_CATALOG[habit.kind].unit!;
  const goal = habit.daily_goal ?? HABIT_CATALOG[habit.kind].defaultGoal!;
  const today = localDateString();
  const totals = totalsByDate(events);
  const total = totals.get(today) ?? 0;
  const streak = goalStreak(totals, goal, today);
  const done = total >= goal;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-4 text-left">
        <ProgressRing value={total / goal} color={color} size={compact ? 56 : 68} label={`${habitTitle(habit)}: ${Math.round((total / goal) * 100)}% da meta`}>
          <Icon className={compact ? 'h-5 w-5' : 'h-6 w-6'} style={{ color }} aria-hidden="true" />
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">{habitTitle(habit)}</p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{formatAmount(unit, total)}</span> de {formatAmount(unit, goal)}
            {done && <span className="ml-1 font-medium" style={{ color }}>· meta batida!</span>}
          </p>
          {streak > 0 && (
            <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Flame className="h-3.5 w-3.5 text-orange-500" aria-hidden="true" />
              {streak} {streak === 1 ? 'dia seguido' : 'dias seguidos'}
            </p>
          )}
        </div>
      </button>

      <div className="mt-3 flex gap-2">
        {quickAmountsFor(habit).map((amount) => (
          <Button
            key={amount}
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 gap-1 rounded-full"
            style={{ backgroundColor: soft, borderColor: 'transparent' }}
            onClick={() => onLog(amount)}
            aria-label={`Registrar ${formatAmount(unit, amount)}`}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            {formatAmount(unit, amount)}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default DailyHabitCard;

import { useCallback } from 'react';
import { toast } from 'sonner';
import { HABIT_CATALOG, formatAmount, habitTitle, localDateString, totalsByDate, type HabitEvent, type UserHabit } from '@/lib/habits';

type LogIntake = (habitId: string, amount: number) => Promise<string | null>;
type DeleteEvent = (eventId: string) => Promise<void>;

/**
 * Registro com resposta imediata: aviso com "Desfazer" (toque errado num copo
 * acontece) e comemoração quando a meta do dia é batida.
 */
export const useHabitLogger = (logIntake: LogIntake, deleteEvent: DeleteEvent) =>
  useCallback(
    async (habit: UserHabit, events: HabitEvent[], amount: number) => {
      const unit = HABIT_CATALOG[habit.kind].unit!;
      const goal = habit.daily_goal ?? HABIT_CATALOG[habit.kind].defaultGoal!;
      const before = totalsByDate(events).get(localDateString()) ?? 0;
      try {
        const eventId = await logIntake(habit.id, amount);
        const reached = before < goal && before + amount >= goal;
        toast.success(reached ? `Meta do dia batida! ${habitTitle(habit)} 🎉` : `+${formatAmount(unit, amount)} registrado`, {
          action: eventId
            ? {
                label: 'Desfazer',
                onClick: () => {
                  deleteEvent(eventId).catch(() => toast.error('Não foi possível desfazer.'));
                },
              }
            : undefined,
        });
      } catch (error) {
        console.error('Erro ao registrar hábito', error);
        toast.error('Não foi possível registrar agora. Tente de novo.');
      }
    },
    [logIntake, deleteEvent],
  );

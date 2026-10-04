import { useCallback } from 'react';
import { toast } from 'sonner';
import {
  HABIT_CATALOG,
  formatHabitAmount,
  habitTitle,
  isLimitHabit,
  localDateString,
  onceEventFor,
  totalsByDate,
  type HabitEvent,
  type QuickItem,
  type UserHabit,
} from '@/lib/habits';

type LogIntake = (habitId: string, amount: number, details?: Record<string, unknown>) => Promise<string | null>;
type DeleteEvent = (eventId: string) => Promise<void>;

const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** Botão de quantidade livre ("Outra quantidade"). */
export const customItem = (habit: Pick<UserHabit, 'kind'>, amount: number): QuickItem => ({
  key: 'custom',
  label: formatHabitAmount(habit.kind, amount),
  amount,
});

/**
 * Registro com resposta imediata: aviso com "Desfazer" (toque errado acontece),
 * comemoração quando a meta do dia é batida e aviso quando passa do limite.
 * Nos botões de "uma vez por dia" (refeição, dose), tocar de novo desmarca.
 * Devolve o id do registro criado.
 */
export const useHabitLogger = (logIntake: LogIntake, deleteEvent: DeleteEvent) =>
  useCallback(
    async (habit: UserHabit, events: HabitEvent[], item: QuickItem): Promise<string | null> => {
      const today = localDateString();
      const existing = onceEventFor(events, item, today);
      try {
        if (existing) {
          await deleteEvent(existing.id);
          toast(habit.kind === 'medication' ? `Dose das ${item.label} desmarcada` : `${item.label} desmarcado`);
          return null;
        }

        const goal = habit.daily_goal ?? HABIT_CATALOG[habit.kind].defaultGoal!;
        const before = totalsByDate(events).get(today) ?? 0;
        const after = before + item.amount;
        const eventId = await logIntake(habit.id, item.amount, item.details ?? {});

        let message: string;
        if (isLimitHabit(habit.kind)) {
          message = before <= goal && after > goal
            ? `Você passou do limite de ${formatHabitAmount(habit.kind, goal)} hoje.`
            : `+${formatHabitAmount(habit.kind, item.amount)} registrado`;
          const cutoff = habit.settings.cutoff_time;
          if (habit.kind === 'caffeine' && cutoff && nowHHMM() > cutoff) {
            message += ` Depois das ${cutoff}, a cafeína pode atrapalhar o sono.`;
          }
        } else if (before < goal && after >= goal) {
          message = `Meta do dia batida! ${habitTitle(habit)}`;
        } else if (habit.kind === 'medication') {
          message = `Dose das ${item.label} marcada`;
        } else if (habit.kind === 'meals' || habit.kind === 'joy') {
          message = `${item.label}: registrado`;
        } else {
          message = `+${formatHabitAmount(habit.kind, item.amount)} registrado`;
        }

        const show = isLimitHabit(habit.kind) && before <= goal && after > goal ? toast.warning : toast.success;
        show(message, {
          action: eventId
            ? {
                label: 'Desfazer',
                onClick: () => {
                  deleteEvent(eventId).catch(() => toast.error('Não foi possível desfazer.'));
                },
              }
            : undefined,
        });
        return eventId;
      } catch (error) {
        console.error('Erro ao registrar hábito', error);
        toast.error('Não foi possível registrar agora. Tente de novo.');
        return null;
      }
    },
    [logIntake, deleteEvent],
  );

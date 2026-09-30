import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Json } from '@/integrations/supabase/types';
import {
  addDays,
  localDateString,
  type HabitEvent,
  type HabitKind,
  type HabitSettings,
  type UserHabit,
} from '@/lib/habits';

/** Quantos dias de histórico carregar (sequências e gráfico da semana). */
const HISTORY_DAYS = 60;

export interface HabitDraft {
  kind: HabitKind;
  title?: string | null;
  daily_goal?: number | null;
  quit_started_at?: string | null;
  settings: HabitSettings;
  reminders_enabled: boolean;
  reminder_start: string;
  reminder_end: string;
  reminder_interval_minutes: number | null;
}

const deviceTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
  } catch {
    return 'America/Sao_Paulo';
  }
};

/** Postgres devolve "09:00:00"; o input de horário usa "09:00". */
const normalizeHabit = (row: Record<string, unknown>): UserHabit => ({
  ...(row as unknown as UserHabit),
  daily_goal: row.daily_goal == null ? null : Number(row.daily_goal),
  best_streak_seconds: Number(row.best_streak_seconds ?? 0),
  settings: (row.settings as HabitSettings) ?? {},
  reminder_start: String(row.reminder_start ?? '09:00').slice(0, 5),
  reminder_end: String(row.reminder_end ?? '21:00').slice(0, 5),
});

export const useHabits = () => {
  const { user } = useAuth();
  const [habits, setHabits] = useState<UserHabit[]>([]);
  const [events, setEvents] = useState<HabitEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    const since = addDays(localDateString(), -HISTORY_DAYS);
    const [habitsResult, eventsResult] = await Promise.all([
      supabase
        .from('user_habits')
        .select('*')
        .eq('user_id', user.id)
        .is('archived_at', null)
        .order('created_at', { ascending: true }),
      supabase
        .from('habit_events')
        .select('*')
        .eq('user_id', user.id)
        .gte('local_date', since)
        .order('occurred_at', { ascending: true }),
    ]);
    if (habitsResult.error || eventsResult.error) {
      console.error('useHabits: erro ao carregar', habitsResult.error ?? eventsResult.error);
      setError(true);
    } else {
      setError(false);
      setHabits((habitsResult.data ?? []).map((row) => normalizeHabit(row as Record<string, unknown>)));
      setEvents(
        (eventsResult.data ?? []).map((row) => ({
          ...(row as unknown as HabitEvent),
          amount: row.amount == null ? null : Number(row.amount),
          details: (row.details as Record<string, unknown>) ?? {},
        })),
      );
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const eventsByHabit = useMemo(() => {
    const map = new Map<string, HabitEvent[]>();
    for (const event of events) {
      const list = map.get(event.habit_id) ?? [];
      list.push(event);
      map.set(event.habit_id, list);
    }
    return map;
  }, [events]);

  const createHabit = useCallback(
    async (draft: HabitDraft): Promise<string> => {
      if (!user?.id) throw new Error('Sem sessão');
      const { data, error: insertError } = await supabase
        .from('user_habits')
        .insert({ ...draft, settings: draft.settings as Json, user_id: user.id, timezone: deviceTimezone() })
        .select('id')
        .single();
      if (insertError) throw insertError;
      await load();
      return data.id as string;
    },
    [user?.id, load],
  );

  const updateHabit = useCallback(
    async (habitId: string, patch: Partial<HabitDraft>) => {
      const { error: updateError } = await supabase
        .from('user_habits')
        .update({ ...patch, settings: patch.settings as Json | undefined, timezone: deviceTimezone() })
        .eq('id', habitId);
      if (updateError) throw updateError;
      await load();
    },
    [load],
  );

  /** Tirar da lista não apaga o histórico. */
  const archiveHabit = useCallback(
    async (habitId: string) => {
      const { error: updateError } = await supabase
        .from('user_habits')
        .update({ archived_at: new Date().toISOString(), reminders_enabled: false })
        .eq('id', habitId);
      if (updateError) throw updateError;
      await load();
    },
    [load],
  );

  const logIntake = useCallback(
    async (habitId: string, amount: number): Promise<string | null> => {
      if (!user?.id) return null;
      const optimistic: HabitEvent = {
        id: `tmp-${Date.now()}`,
        habit_id: habitId,
        kind: 'intake',
        amount,
        local_date: localDateString(),
        occurred_at: new Date().toISOString(),
        details: {},
      };
      // Registro instantâneo na tela: tocar num copo tem que responder na hora.
      setEvents((prev) => [...prev, optimistic]);
      const { data, error: insertError } = await supabase
        .from('habit_events')
        .insert({
          habit_id: habitId,
          user_id: user.id,
          kind: 'intake',
          amount,
          local_date: optimistic.local_date,
        })
        .select('id')
        .single();
      if (insertError) {
        setEvents((prev) => prev.filter((e) => e.id !== optimistic.id));
        throw insertError;
      }
      setEvents((prev) => prev.map((e) => (e.id === optimistic.id ? { ...e, id: data.id as string } : e)));
      return data.id as string;
    },
    [user?.id, load],
  );

  const deleteEvent = useCallback(
    async (eventId: string) => {
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      const { error: deleteError } = await supabase.from('habit_events').delete().eq('id', eventId);
      if (deleteError) {
        await load();
        throw deleteError;
      }
    },
    [load],
  );

  const logCraving = useCallback(
    async (habitId: string, intensity: number, triggers: string[], note?: string) => {
      if (!user?.id) return;
      const { error: insertError } = await supabase.from('habit_events').insert({
        habit_id: habitId,
        user_id: user.id,
        kind: 'craving',
        amount: intensity,
        local_date: localDateString(),
        details: { triggers, ...(note ? { note: note.slice(0, 500) } : {}) },
      });
      if (insertError) throw insertError;
      await load();
    },
    [user?.id, load],
  );

  const registerRelapse = useCallback(
    async (habitId: string, note?: string) => {
      const { error: rpcError } = await supabase.rpc('register_habit_relapse', {
        p_habit_id: habitId,
        p_local_date: localDateString(),
        p_note: note?.trim() || null,
      });
      if (rpcError) throw rpcError;
      await load();
    },
    [load],
  );

  return {
    habits,
    events,
    eventsByHabit,
    loading,
    error,
    reload: load,
    createHabit,
    updateHabit,
    archiveHabit,
    logIntake,
    deleteEvent,
    logCraving,
    registerRelapse,
  };
};

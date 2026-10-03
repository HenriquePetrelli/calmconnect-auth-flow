import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { buildFeed, type FeedItem } from '@/lib/activityFeed';
import { addDays, localDateString, type HabitEvent, type UserHabit } from '@/lib/habits';
import type { Instrument, Severity } from '@/lib/screenings';

/** Histórico unificado dos últimos ~3 meses (o mesmo período das atividades). */
export const useActivityFeed = (days = 92) => {
  const { user } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    const since = addDays(localDateString(), -days);
    const [stats, habits, events, screenings] = await Promise.all([
      supabase.from('patient_statistics').select('quarterly_activities').eq('patient_id', user.id).maybeSingle(),
      supabase.from('user_habits').select('*').eq('user_id', user.id),
      supabase.from('habit_events').select('*').eq('user_id', user.id).gte('local_date', since),
      supabase.from('mental_health_screenings').select('id, instrument, score, severity, created_at').eq('user_id', user.id),
    ]);
    setItems(
      buildFeed({
        activities: ((stats.data?.quarterly_activities as unknown) as { name: string; date: string }[] | null) ?? [],
        habits: ((habits.data ?? []) as Record<string, unknown>[]).map((row) => ({
          ...(row as unknown as UserHabit),
          daily_goal: row.daily_goal == null ? null : Number(row.daily_goal),
          settings: (row.settings as UserHabit['settings']) ?? {},
        })),
        events: ((events.data ?? []) as Record<string, unknown>[]).map((row) => ({
          ...(row as unknown as HabitEvent),
          amount: row.amount == null ? null : Number(row.amount),
          details: (row.details as Record<string, unknown>) ?? {},
        })),
        screenings: (screenings.data ?? []) as { id: string; instrument: Instrument; score: number; severity: Severity; created_at: string }[],
      }),
    );
    setLoading(false);
  }, [user?.id, days]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, loading, reload: load };
};

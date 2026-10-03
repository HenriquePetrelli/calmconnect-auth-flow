import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getCurrentWeekRange } from '@/hooks/useWeeklyGoals';
import { achievementProgress, unlockedTitles, type AchievementInput, type AchievementProgress } from '@/lib/achievementRules';
import { celebrateAchievement } from '@/components/achievements/celebrateAchievement';
import { localDateString, type HabitEvent, type UserHabit } from '@/lib/habits';

interface Achievement {
  id: string;
  user_id: string;
  title: string;
  description: string;
  icon: string;
  achieved: boolean;
  achieved_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useAchievements = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<Record<string, AchievementProgress>>({});
  const [isChecking, setIsChecking] = useState(false);

  const fetchAchievements = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Initialize achievements if they don't exist
      await supabase.rpc('initialize_patient_achievements', {
        p_user_id: user.id
      });

      const { data, error } = await supabase
        .from('patient_achievements')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setAchievements(data || []);
    } catch (error) {
      console.error('Error fetching achievements:', error);
      toast({
        title: 'Não foi possível carregar suas conquistas',
        description: 'Tente de novo em instantes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const unlockAchievement = useCallback(async (title: string) => {
    if (!user) return;

    try {
      const achievement = achievements.find(a => a.title === title && !a.achieved);
      if (!achievement) return;

      const { error } = await supabase
        .from('patient_achievements')
        .update({
          achieved: true,
          achieved_at: new Date().toISOString(),
        })
        .eq('id', achievement.id);

      if (error) throw error;

      // Update local state
      setAchievements(prev =>
        prev.map(a =>
          a.id === achievement.id
            ? { ...a, achieved: true, achieved_at: new Date().toISOString() }
            : a
        )
      );

      // Comemora em qualquer tela
      celebrateAchievement(achievement);
    } catch (error) {
      console.error('Error unlocking achievement:', error);
    }
  }, [user, achievements]);

  const checkAchievements = useCallback(async () => {
    if (!user || isChecking) return;

    setIsChecking(true);
    try {
      const since = new Date();
      since.setDate(since.getDate() - 60);
      const { weekStart, weekEnd } = getCurrentWeekRange();
      const [statsResult, journalResult, habitsResult, eventsResult, goalsResult, screeningsResult] = await Promise.all([
        supabase.from('patient_statistics').select('*').eq('patient_id', user.id).maybeSingle(),
        supabase.from('private_journals').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('user_habits').select('*').eq('user_id', user.id),
        supabase.from('habit_events').select('*').eq('user_id', user.id).gte('local_date', localDateString(since)),
        supabase
          .from('patient_weekly_goals')
          .select('completed, weekly_goals(type)')
          .eq('user_id', user.id)
          .gte('week_start_date', weekStart)
          .lte('week_end_date', weekEnd),
        supabase.from('mental_health_screenings').select('instrument').eq('user_id', user.id),
      ]);

      const input: AchievementInput = {
        stats: statsResult.data ?? null,
        journalCount: journalResult.count || 0,
        habits: ((habitsResult.data ?? []) as Record<string, unknown>[]).map((row) => ({
          ...(row as unknown as UserHabit),
          daily_goal: row.daily_goal == null ? null : Number(row.daily_goal),
          best_streak_seconds: Number(row.best_streak_seconds ?? 0),
          settings: (row.settings as UserHabit['settings']) ?? {},
        })),
        events: ((eventsResult.data ?? []) as Record<string, unknown>[]).map((row) => ({
          ...(row as unknown as HabitEvent),
          amount: row.amount == null ? null : Number(row.amount),
          details: (row.details as Record<string, unknown>) ?? {},
        })),
        weekGoals: ((goalsResult.data ?? []) as { completed: boolean | null; weekly_goals: { type: string } | null }[]).map((g) => ({
          completed: Boolean(g.completed),
          type: g.weekly_goals?.type ?? '',
        })),
        screeningInstruments: (screeningsResult.data ?? []).map((s) => s.instrument as string),
      };
      setProgress(achievementProgress(input));
      const toUnlock = unlockedTitles(input);

      for (const title of toUnlock) {
        await unlockAchievement(title);
      }
    } catch (error) {
      console.error('Error checking achievements:', error);
    } finally {
      setIsChecking(false);
    }
  }, [user, isChecking, unlockAchievement]);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  return {
    achievements,
    loading,
    progress,
    checkAchievements,
    unlockAchievement,
    refreshAchievements: fetchAchievements,
  };
};

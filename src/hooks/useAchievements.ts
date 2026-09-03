import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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
  const [newlyUnlocked, setNewlyUnlocked] = useState<Achievement | null>(null);
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
        title: 'Erro ao carregar conquistas',
        description: 'Tente novamente mais tarde',
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

      // Show celebration modal
      setNewlyUnlocked({ ...achievement, achieved: true, achieved_at: new Date().toISOString() });
    } catch (error) {
      console.error('Error unlocking achievement:', error);
    }
  }, [user, achievements]);

  const checkAchievements = useCallback(async () => {
    if (!user || isChecking) return;
    
    setIsChecking(true);
    try {
      // Single query for both stats and journal count
      const [statsResult, journalResult] = await Promise.all([
        supabase
          .from('patient_statistics')
          .select('*')
          .eq('patient_id', user.id)
          .maybeSingle(),
        supabase
          .from('private_journals')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
      ]);

      const stats = statsResult.data;
      const journalCount = journalResult.count || 0;

      if (!stats) return;

      // Batch check all achievements
      const toUnlock: string[] = [];
      
      if (stats.total_guided_breathing_time > 0) toUnlock.push('Primeiro Passo');
      if (stats.total_guided_breathing_time >= 5) toUnlock.push('Respirador Experiente');
      if (journalCount >= 7) toUnlock.push('Escritor Consciente');
      if (stats.total_scheduled_consultations >= 3) toUnlock.push('Comprometido com a Terapia');
      if (stats.streak_days >= 7) toUnlock.push('Mestre do Humor');
      if (stats.streak_days >= 30) toUnlock.push('Cuidado Constante');
      if (stats.total_therapeutic_sound_time > 0) toUnlock.push('Primeiro Som');
      if (stats.total_therapeutic_sound_time >= 5) toUnlock.push('Ouvinte Dedicado');

      // Unlock all achievements at once
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
    newlyUnlocked,
    setNewlyUnlocked,
    checkAchievements,
    refreshAchievements: fetchAchievements,
  };
};

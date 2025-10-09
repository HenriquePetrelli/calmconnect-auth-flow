import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface DefaultWeeklyGoal {
  id: string;
  category: string;
  title: string;
  description: string;
  icon: string;
  target: number;
}

export interface WeeklyGoal {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  target: number;
  progress: number;
  created_at: string;
  updated_at: string;
  start_date: string;
  end_date: string;
  completed: boolean;
}

export const useWeeklyGoals = () => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<WeeklyGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [newlyCompleted, setNewlyCompleted] = useState<WeeklyGoal | null>(null);

  const fetchGoals = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const { data, error } = await supabase
        .from('weekly_goals')
        .select('*')
        .eq('user_id', user.id)
        .gte('start_date', startOfWeek.toISOString().split('T')[0])
        .lte('end_date', endOfWeek.toISOString().split('T')[0])
        .order('created_at', { ascending: false });

      if (error) throw error;

      setGoals(data || []);
    } catch (error) {
      console.error('Error fetching goals:', error);
      setGoals([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateGoalProgress = useCallback(async (goalId: string, increment: number = 1) => {
    try {
      const goal = goals.find(g => g.id === goalId);
      if (!goal) return;

      const newProgress = Math.min(goal.progress + increment, goal.target);
      const isCompleted = newProgress >= goal.target;

      const { error } = await supabase
        .from('weekly_goals')
        .update({ 
          progress: newProgress,
          completed: isCompleted 
        })
        .eq('id', goalId);

      if (error) throw error;

      if (isCompleted && !goal.completed) {
        setNewlyCompleted({ ...goal, progress: newProgress, completed: true });
      }

      await fetchGoals();
    } catch (error) {
      console.error('Error updating goal progress:', error);
    }
  }, [goals, fetchGoals]);

  const checkAndUpdateGoals = useCallback(async (category: string) => {
    const categoryGoals = goals.filter(g => g.category === category && !g.completed);
    
    for (const goal of categoryGoals) {
      await updateGoalProgress(goal.id, 1);
    }
  }, [goals, updateGoalProgress]);

  const createGoal = useCallback(async (goalData: Omit<WeeklyGoal, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'progress' | 'completed'>) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('weekly_goals')
        .insert({
          ...goalData,
          user_id: user.id,
          progress: 0,
          completed: false
        });

      if (error) throw error;

      await fetchGoals();
    } catch (error) {
      console.error('Error creating goal:', error);
      toast.error('Erro ao criar meta');
    }
  }, [user, fetchGoals]);

  const fetchDefaultGoals = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('default_weekly_goals')
        .select('*')
        .order('category');

      if (error) throw error;
      return data as DefaultWeeklyGoal[];
    } catch (error) {
      console.error('Error fetching default goals:', error);
      return [];
    }
  }, []);

  const setShowWeeklyGoalModal = useCallback(async (value: boolean) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('patients')
        .update({ show_weekly_goal_modal: value })
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating weekly goal modal preference:', error);
      throw error;
    }
  }, [user]);

  const setShowGoalModal = useCallback(async (value: boolean) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('patients')
        .update({ show_goal_modal: value })
        .eq('user_id', user.id);

      if (error) throw error;
      
      toast.success(value ? 'Modal de metas semanais ativada' : 'Modal de metas semanais desativada');
    } catch (error) {
      console.error('Error updating goal modal preference:', error);
      toast.error('Erro ao atualizar preferência');
      throw error;
    }
  }, [user]);

  const getShowGoalModalPreference = useCallback(async () => {
    if (!user?.id) return true;

    try {
      const { data, error } = await supabase
        .from('patients')
        .select('show_goal_modal')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data?.show_goal_modal ?? true;
    } catch (error) {
      console.error('Error fetching goal modal preference:', error);
      return true;
    }
  }, [user]);

  const dismissCompletionModal = useCallback(() => {
    setNewlyCompleted(null);
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  return {
    goals,
    loading,
    newlyCompleted,
    dismissCompletionModal,
    updateGoalProgress,
    checkAndUpdateGoals,
    createGoal,
    fetchDefaultGoals,
    setShowWeeklyGoalModal,
    setShowGoalModal,
    getShowGoalModalPreference,
  };
};

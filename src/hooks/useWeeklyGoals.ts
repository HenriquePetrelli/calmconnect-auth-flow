import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface WeeklyGoal {
  id: string;
  user_id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  start_date: string;
  end_date: string;
  completed: boolean;
  category?: string;
  created_at: string;
  updated_at: string;
  show_weekly_goal_modal?: boolean;
  show_goal_modal?: boolean;
}

export const useWeeklyGoals = () => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<WeeklyGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [newlyCompleted, setNewlyCompleted] = useState<WeeklyGoal | null>(null);

  const fetchGoals = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('weekly_goals')
        .select('*')
        .eq('user_id', user.id)
        .lte('start_date', today)
        .gte('end_date', today)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error('Error fetching weekly goals:', error);
      toast.error('Erro ao carregar metas semanais');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateGoalProgress = useCallback(async (goalId: string, increment: number = 1) => {
    if (!user) return;

    try {
      const goal = goals.find(g => g.id === goalId);
      if (!goal) return;

      const newProgress = Math.min(goal.progress + increment, goal.target);
      const isNowCompleted = newProgress >= goal.target && !goal.completed;

      const { data, error } = await supabase
        .from('weekly_goals')
        .update({
          progress: newProgress,
          completed: newProgress >= goal.target
        })
        .eq('id', goalId)
        .select()
        .single();

      if (error) throw error;

      setGoals(prev => prev.map(g => g.id === goalId ? data : g));

      if (isNowCompleted) {
        setNewlyCompleted(data);
      }
    } catch (error) {
      console.error('Error updating goal progress:', error);
    }
  }, [user, goals]);

  const checkAndUpdateGoals = useCallback(async (category: string) => {
    if (!user || !goals.length) return;

    const activeGoals = goals.filter(g => 
      g.category === category && 
      !g.completed && 
      g.progress < g.target
    );

    for (const goal of activeGoals) {
      await updateGoalProgress(goal.id);
    }
  }, [user, goals, updateGoalProgress]);

  const createGoal = useCallback(async (goalData: Omit<WeeklyGoal, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'progress' | 'completed'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('weekly_goals')
        .insert({
          ...goalData,
          user_id: user.id,
          progress: 0,
          completed: false
        })
        .select()
        .single();

      if (error) throw error;

      setGoals(prev => [data, ...prev]);
      toast.success('Meta criada com sucesso!');
      return data;
    } catch (error) {
      console.error('Error creating goal:', error);
      toast.error('Erro ao criar meta');
    }
  }, [user]);

  const dismissCompletionModal = useCallback(() => {
    setNewlyCompleted(null);
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const checkShouldShowModal = useCallback(async () => {
    if (!user) return { shouldShow: false, showGoalModal: true };

    try {
      const { data, error } = await supabase
        .from('weekly_goals')
        .select('show_weekly_goal_modal, show_goal_modal')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return { shouldShow: false, showGoalModal: true };
      }

      return {
        shouldShow: data.show_weekly_goal_modal && data.show_goal_modal,
        showGoalModal: data.show_goal_modal
      };
    } catch (error) {
      console.error('Error checking modal status:', error);
      return { shouldShow: false, showGoalModal: true };
    }
  }, [user]);

  const setShowWeeklyGoalModal = useCallback(async (value: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('weekly_goals')
        .update({ show_weekly_goal_modal: value })
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating show_weekly_goal_modal:', error);
    }
  }, [user]);

  const setShowGoalModal = useCallback(async (value: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('weekly_goals')
        .update({ show_goal_modal: value })
        .eq('user_id', user.id);

      if (error) throw error;
      
      if (!value) {
        toast.success('Você poderá reativar a exibição nas configurações do perfil.');
      }
    } catch (error) {
      console.error('Error updating show_goal_modal:', error);
      toast.error('Erro ao atualizar configuração');
    }
  }, [user]);

  const getShowGoalModalPreference = useCallback(async () => {
    if (!user) return true;

    try {
      const { data, error } = await supabase
        .from('weekly_goals')
        .select('show_goal_modal')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data?.show_goal_modal ?? true;
    } catch (error) {
      console.error('Error fetching show_goal_modal:', error);
      return true;
    }
  }, [user]);

  return {
    goals,
    loading,
    newlyCompleted,
    updateGoalProgress,
    checkAndUpdateGoals,
    createGoal,
    dismissCompletionModal,
    refreshGoals: fetchGoals,
    checkShouldShowModal,
    setShowWeeklyGoalModal,
    setShowGoalModal,
    getShowGoalModalPreference
  };
};

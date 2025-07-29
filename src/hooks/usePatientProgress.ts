import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ProgressEntry {
  id: string;
  session_date: string;
  anxiety_level?: number;
  stress_level?: number;
  mood_rating?: number;
  technique_used?: string;
  session_duration?: number;
  notes?: string;
  created_at: string;
}

export interface ProgressStats {
  totalSessions: number;
  averageAnxiety: number;
  averageStress: number;
  averageMood: number;
  totalDuration: number;
  techniquesUsed: string[];
}

export const usePatientProgress = () => {
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchProgress = async (period = '30') => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('patient-progress', {
        body: null,
        method: 'GET',
      });
      
      if (error) throw error;
      
      setProgress(data.progress || []);
      setStats(data.stats || null);
    } catch (error: any) {
      console.error('Error fetching progress:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar progresso',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const recordProgress = async (progressData: {
    anxiety_level?: number;
    stress_level?: number;
    mood_rating?: number;
    technique_used?: string;
    session_duration?: number;
    notes?: string;
  }) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('patient-progress', {
        body: progressData,
      });
      
      if (error) throw error;
      
      toast({
        title: 'Sucesso',
        description: data.message || 'Progresso registrado com sucesso!',
      });
      
      await fetchProgress();
      return data.progress;
    } catch (error: any) {
      console.error('Error recording progress:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao registrar progresso',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, []);

  return {
    progress,
    stats,
    loading,
    fetchProgress,
    recordProgress,
  };
};
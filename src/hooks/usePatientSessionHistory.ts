import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PatientSessionSummary {
  id: string;
  scheduled_at: string;
  session_summary: string | null;
  notes: string | null;
}

/**
 * Past completed sessions the current psychologist had with one specific
 * patient — the only "history across sessions" view a psychologist had
 * before this was scrolling through the whole practice's history table
 * and searching by name.
 */
export const usePatientSessionHistory = () => {
  const [sessions, setSessions] = useState<PatientSessionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchHistory = useCallback(async (patientId: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('appointments')
        .select('id, scheduled_at, session_summary, notes')
        .eq('psychologist_id', user.id)
        .eq('patient_id', patientId)
        .eq('status', 'completed')
        .order('scheduled_at', { ascending: false });

      if (error) throw error;

      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching patient session history:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o histórico do paciente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return { sessions, loading, fetchHistory };
};

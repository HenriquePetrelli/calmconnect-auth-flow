import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getSessionUser } from '@/lib/currentUser';
import { useToast } from '@/hooks/use-toast';
import { loadPrivateNotes } from '@/lib/privateNotes';

export interface PatientSessionSummary {
  id: string;
  scheduled_at: string;
  session_summary: string | null;
  notes: string | null;
  /** Anotação privada do psicólogo (o paciente não vê). */
  private_note?: string | null;
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
      const { data: { user } } = await getSessionUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('appointments')
        .select('id, scheduled_at, session_summary, notes')
        .eq('psychologist_id', user.id)
        .eq('patient_id', patientId)
        .eq('status', 'completed')
        .order('scheduled_at', { ascending: false });

      if (error) throw error;

      const rows = data || [];
      // A anotação privada é opcional na tela: se falhar, mostra o resto.
      const privateNotes = await loadPrivateNotes(rows.map((row) => row.id)).catch(() => ({} as Record<string, string>));
      setSessions(rows.map((row) => ({ ...row, private_note: privateNotes[row.id] ?? null })));
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

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MoodLogEntry {
  /** "YYYY-MM-DD" */
  date: string;
  value: number;
}

const toISODate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Histórico de humor do paciente logado, nos últimos `days` dias. */
export const usePatientMoodHistory = (days = 30) => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<MoodLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabase
        .from('patient_mood_logs')
        .select('mood_value, logged_date')
        .eq('patient_id', user.id)
        .gte('logged_date', toISODate(since))
        .order('logged_date', { ascending: true });

      if (error) throw error;

      setEntries((data ?? []).map((row) => ({ date: row.logged_date, value: row.mood_value })));
    } catch (error) {
      console.error('Erro ao carregar histórico de humor:', error);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [user, days]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const average = entries.length > 0 ? entries.reduce((sum, e) => sum + e.value, 0) / entries.length : null;

  /** Compara a média da primeira metade do período com a segunda, pra indicar uma tendência simples. */
  const trend: 'up' | 'down' | 'stable' | null = (() => {
    if (entries.length < 4) return null;
    const mid = Math.floor(entries.length / 2);
    const firstHalf = entries.slice(0, mid);
    const secondHalf = entries.slice(mid);
    const avg = (list: MoodLogEntry[]) => list.reduce((sum, e) => sum + e.value, 0) / list.length;
    const diff = avg(secondHalf) - avg(firstHalf);
    if (Math.abs(diff) < 0.3) return 'stable';
    return diff > 0 ? 'up' : 'down';
  })();

  return { entries, loading, average, trend, refetch: fetchHistory };
};

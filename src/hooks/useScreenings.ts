import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Instrument, Screening, Severity } from '@/lib/screenings';

const normalize = (row: Record<string, unknown>): Screening => ({
  id: String(row.id),
  instrument: row.instrument as Instrument,
  answers: (row.answers as number[]) ?? [],
  score: Number(row.score ?? 0),
  severity: (row.severity as Severity) ?? 'minimal',
  self_harm_flag: Boolean(row.self_harm_flag),
  shared_with_psychologist: Boolean(row.shared_with_psychologist),
  created_at: String(row.created_at),
});

/** Questionários GAD-7 e PHQ-9 do paciente logado (só ele vê, a não ser que compartilhe). */
export const useScreenings = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<Screening[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    const { data, error: loadError } = await supabase
      .from('mental_health_screenings')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (loadError) {
      console.error('useScreenings: erro ao carregar', loadError);
      setError(true);
    } else {
      setError(false);
      setHistory((data ?? []).map((row) => normalize(row as Record<string, unknown>)));
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  /** Salva as respostas; a pontuação e a faixa vêm do banco. */
  const save = useCallback(
    async (instrument: Instrument, answers: number[]): Promise<Screening> => {
      if (!user?.id) throw new Error('Sem sessão');
      const { data, error: insertError } = await supabase
        .from('mental_health_screenings')
        .insert({ user_id: user.id, instrument, answers })
        .select('*')
        .single();
      if (insertError) throw insertError;
      const saved = normalize(data as Record<string, unknown>);
      setHistory((prev) => [...prev, saved]);
      return saved;
    },
    [user?.id],
  );

  const setShared = useCallback(async (id: string, shared: boolean) => {
    setHistory((prev) => prev.map((s) => (s.id === id ? { ...s, shared_with_psychologist: shared } : s)));
    const { error: updateError } = await supabase
      .from('mental_health_screenings')
      .update({ shared_with_psychologist: shared })
      .eq('id', id);
    if (updateError) {
      await load();
      throw updateError;
    }
  }, [load]);

  return { history, loading, error, reload: load, save, setShared };
};

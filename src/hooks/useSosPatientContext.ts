import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SosPatientSummary {
  full_name: string | null;
  city: string | null;
  state: string | null;
  symptoms: string[] | null;
  last_mood_value: number | null;
  last_mood_date: string | null;
}

export interface SosProgressPoint {
  session_date: string;
  mood_rating: number | null;
  anxiety_level: number | null;
  stress_level: number | null;
}

export interface SosPastRequest {
  id: string;
  created_at: string;
  status: string;
  duration: number | null;
  end_reason: string | null;
}

export interface SosPatientContext {
  patient: SosPatientSummary | null;
  progress: SosProgressPoint[];
  sos_total: number;
  sos_history: SosPastRequest[];
}

/**
 * Aggregated patient context for the psychologist attending an SOS call.
 *
 * Backed by `get_sos_patient_context`, a security-definer function that only
 * answers for the psychologist assigned to that ongoing request — the private
 * journal is never exposed.
 */
export const useSosPatientContext = (requestId: string | null, enabled: boolean) => {
  const [context, setContext] = useState<SosPatientContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!requestId || !enabled) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_sos_patient_context', {
        p_request_id: requestId,
      });
      if (rpcError) throw rpcError;
      setContext((data as unknown as SosPatientContext) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar o contexto do paciente');
    } finally {
      setLoading(false);
    }
  }, [requestId, enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  return { context, loading, error, reload: load };
};

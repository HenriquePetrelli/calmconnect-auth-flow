import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SOS_HISTORY_SELECT, type SosHistoryRow } from '@/lib/sosHistory';

export interface SosMetrics {
  total: number;
  attended: number;
  unattended: number;
  in_flight: number;
  avg_accept_seconds: number;
  avg_duration_seconds: number;
  end_reasons: Record<string, number>;
}

interface Options {
  /** Restrict to a single patient (used on the patient's own history). */
  patientId?: string | null;
  pageSize?: number;
  /** Also load aggregated operational metrics (admin only). */
  withMetrics?: boolean;
  metricsDays?: number;
}

/** Paginated SOS history plus, optionally, the operational metrics summary. */
export const useSosHistory = ({ patientId, pageSize = 10, withMetrics = false, metricsDays = 30 }: Options = {}) => {
  const [rows, setRows] = useState<SosHistoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<SosMetrics | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const from = (page - 1) * pageSize;
      let query = supabase
        .from('emergency_requests')
        .select(SOS_HISTORY_SELECT, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, from + pageSize - 1);

      if (patientId) query = query.eq('patient_id', patientId);

      const { data, count } = await query;
      setRows((data as SosHistoryRow[]) ?? []);
      setTotal(count ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, patientId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!withMetrics) return;
    let active = true;
    (async () => {
      const { data } = await supabase.rpc('get_sos_metrics', { p_days: metricsDays });
      if (active) setMetrics((data as unknown as SosMetrics) ?? null);
    })();
    return () => {
      active = false;
    };
  }, [withMetrics, metricsDays]);

  return {
    rows,
    total,
    page,
    setPage,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    loading,
    metrics,
    reload: load,
  };
};

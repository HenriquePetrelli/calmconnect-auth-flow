import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const FINAL_APPOINTMENT_STATUSES = ['completed', 'cancelled', 'declined', 'no_show'];

export interface PatientEngagementMetrics {
  /** Total de anotações já escritas no diário privado. */
  journalEntriesCount: number;
  /** Total de depoimentos compartilhados em grupos de apoio. */
  supportGroupParticipationCount: number;
  /** % de consultas que já chegaram a um estado final (concluída, cancelada,
   * recusada ou falta) e resultaram em atendimento — null enquanto não há
   * nenhuma consulta finalizada pra calcular uma taxa. */
  appointmentCompletionRate: number | null;
}

const EMPTY_METRICS: PatientEngagementMetrics = {
  journalEntriesCount: 0,
  supportGroupParticipationCount: 0,
  appointmentCompletionRate: null,
};

/** Métricas de engajamento do paciente derivadas de funcionalidades que já
 * existem no app (diário, grupos de apoio, consultas), pra "Meu progresso". */
export const usePatientEngagementMetrics = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<PatientEngagementMetrics>(EMPTY_METRICS);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [journalResult, testimonialsResult, appointmentsResult] = await Promise.all([
        supabase.from('private_journals').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('group_testimonials').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('appointments').select('status').eq('patient_id', user.id),
      ]);

      if (journalResult.error) throw journalResult.error;
      if (testimonialsResult.error) throw testimonialsResult.error;
      if (appointmentsResult.error) throw appointmentsResult.error;

      const finalized = (appointmentsResult.data ?? []).filter((a) =>
        FINAL_APPOINTMENT_STATUSES.includes(a.status)
      );
      const completed = finalized.filter((a) => a.status === 'completed').length;

      setMetrics({
        journalEntriesCount: journalResult.count ?? 0,
        supportGroupParticipationCount: testimonialsResult.count ?? 0,
        appointmentCompletionRate: finalized.length > 0 ? Math.round((completed / finalized.length) * 100) : null,
      });
    } catch (error) {
      console.error('Erro ao carregar métricas de engajamento:', error);
      setMetrics(EMPTY_METRICS);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchMetrics();
  }, [fetchMetrics]);

  return { ...metrics, loading, refetch: fetchMetrics };
};

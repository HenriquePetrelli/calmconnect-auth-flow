import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface VacationPeriod {
  id: string;
  /** "YYYY-MM-DD" */
  start_date: string;
  /** "YYYY-MM-DD" */
  end_date: string;
}

export const toISODate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/**
 * Períodos de férias (intervalo de datas totalmente indisponível) do
 * psicólogo logado. O horário-padrão e as exceções pontuais continuam
 * salvos normalmente — férias só "desliga" a agenda nesse intervalo.
 */
export const usePsychologistVacation = () => {
  const { user } = useAuth();
  const [vacations, setVacations] = useState<VacationPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchVacations = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('psychologist_vacations')
        .select('id, start_date, end_date')
        .eq('psychologist_id', user.id)
        .order('start_date', { ascending: true });

      if (error) throw error;
      setVacations(data ?? []);
    } catch (error) {
      console.error('Erro ao carregar férias:', error);
      toast({ title: 'Erro', description: 'Erro ao carregar suas férias', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    void fetchVacations();
  }, [fetchVacations]);

  const today = toISODate(new Date());
  const activeVacation = vacations.find((v) => v.start_date <= today && today <= v.end_date) ?? null;
  const upcomingVacation = vacations.find((v) => v.start_date > today) ?? null;

  /** Agenda um novo período de férias, substituindo qualquer férias ativa/futura ainda não encerrada. */
  const setVacation = async (startDate: string, endDate: string): Promise<boolean> => {
    if (!user) return false;
    if (!startDate || !endDate || startDate > endDate) {
      toast({
        title: 'Datas inválidas',
        description: 'A data de início deve ser antes ou igual à data de término.',
        variant: 'destructive',
      });
      return false;
    }
    setSaving(true);
    try {
      const staleIds = vacations.filter((v) => v.end_date >= today).map((v) => v.id);
      if (staleIds.length > 0) {
        const { error: deleteError } = await supabase.from('psychologist_vacations').delete().in('id', staleIds);
        if (deleteError) throw deleteError;
      }
      const { error } = await supabase
        .from('psychologist_vacations')
        .insert({ psychologist_id: user.id, start_date: startDate, end_date: endDate });
      if (error) throw error;

      toast({ title: 'Férias agendadas', description: 'Sua agenda ficará indisponível nesse período.' });
      await fetchVacations();
      return true;
    } catch (error: any) {
      console.error('Erro ao salvar férias:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Não foi possível salvar suas férias. Tente novamente.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  /** Cancela a férias ativa ou futura (a que ainda não terminou). Não mexe em férias já passadas. */
  const cancelVacation = async (): Promise<boolean> => {
    if (!user) return false;
    const staleIds = vacations.filter((v) => v.end_date >= today).map((v) => v.id);
    if (staleIds.length === 0) return true;

    setSaving(true);
    try {
      const { error } = await supabase.from('psychologist_vacations').delete().in('id', staleIds);
      if (error) throw error;

      toast({ title: 'Férias canceladas', description: 'Sua agenda voltou ao normal.' });
      await fetchVacations();
      return true;
    } catch (error: any) {
      console.error('Erro ao cancelar férias:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível cancelar as férias. Tente novamente.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    vacations,
    activeVacation,
    upcomingVacation,
    loading,
    saving,
    setVacation,
    cancelVacation,
    refetch: fetchVacations,
  };
};

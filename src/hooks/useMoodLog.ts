import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { usePatientStatistics } from '@/hooks/usePatientStatistics';

const toISODate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/**
 * Registra o check-in de humor do dia: atualiza o agregado histórico em
 * `patients` (usado pela tela inicial para saber se já respondeu hoje) e
 * grava/atualiza a entrada de `patient_mood_logs` do dia (histórico real,
 * usado para o gráfico de evolução do humor). Também conta como atividade
 * para as metas semanais da categoria "mood".
 */
export const useMoodLog = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addActivity } = usePatientStatistics();
  const [saving, setSaving] = useState(false);

  const logMood = async (value: number): Promise<boolean> => {
    if (!user) return false;
    setSaving(true);
    try {
      const today = toISODate(new Date());
      const { data: patientData, error: fetchError } = await supabase
        .from('patients')
        .select('daily_mood_count, daily_mood_sum, last_mood_date, last_mood_value')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const isNewDay = !patientData?.last_mood_date || patientData.last_mood_date !== today;
      let newCount: number;
      let newSum: number;
      if (isNewDay) {
        newCount = (patientData?.daily_mood_count || 0) + 1;
        newSum = (patientData?.daily_mood_sum || 0) + value;
      } else {
        const previousValue = patientData?.last_mood_value || 0;
        newCount = patientData?.daily_mood_count || 1;
        newSum = (patientData?.daily_mood_sum || 0) - previousValue + value;
      }

      const { error: updateError } = await supabase
        .from('patients')
        .update({
          daily_mood_count: newCount,
          daily_mood_sum: newSum,
          last_mood_date: today,
          last_mood_value: value,
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      const { error: logError } = await supabase
        .from('patient_mood_logs')
        .upsert(
          { patient_id: user.id, mood_value: value, logged_date: today },
          { onConflict: 'patient_id,logged_date' }
        );

      if (logError) throw logError;

      await addActivity('Registro de Humor');
      return true;
    } catch (error: any) {
      console.error('Erro ao registrar humor:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar seu humor. Tente novamente.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { logMood, saving };
};

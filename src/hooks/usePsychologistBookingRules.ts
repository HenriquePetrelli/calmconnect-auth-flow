import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getFriendlyErrorMessage } from '@/utils/errorMessage';
import { DEFAULT_BOOKING_RULES, normalizeRules, type BookingRules } from '@/lib/bookingRules';

/** The logged-in psychologist's own booking rules. */
export const usePsychologistBookingRules = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rules, setRules] = useState<BookingRules>(DEFAULT_BOOKING_RULES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('psychologist_booking_rules')
      .select('buffer_minutes, min_notice_hours, max_advance_days')
      .eq('psychologist_id', user.id)
      .maybeSingle();
    setRules(normalizeRules(data));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (next: BookingRules): Promise<boolean> => {
    if (!user) return false;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('psychologist_booking_rules')
        .upsert({ psychologist_id: user.id, ...next }, { onConflict: 'psychologist_id' });
      if (error) throw error;
      setRules(next);
      toast({ title: 'Regras de agendamento salvas' });
      return true;
    } catch (error) {
      console.error('Erro ao salvar regras de agendamento:', error);
      toast({
        title: 'Não foi possível salvar',
        description: getFriendlyErrorMessage(error, 'Tente de novo em instantes.'),
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { rules, loading, saving, save };
};

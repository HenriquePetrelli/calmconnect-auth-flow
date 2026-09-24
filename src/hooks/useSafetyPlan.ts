import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getFriendlyErrorMessage } from '@/utils/errorMessage';
import { emptySafetyPlan, type SafetyPlanLists } from '@/lib/safetyPlan';

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string | null;
  phone: string;
  is_primary: boolean;
}

export type NewEmergencyContact = Omit<EmergencyContact, 'id'>;

/** The logged-in patient's own safety plan and emergency contacts. */
export const useSafetyPlan = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [plan, setPlan] = useState<SafetyPlanLists>(emptySafetyPlan());
  const [hasPlan, setHasPlan] = useState(false);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [{ data: planRow, error: planError }, { data: contactRows, error: contactsError }] = await Promise.all([
        supabase
          .from('safety_plans')
          .select('warning_signs, coping_strategies, distractions, safe_environment, reasons_to_live')
          .eq('patient_id', user.id)
          .maybeSingle(),
        supabase
          .from('emergency_contacts')
          .select('id, name, relationship, phone, is_primary')
          .eq('patient_id', user.id)
          .order('is_primary', { ascending: false })
          .order('created_at', { ascending: true }),
      ]);
      if (planError) throw planError;
      if (contactsError) throw contactsError;

      setHasPlan(Boolean(planRow));
      setPlan(planRow ? { ...emptySafetyPlan(), ...planRow } : emptySafetyPlan());
      setContacts(contactRows ?? []);
    } catch (error) {
      console.error('Erro ao carregar plano de segurança:', error);
      toast({
        title: 'Não foi possível carregar seu plano',
        description: 'Verifique sua conexão e tente de novo.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const savePlan = async (next: SafetyPlanLists): Promise<boolean> => {
    if (!user) return false;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('safety_plans')
        .upsert({ patient_id: user.id, ...next }, { onConflict: 'patient_id' });
      if (error) throw error;
      setPlan(next);
      setHasPlan(true);
      return true;
    } catch (error) {
      console.error('Erro ao salvar plano de segurança:', error);
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

  const addContact = async (contact: NewEmergencyContact): Promise<boolean> => {
    if (!user) return false;
    setSaving(true);
    try {
      // Only one primary contact: demote the others first.
      if (contact.is_primary) {
        const { error: demoteError } = await supabase
          .from('emergency_contacts')
          .update({ is_primary: false })
          .eq('patient_id', user.id);
        if (demoteError) throw demoteError;
      }
      const { error } = await supabase.from('emergency_contacts').insert({ patient_id: user.id, ...contact });
      if (error) throw error;
      await load();
      return true;
    } catch (error) {
      console.error('Erro ao adicionar contato:', error);
      toast({
        title: 'Não foi possível adicionar o contato',
        description: getFriendlyErrorMessage(error, 'Confira o telefone e tente de novo.'),
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const removeContact = async (contactId: string): Promise<boolean> => {
    setSaving(true);
    try {
      const { error } = await supabase.from('emergency_contacts').delete().eq('id', contactId);
      if (error) throw error;
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
      return true;
    } catch (error) {
      console.error('Erro ao remover contato:', error);
      toast({
        title: 'Não foi possível remover o contato',
        description: getFriendlyErrorMessage(error, 'Tente de novo em instantes.'),
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { plan, hasPlan, contacts, loading, saving, savePlan, addContact, removeContact, reload: load };
};

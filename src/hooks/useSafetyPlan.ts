import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getFriendlyErrorMessage } from '@/utils/errorMessage';
import { emptySafetyPlan, type SafetyPlanLists } from '@/lib/safetyPlan';

export interface EmergencyContact {
  name: string;
  relationship: string | null;
  phone: string;
  is_primary: boolean;
}

export interface SafetyPlanSummary {
  id: string;
  title: string;
  updated_at: string;
}

/** The logged-in patient's safety plans (titles only), for the list screen. */
export const useSafetyPlans = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<SafetyPlanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('safety_plans')
        .select('id, title, updated_at')
        .eq('patient_id', user.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setPlans(data ?? []);
    } catch (error) {
      console.error('Erro ao carregar planos de segurança:', error);
      toast({
        title: 'Não foi possível carregar seus planos',
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

  /** Deletes a plan; its emergency contacts go with it (ON DELETE CASCADE). */
  const deletePlan = async (planId: string): Promise<boolean> => {
    setDeletingId(planId);
    try {
      const { error } = await supabase.from('safety_plans').delete().eq('id', planId);
      if (error) throw error;
      setPlans((prev) => prev.filter((p) => p.id !== planId));
      toast({ title: 'Plano excluído' });
      return true;
    } catch (error) {
      console.error('Erro ao excluir plano de segurança:', error);
      toast({
        title: 'Não foi possível excluir o plano',
        description: getFriendlyErrorMessage(error, 'Tente de novo em instantes.'),
        variant: 'destructive',
      });
      return false;
    } finally {
      setDeletingId(null);
    }
  };

  return { plans, loading, deletingId, deletePlan, reload: load };
};

export interface SafetyPlanDraft {
  title: string;
  lists: SafetyPlanLists;
  contacts: EmergencyContact[];
}

/**
 * One safety plan being created (`planId` null) or edited. Everything —
 * title, lists and contacts — lives in a local draft and is written in a
 * single call to save_safety_plan, so nothing on screen is lost or saved
 * halfway.
 */
export const useSafetyPlan = (planId: string | null) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [initial, setInitial] = useState<SafetyPlanDraft>({ title: '', lists: emptySafetyPlan(), contacts: [] });
  const [planCount, setPlanCount] = useState(0);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { count } = await supabase
          .from('safety_plans')
          .select('id', { count: 'exact', head: true })
          .eq('patient_id', user.id);
        if (!cancelled) setPlanCount(count ?? 0);

        if (planId) {
          const [{ data: plan, error: planError }, { data: contacts, error: contactsError }] = await Promise.all([
            supabase
              .from('safety_plans')
              .select('title, warning_signs, coping_strategies, distractions, safe_environment, reasons_to_live')
              .eq('id', planId)
              .maybeSingle(),
            supabase
              .from('emergency_contacts')
              .select('name, relationship, phone, is_primary')
              .eq('plan_id', planId)
              .order('is_primary', { ascending: false })
              .order('created_at', { ascending: true }),
          ]);
          if (planError) throw planError;
          if (contactsError) throw contactsError;
          if (cancelled) return;
          if (!plan) {
            setNotFound(true);
            return;
          }
          const { title, ...lists } = plan;
          setInitial({
            title,
            lists: { ...emptySafetyPlan(), ...lists },
            contacts: (contacts ?? []).map(({ name, relationship, phone, is_primary }) => ({
              name,
              relationship,
              phone,
              is_primary,
            })),
          });
        }
      } catch (error) {
        console.error('Erro ao carregar plano de segurança:', error);
        if (!cancelled) {
          toast({
            title: 'Não foi possível carregar o plano',
            description: 'Verifique sua conexão e tente de novo.',
            variant: 'destructive',
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, planId, toast]);

  /** Saves the whole draft; resolves with the plan id, or null on failure. */
  const save = async (draft: SafetyPlanDraft): Promise<string | null> => {
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('save_safety_plan', {
        p_plan_id: planId,
        p_title: draft.title.trim(),
        p_warning_signs: draft.lists.warning_signs,
        p_coping_strategies: draft.lists.coping_strategies,
        p_distractions: draft.lists.distractions,
        p_safe_environment: draft.lists.safe_environment,
        p_reasons_to_live: draft.lists.reasons_to_live,
        p_contacts: draft.contacts.map((c) => ({ ...c })),
      });
      if (error) throw error;
      setInitial(draft);
      return data;
    } catch (error) {
      console.error('Erro ao salvar plano de segurança:', error);
      toast({
        title: 'Não foi possível salvar',
        description: getFriendlyErrorMessage(error, 'Tente de novo em instantes.'),
        variant: 'destructive',
      });
      return null;
    } finally {
      setSaving(false);
    }
  };

  return { initial, planCount, notFound, loading, saving, save };
};

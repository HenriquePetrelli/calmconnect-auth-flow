import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getFriendlyErrorMessage } from '@/utils/errorMessage';
import { emptySafetyPlan, type SafetyPlanLists } from '@/lib/safetyPlan';

/**
 * O plano é para a hora da crise, quando a internet pode faltar: a última
 * versão aberta fica guardada no aparelho e é mostrada se o servidor não
 * responder. Sai do aparelho ao sair da conta (AuthContext).
 */
export const SAFETY_PLAN_CACHE_PREFIX = 'plano:';
const listKey = (userId: string) => `${SAFETY_PLAN_CACHE_PREFIX}${userId}:lista`;
const planKey = (userId: string, planId: string) => `${SAFETY_PLAN_CACHE_PREFIX}${userId}:${planId}`;

const readCache = <T,>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};
const writeCache = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sem armazenamento: segue só online */
  }
};
const dropCache = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch {
    /* noop */
  }
};

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
  /** Mostrando a cópia guardada no aparelho (sem internet). */
  const [offline, setOffline] = useState(false);
  /** Não carregou e não há cópia no aparelho. */
  const [failed, setFailed] = useState(false);

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
      setOffline(false);
      setFailed(false);
      writeCache(listKey(user.id), data ?? []);
    } catch (error) {
      console.error('Erro ao carregar planos de segurança:', error);
      const cached = readCache<SafetyPlanSummary[]>(listKey(user.id));
      if (cached) {
        setPlans(cached);
        setOffline(true);
        return;
      }
      setFailed(true);
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
      setPlans((prev) => {
        const next = prev.filter((p) => p.id !== planId);
        if (user) writeCache(listKey(user.id), next);
        return next;
      });
      if (user) dropCache(planKey(user.id, planId));
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

  return { plans, loading, offline, failed, deletingId, deletePlan, reload: load };
};

export interface SafetyPlanDraft {
  title: string;
  lists: SafetyPlanLists;
  contacts: EmergencyContact[];
}

interface CachedPlan extends SafetyPlanDraft {
  updated_at: string | null;
}

/** Erro de "alterado em outro aparelho" (o banco recusou para não sobrescrever). */
export const isPlanConflict = (error: unknown) => (error as { code?: string } | null)?.code === '40001';

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
  /** Versão aberta (updated_at): o banco recusa salvar por cima de uma mais nova. */
  const [version, setVersion] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  /**
   * Plano novo: id gerado no aparelho, o mesmo em todas as tentativas (até
   * recarregando a página), para uma resposta perdida não virar plano em dobro.
   */
  const [newId] = useState<string | null>(() => {
    if (planId || !user || typeof crypto === 'undefined' || typeof crypto.randomUUID !== 'function') return null;
    const key = `${SAFETY_PLAN_CACHE_PREFIX}${user.id}:novo-id`;
    const saved = readCache<string>(key);
    if (saved) return saved;
    const id = crypto.randomUUID();
    writeCache(key, id);
    return id;
  });

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
              .select('title, warning_signs, coping_strategies, distractions, safe_environment, reasons_to_live, updated_at')
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
          const { title, updated_at, ...lists } = plan;
          const loaded: SafetyPlanDraft = {
            title,
            lists: { ...emptySafetyPlan(), ...lists },
            contacts: (contacts ?? []).map(({ name, relationship, phone, is_primary }) => ({
              name,
              relationship,
              phone,
              is_primary,
            })),
          };
          setInitial(loaded);
          setVersion(updated_at ?? null);
          setOffline(false);
          writeCache(planKey(user.id, planId), { ...loaded, updated_at: updated_at ?? null } satisfies CachedPlan);
        }
      } catch (error) {
        console.error('Erro ao carregar plano de segurança:', error);
        // Sem internet: a última versão guardada no aparelho.
        const cached = planId ? readCache<CachedPlan>(planKey(user.id, planId)) : null;
        if (cached && !cancelled) {
          setInitial({ title: cached.title, lists: { ...emptySafetyPlan(), ...cached.lists }, contacts: cached.contacts ?? [] });
          setVersion(cached.updated_at);
          setOffline(true);
          return;
        }
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
        p_new_id: planId ? null : newId,
        p_expected_updated_at: planId ? version : null,
      } as never);
      if (error) throw error;
      setInitial(draft);
      if (user && !planId) dropCache(`${SAFETY_PLAN_CACHE_PREFIX}${user.id}:novo-id`);
      if (user && data) {
        // A cópia do aparelho fica com o que acabou de ser salvo.
        writeCache(planKey(user.id, data as string), { ...draft, updated_at: new Date().toISOString() } satisfies CachedPlan);
      }
      return data as string;
    } catch (error) {
      console.error('Erro ao salvar plano de segurança:', error);
      toast({
        title: isPlanConflict(error) ? 'O plano mudou em outro aparelho' : 'Não foi possível salvar',
        description: isPlanConflict(error)
          ? 'Para não apagar o que foi salvo lá, nada foi gravado. Abra o plano de novo e refaça a alteração.'
          : getFriendlyErrorMessage(error, 'Suas alterações continuam na tela. Tente de novo em instantes.'),
        variant: 'destructive',
      });
      return null;
    } finally {
      setSaving(false);
    }
  };

  return { initial, planCount, notFound, loading, saving, offline, save };
};

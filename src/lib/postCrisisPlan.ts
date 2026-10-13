import { supabase } from '@/integrations/supabase/client';
import { emptySafetyPlan, SAFETY_PLAN_SECTIONS, type SafetyPlanLists } from '@/lib/safetyPlan';

/**
 * Plano pós-crise: o psicólogo preenche, durante o atendimento (SOS ou
 * consulta), o mesmo formulário do plano de segurança do paciente, sem os
 * contatos. O paciente só recebe quando o atendimento termina e decide se salva.
 */
export type PostCrisisSourceType = 'sos' | 'appointment';

export interface PostCrisisPlan {
  id: string;
  title: string;
  lists: SafetyPlanLists;
  /** Já chegou ao paciente (o atendimento terminou). */
  delivered: boolean;
  /** O psicólogo ainda pode alterar (até 2 h depois do fim e antes de o paciente decidir). */
  editable: boolean;
}

export interface SafetyPlanSuggestion {
  id: string;
  title: string;
  lists: SafetyPlanLists;
  psychologistName: string;
  sourceType: PostCrisisSourceType;
  deliveredAt: string | null;
}

export const DEFAULT_POST_CRISIS_TITLE = 'Plano pós-crise';

type ListRow = { [K in keyof SafetyPlanLists]: string[] | null };

export const listsFromRow = (row: ListRow): SafetyPlanLists => {
  const lists = emptySafetyPlan();
  for (const section of SAFETY_PLAN_SECTIONS) lists[section.key] = row[section.key] ?? [];
  return lists;
};

export const countPlanItems = (lists: SafetyPlanLists) =>
  SAFETY_PLAN_SECTIONS.reduce((total, s) => total + lists[s.key].length, 0);

const listArgs = (lists: SafetyPlanLists) => ({
  p_warning_signs: lists.warning_signs,
  p_coping_strategies: lists.coping_strategies,
  p_distractions: lists.distractions,
  p_safe_environment: lists.safe_environment,
  p_reasons_to_live: lists.reasons_to_live,
});

/** O plano que este psicólogo deixou neste atendimento (ou null). */
export const fetchPostCrisisPlan = async (
  sourceType: PostCrisisSourceType,
  sourceId: string,
): Promise<PostCrisisPlan | null> => {
  const { data, error } = await supabase.rpc('get_post_crisis_plan', {
    p_source_type: sourceType,
    p_source_id: sourceId,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    lists: listsFromRow(row),
    delivered: Boolean(row.delivered),
    editable: Boolean(row.editable),
  };
};

export const savePostCrisisPlan = async (
  sourceType: PostCrisisSourceType,
  sourceId: string,
  title: string,
  lists: SafetyPlanLists,
) => {
  const { data, error } = await supabase.rpc('save_post_crisis_plan', {
    p_source_type: sourceType,
    p_source_id: sourceId,
    p_title: title.trim() || DEFAULT_POST_CRISIS_TITLE,
    ...listArgs(lists),
  });
  if (error) throw error;
  return data as string;
};

/** Recomendações entregues ao paciente que ainda esperam uma decisão. */
export const fetchPendingSuggestions = async (patientId: string): Promise<SafetyPlanSuggestion[]> => {
  const { data, error } = await supabase
    .from('safety_plan_suggestions')
    .select('id, title, warning_signs, coping_strategies, distractions, safe_environment, reasons_to_live, psychologist_name, source_type, delivered_at')
    .eq('patient_id', patientId)
    .eq('status', 'pending')
    .order('delivered_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    lists: listsFromRow(row),
    psychologistName: row.psychologist_name,
    sourceType: row.source_type as PostCrisisSourceType,
    deliveredAt: row.delivered_at,
  }));
};

/**
 * Salva a recomendação nos planos do paciente. Com `edited`, salva a versão
 * que o paciente ajustou. Com `replacePlanId`, exclui esse plano antes (limite
 * de 10 planos).
 */
export const acceptSuggestion = async (
  suggestionId: string,
  options: { replacePlanId?: string | null; edited?: { title: string; lists: SafetyPlanLists } } = {},
) => {
  const { data, error } = await supabase.rpc('accept_safety_plan_suggestion', {
    p_suggestion_id: suggestionId,
    ...(options.replacePlanId ? { p_replace_plan_id: options.replacePlanId } : {}),
    ...(options.edited ? { p_title: options.edited.title, ...listArgs(options.edited.lists) } : {}),
  });
  if (error) throw error;
  return data as string;
};

export const dismissSuggestion = async (suggestionId: string) => {
  const { error } = await supabase.rpc('dismiss_safety_plan_suggestion', { p_suggestion_id: suggestionId });
  if (error) throw error;
};

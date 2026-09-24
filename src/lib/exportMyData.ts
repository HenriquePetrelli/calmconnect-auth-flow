import { supabase } from '@/integrations/supabase/client';

/**
 * Everything the patient owns that RLS lets them read, as one JSON document —
 * the portability right (LGPD art. 18, V). Runs with the patient's own
 * session, so it can never include anyone else's data.
 */
const SOURCES: { table: string; column: string; label: string }[] = [
  { table: 'profiles', column: 'user_id', label: 'perfil' },
  { table: 'patients', column: 'user_id', label: 'cadastro' },
  { table: 'patient_mood_logs', column: 'patient_id', label: 'humor' },
  { table: 'private_journals', column: 'user_id', label: 'diario' },
  { table: 'safety_plans', column: 'patient_id', label: 'plano_de_seguranca' },
  { table: 'emergency_contacts', column: 'patient_id', label: 'contatos_de_emergencia' },
  { table: 'patient_weekly_goals', column: 'user_id', label: 'metas_semanais' },
  { table: 'patient_achievements', column: 'user_id', label: 'conquistas' },
  { table: 'patient_statistics', column: 'patient_id', label: 'estatisticas' },
  { table: 'group_testimonials', column: 'user_id', label: 'depoimentos' },
  { table: 'group_favorites', column: 'user_id', label: 'grupos_favoritos' },
  { table: 'appointments', column: 'patient_id', label: 'consultas' },
  { table: 'emergency_requests', column: 'patient_id', label: 'pedidos_de_sos' },
  { table: 'session_feedback', column: 'user_id', label: 'avaliacoes' },
  { table: 'notifications', column: 'patient_id', label: 'notificacoes' },
  { table: 'subscribers', column: 'user_id', label: 'assinatura' },
  { table: 'user_preferences', column: 'user_id', label: 'preferencias' },
];

export async function collectMyData(userId: string, email: string | null) {
  const data: Record<string, unknown> = {};
  const unavailable: string[] = [];

  await Promise.all(
    SOURCES.map(async ({ table, column, label }) => {
      // Tables vary per environment; untyped access keeps one list for all.
      const { data: rows, error } = await (supabase.from as (t: string) => ReturnType<typeof supabase.from>)(table)
        .select('*')
        .eq(column, userId);
      if (error) unavailable.push(label);
      else data[label] = rows ?? [];
    })
  );

  return {
    gerado_em: new Date().toISOString(),
    titular: { id: userId, email },
    dados: data,
    ...(unavailable.length > 0 ? { nao_exportado: unavailable.sort() } : {}),
  };
}

export function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

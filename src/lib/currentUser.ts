import { supabase } from '@/integrations/supabase/client';

/**
 * Id de quem está logado, lido da sessão local — sem ida ao servidor de
 * autenticação como `auth.getUser()`. Para filtrar consultas basta: quem
 * garante o acesso é a RLS no banco, que valida o token de verdade. Use em
 * rotinas que rodam várias vezes (polling, realtime).
 */
export const getSessionUserId = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
};

/**
 * Mesmo formato de `supabase.auth.getUser()`, mas lido da sessão local, sem ida
 * ao servidor. `getUser()` segura o login do app enquanto espera a resposta, e
 * as outras buscas da tela ficavam paradas atrás dele. Ficam de fora só os
 * pontos que precisam confirmar no servidor (excluir conta, validar sessão).
 */
export const getSessionUser = async () => {
  const { data } = await supabase.auth.getSession();
  return { data: { user: data.session?.user ?? null }, error: null };
};

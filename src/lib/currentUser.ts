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

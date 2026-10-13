import { supabase } from '@/integrations/supabase/client';

/** Rota da tela do código de verificação do admin. */
export const ADMIN_MFA_PATH = '/admin/verificacao';

/**
 * True se a sessão já passou pela verificação em duas etapas (nível "aal2").
 * O banco e as funções de admin só aceitam o admin com esse nível; com a
 * senha sozinha (aal1), a conta não acessa nada do painel.
 */
export const hasAdminMfaSession = async (): Promise<boolean> => {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) return false;
  return data?.currentLevel === 'aal2';
};

export const mfaErrorMessage = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String((error as { message?: unknown })?.message ?? '');
  if (/invalid|expired|code/i.test(message)) {
    return 'Código inválido ou expirado. Confira se o horário do celular está certo e digite o código que aparece agora.';
  }
  if (/rate|too many/i.test(message)) return 'Muitas tentativas. Espere um minuto e tente de novo.';
  return 'Não foi possível confirmar agora. Tente de novo.';
};

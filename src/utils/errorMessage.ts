/**
 * Turns a caught error into a short, actionable, Portuguese message safe to
 * show a user — never a raw Supabase/Postgres/network string. Known
 * technical patterns map to a specific friendly message; anything else
 * (including our own short, already-Portuguese business messages thrown by
 * edge functions, e.g. "CPF inválido...") passes through as-is only when it
 * looks like it was written for a person, not a stack trace.
 */
export const getFriendlyErrorMessage = (error: unknown, fallback: string): string => {
  const raw = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  if (!raw) return fallback;

  const message = raw.toLowerCase();

  if (message.includes('failed to fetch') || message.includes('networkerror') || message.includes('network request failed')) {
    return 'Sem conexão com a internet. Verifique sua rede e tente novamente.';
  }
  if (message.includes('timeout') || message.includes('timed out')) {
    return 'A operação demorou demais. Tente novamente.';
  }
  if (message.includes('jwt') || message.includes('token') && message.includes('expired')) {
    return 'Sua sessão expirou. Faça login novamente.';
  }
  if (message.includes('rate limit') || message.includes('muitas tentativas') || message.includes('muitas solicitações')) {
    return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos.';
  }
  if (message.includes('violates row-level security') || message.includes('permission denied')) {
    return 'Você não tem permissão para fazer isso.';
  }
  if (message.includes('duplicate key') || message.includes('already exists') || message.includes('already registered')) {
    return 'Esse registro já existe.';
  }
  if (message.includes('violates foreign key') || message.includes('violates check constraint')) {
    return 'Não foi possível concluir — verifique os dados informados.';
  }
  if (/^\d{3}:/.test(raw) || message.includes('non-2xx status code') || message.includes('edge function returned')) {
    return fallback;
  }

  // A short, already-Portuguese sentence is almost certainly a message we
  // ourselves crafted for the user (edge function business errors, form
  // validation) — safe to show as-is. Anything longer, or written in
  // English/technical jargon, is very likely a raw driver/runtime error.
  const looksHandWritten = raw.length <= 140 && /[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]|[.!?]$/.test(raw) && !/^[A-Z][a-zA-Z]*Error:/.test(raw);
  if (looksHandWritten) return raw;

  return fallback;
};

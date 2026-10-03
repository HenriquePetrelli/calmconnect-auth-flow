// Proteções comuns das edge functions.
//
// Rotinas agendadas (pg_cron): o job chama a função com a chave anônima, que é
// pública (está no app). Antes, quem tivesse essa chave conseguia disparar
// lembretes em massa, recusar consultas pendentes, limpar dados... Agora o
// job manda o cabeçalho x-cron-secret, cujo valor fica numa tabela que só o
// banco lê (public.internal_secrets, sem política de RLS), e a função confere
// esse valor pela RPC internal_cron_secret(), que só a service role executa.
// Também aceita a própria service role (chamada de uma função para outra) e,
// se configurado, o secret CRON_SECRET das edge functions.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";

let cachedSecret: { value: string | null; at: number } | null = null;

const serviceClient = () =>
  createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
    auth: { persistSession: false },
  });

/** Comparação em tempo constante (não vaza o tamanho do prefixo certo). */
export const safeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

const databaseCronSecret = async (): Promise<string | null> => {
  if (cachedSecret && Date.now() - cachedSecret.at < 5 * 60 * 1000) return cachedSecret.value;
  const { data, error } = await serviceClient().rpc("internal_cron_secret");
  const value = error ? null : ((data as string | null) ?? null);
  cachedSecret = { value, at: Date.now() };
  return value;
};

/** True quando quem chama é o pg_cron (ou outra função com a service role). */
export const isTrustedCaller = async (req: Request): Promise<boolean> => {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (serviceKey && bearer && safeEqual(bearer, serviceKey)) return true;

  const sent = req.headers.get("x-cron-secret");
  if (!sent) return false;
  const envSecret = Deno.env.get("CRON_SECRET");
  if (envSecret && safeEqual(sent, envSecret)) return true;
  const dbSecret = await databaseCronSecret();
  return Boolean(dbSecret) && safeEqual(sent, dbSecret as string);
};

export const unauthorized = (corsHeaders: Record<string, string> = {}) =>
  new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/**
 * Limite de chamadas repetidas por usuário (tabela de rate limit do banco).
 * Se o banco não responder, deixa passar: o limite protege contra abuso, não
 * pode derrubar o app.
 */
export const withinRateLimit = async (key: string, maxRequests: number, windowSeconds: number): Promise<boolean> => {
  const { data, error } = await serviceClient().rpc("check_rate_limit", {
    p_key: key,
    p_max_requests: maxRequests,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("check_rate_limit falhou", error.message);
    return true;
  }
  return data !== false;
};

export const tooManyRequests = (corsHeaders: Record<string, string> = {}) =>
  new Response(
    JSON.stringify({ error: "Muitas tentativas em pouco tempo. Aguarde um pouco e tente de novo." }),
    { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" } },
  );

/** Escapa texto do usuário antes de colocar em HTML (e-mails). */
export const escapeHtml = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const EMAIL_RE = /^[^\s@<>"']{1,64}@[^\s@<>"']{1,255}\.[^\s@<>"']{2,}$/;

/** E-mail com formato plausível e sem caracteres de HTML. */
export const isValidEmail = (value: unknown): value is string =>
  typeof value === "string" && value.length <= 254 && EMAIL_RE.test(value);

/** Texto obrigatório (ou opcional) com tamanho máximo. */
export const isBoundedText = (value: unknown, max: number, required = true): boolean =>
  value === undefined || value === null || value === ""
    ? !required
    : typeof value === "string" && value.trim().length > 0 && value.length <= max;

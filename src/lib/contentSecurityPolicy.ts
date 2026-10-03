/**
 * Política de segurança de conteúdo (CSP) do app publicado. O navegador só
 * executa scripts do próprio app e só conversa com o Supabase e o Firebase:
 * se alguém conseguir injetar HTML (XSS), o script injetado não roda e não
 * consegue mandar o login da pessoa para fora.
 *
 * Só no build de produção (o servidor de desenvolvimento usa scripts inline).
 */

// Hash do onload="this.media='all'" que carrega a fonte sem travar a página.
const FONT_ONLOAD_HASH = "'sha256-MhtPZXr7+LpJUY5qtMutB+qWfQtMaPccfe7QXtCcEYc='";

export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-hashes' ${FONT_ONLOAD_HASH}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.googleapis.com",
  "frame-src 'self' blob: https://*.supabase.co",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

// Verificação em duas etapas do admin.
//
// O login com senha dá um token de nível "aal1"; depois do código do app
// autenticador, o token passa a "aal2". As ações de admin só valem com aal2:
// senha vazada sozinha não basta para mexer em contas, repasses e documentos.
//
// Use só depois de validar o token com supabase.auth.getUser(token): aqui o
// conteúdo do token é apenas lido, não conferido.

/** Nível de autenticação do token ("aal1", "aal2") ou null se não der para ler. */
export const tokenAal = (authHeader: string | null | undefined): string | null => {
  const token = (authHeader ?? "").replace(/^Bearer\s+/i, "");
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const claims = JSON.parse(atob(base64)) as { aal?: unknown };
    return typeof claims.aal === "string" ? claims.aal : null;
  } catch {
    return null;
  }
};

/** True se o admin confirmou o código de verificação nesta sessão. */
export const adminMfaOk = (authHeader: string | null | undefined): boolean => tokenAal(authHeader) === "aal2";

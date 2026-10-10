import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isTrustedCaller } from "../_shared/guards.ts";
import { firebaseServiceAccount, getAccessToken, sendToTokens } from "../_shared/fcm.ts";

// Envia para o celular as notificações do app marcadas com `push` (consultas:
// nova solicitação, confirmação, recusa, remarcação, cancelamento e lembretes
// de 24h/1h; chat: nova mensagem). Chamada pelo pg_cron a cada minuto.
//
// Quem decide o que enviar é claim_pending_pushes(): reserva as pendentes da
// última hora por 5 min (chamadas repetidas não mandam nada em dobro). No fim,
// finish_pushes() confirma as que saíram e devolve à fila as que falharam por
// um problema passageiro (até 3 tentativas): antes o aviso era dado como
// enviado antes de ir ao Firebase e, se ele falhasse, o push sumia.
//
// O texto do push é o discreto (push_text) quando o aviso tem um: na tela
// bloqueada não aparece com quem a pessoa conversa nem que pediu SOS.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

interface PendingPush {
  id: string;
  user_id: string;
  title: string;
  message: string;
  link: string | null;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  // Só o pg_cron (x-cron-secret) ou outra função (service role).
  if (!(await isTrustedCaller(req))) return json({ error: "Unauthorized" }, 401);

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data, error } = await supabase.rpc("claim_pending_pushes");
    if (error) throw error;
    const pending = (data ?? []) as PendingPush[];
    if (pending.length === 0) return json({ sent: 0 });

    const userIds = [...new Set(pending.map((p) => p.user_id))];
    const { data: tokens, error: tokensError } = await supabase
      .from("fcm_tokens")
      .select("user_id, token")
      .in("user_id", userIds)
      .neq("is_active", false);
    if (tokensError) throw tokensError;

    const tokensByUser = new Map<string, string[]>();
    for (const t of tokens ?? []) {
      const list = tokensByUser.get(t.user_id) ?? [];
      list.push(t.token);
      tokensByUser.set(t.user_id, list);
    }

    const sentIds: string[] = [];
    const failedIds: string[] = [];
    const deadTokens = new Set<string>();
    const needsSending = pending.filter((p) => tokensByUser.get(p.user_id)?.length);
    // Sem aparelho com push ativo: nada a enviar (fica só no app).
    for (const p of pending) if (!tokensByUser.get(p.user_id)?.length) sentIds.push(p.id);

    const serviceAccount = needsSending.length ? firebaseServiceAccount() : null;
    if (needsSending.length && !serviceAccount) {
      console.error("notification-push: Firebase não configurado");
      for (const p of needsSending) failedIds.push(p.id);
    } else if (serviceAccount) {
      // Um token do Google para a rodada inteira (antes era um por aviso).
      let accessToken: string | null = null;
      try {
        accessToken = await getAccessToken(serviceAccount);
      } catch (err) {
        console.error("notification-push: sem acesso ao Firebase", err);
      }
      if (!accessToken) {
        for (const p of needsSending) failedIds.push(p.id);
      } else {
        await Promise.all(
          needsSending.map(async (notification) => {
            const results = await sendToTokens(serviceAccount, accessToken!, tokensByUser.get(notification.user_id)!, {
              title: notification.title,
              body: notification.message,
              url: notification.link ?? "/notifications",
              data: { type: "notification", notification_id: notification.id },
              // Mensagens da mesma conversa substituem o aviso anterior no aparelho.
              tag: notification.link?.startsWith("/chat") ? notification.link : notification.id,
              ttlSeconds: 6 * 3600,
            });
            results.filter((r) => r.dead).forEach((r) => deadTokens.add(r.token));
            const delivered = results.some((r) => r.ok);
            const retry = !delivered && results.some((r) => r.transient);
            (retry ? failedIds : sentIds).push(notification.id);
          }),
        );
      }
    }

    if (deadTokens.size > 0) {
      await supabase.from("fcm_tokens").update({ is_active: false }).in("token", [...deadTokens]);
    }
    const { error: finishError } = await supabase.rpc("finish_pushes", { p_sent: sentIds, p_failed: failedIds });
    if (finishError) console.error("notification-push: falha ao registrar o resultado", finishError);

    const sent = sentIds.length;
    return json({ pending: pending.length, sent, retry: failedIds.length });
  } catch (error) {
    console.error("notification-push error:", error);
    return json({ error: "Falha ao enviar notificações" }, 500);
  }
});

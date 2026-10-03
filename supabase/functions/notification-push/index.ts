import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isTrustedCaller } from "../_shared/guards.ts";

// Envia para o celular as notificações do app marcadas com `push` (consultas:
// nova solicitação, confirmação, recusa, remarcação, cancelamento e lembretes
// de 24h/1h; chat: nova mensagem). Chamada pelo pg_cron a cada minuto.
//
// Quem decide o que enviar é claim_pending_pushes(): pega as pendentes da
// última hora e já as marca como enviadas na mesma operação, então chamadas
// repetidas (ou de fora) não mandam nada em dobro.

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

    let sent = 0;
    await Promise.all(
      pending.map(async (notification) => {
        const userTokens = tokensByUser.get(notification.user_id);
        if (!userTokens?.length) return;
        // Reaproveita o envio pelo FCM (HTTP v1) da função firebase-notifications.
        const { error: sendError } = await supabase.functions.invoke("firebase-notifications", {
          headers: { Authorization: `Bearer ${serviceKey}` },
          body: {
            title: notification.title,
            body: notification.message,
            tokens: userTokens,
            data: { type: "notification", notification_id: notification.id, url: notification.link ?? "/notifications" },
          },
        });
        if (sendError) console.error("notification-push: falha ao enviar", notification.id, sendError);
        else sent += 1;
      }),
    );

    return json({ pending: pending.length, sent });
  } catch (error) {
    console.error("notification-push error:", error);
    return json({ error: "Falha ao enviar notificações" }, 500);
  }
});

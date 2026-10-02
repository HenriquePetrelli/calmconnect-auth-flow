import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Lembretes de "Meus hábitos", chamados pelo pg_cron a cada 15 minutos.
//
// Quem decide o que está devido é claim_due_habit_reminders(): água dentro da
// janela e do intervalo escolhidos, enquanto a meta do dia não foi batida; e
// uma mensagem por dia para quem está parando de fumar/beber e para os outros
// hábitos do dia; no remédio, um lembrete em cada horário de dose ainda não
// marcada. A função marca
// cada lembrete como enviado na mesma operação, então chamadas repetidas (ou
// de fora) não disparam lembretes a mais — por isso esta função não exige o
// CRON_SECRET, mas o aceita se estiver configurado.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

interface DueReminder {
  habit_id: string;
  user_id: string;
  kind: string;
  title: string | null;
  daily_goal: number | null;
  today_total: number;
  quit_started_at: string | null;
  settings: Record<string, unknown> | null;
  /** Remédio: o horário da dose que está sendo lembrada. */
  due_slot?: string | null;
}

const formatMl = (ml: number) =>
  ml >= 1000 ? `${(ml / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} L` : `${Math.round(ml)} ml`;

const daysSince = (iso: string | null) =>
  iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)) : 0;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const buildMessage = (r: DueReminder): { title: string; body: string } => {
  const total = Number(r.today_total ?? 0);
  const goal = Number(r.daily_goal ?? 0);
  switch (r.kind) {
    case "water": {
      const missing = Math.max(0, goal - total);
      return {
        title: "Hora de beber água 💧",
        body: total === 0
          ? `Comece o dia com um copo. A meta de hoje é ${formatMl(goal)}.`
          : `Você já bebeu ${formatMl(total)}. Faltam ${formatMl(missing)} para a meta.`,
      };
    }
    case "sleep":
      return { title: "Como você dormiu?", body: "Anote as horas de sono de hoje em Meus hábitos." };
    case "movement":
      return {
        title: "Bora se mexer?",
        body: total > 0 ? `Você já fez ${Math.round(total)} min hoje. Faltam ${Math.max(0, Math.round(goal - total))} min.` : `A meta de hoje é ${Math.round(goal)} min de movimento.`,
      };
    case "caffeine": {
      const cutoff = typeof r.settings?.cutoff_time === "string" ? r.settings.cutoff_time : null;
      return {
        title: "Último café do dia? ☕",
        body: cutoff
          ? `Depois das ${cutoff}, a cafeína pode atrapalhar o sono. Hoje: ${Math.round(total)} mg de ${Math.round(goal)} mg.`
          : `Hoje: ${Math.round(total)} mg de ${Math.round(goal)} mg.`,
      };
    }
    case "meals":
      return {
        title: "Já comeu?",
        body: total >= goal
          ? "Refeições do dia em dia. Que bom!"
          : "Ficar muitas horas sem comer pode aumentar a ansiedade. Marque as refeições em Meus hábitos.",
      };
    case "medication":
      return {
        title: `Hora do remédio${r.due_slot ? ` (${r.due_slot})` : ""} 💊`,
        body: `${r.title ?? "Seu remédio"}: marque em Meus hábitos quando tomar.`,
      };
    case "screen_time":
      return {
        title: "Hora de desacelerar 🌙",
        body: "Que tal deixar o celular de lado na próxima hora? O sono agradece.",
      };
    case "joy":
      return {
        title: "Já fez algo que te faz bem hoje?",
        body: "Ler, ouvir música, caminhar: um momento seu também é autocuidado.",
      };
    case "quit_smoking":
    case "quit_alcohol":
    case "quit_custom": {
      const days = daysSince(r.quit_started_at);
      const what = r.kind === "quit_smoking" ? "sem fumar" : r.kind === "quit_alcohol" ? "sem álcool" : `sem ${(r.title ?? "").toLowerCase()}`;
      return {
        title: days === 0 ? "Hoje é o primeiro dia 💪" : `${plural(days, "dia", "dias")} ${what}`,
        body: days === 0
          ? "Um dia de cada vez. Se a vontade vier, registre em Meus hábitos e respire junto com o app."
          : "Você está indo muito bem. Um dia de cada vez.",
      };
    }
    default:
      return { title: "Meus hábitos", body: "Que tal registrar o seu dia?" };
  }
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const cronSecret = Deno.env.get("CRON_SECRET");
  const sentSecret = req.headers.get("x-cron-secret");
  if (cronSecret && sentSecret && sentSecret !== cronSecret) return json({ error: "Unauthorized" }, 401);

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data: due, error } = await supabase.rpc("claim_due_habit_reminders");
    if (error) throw error;
    const reminders = (due ?? []) as DueReminder[];
    if (reminders.length === 0) return json({ sent: 0 });

    const userIds = [...new Set(reminders.map((r) => r.user_id))];
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
      reminders.map(async (reminder) => {
        const userTokens = tokensByUser.get(reminder.user_id);
        if (!userTokens?.length) return;
        const message = buildMessage(reminder);
        // Reaproveita o envio pelo FCM (HTTP v1) da função firebase-notifications.
        const { error: sendError } = await supabase.functions.invoke("firebase-notifications", {
          headers: { Authorization: `Bearer ${serviceKey}` },
          body: {
            ...message,
            tokens: userTokens,
            data: { type: "habit_reminder", habit_id: reminder.habit_id, url: `/habitos/${reminder.habit_id}` },
          },
        });
        if (sendError) console.error("habit-reminders: falha ao enviar", reminder.habit_id, sendError);
        else sent += 1;
      }),
    );

    return json({ due: reminders.length, sent });
  } catch (error) {
    console.error("habit-reminders error:", error);
    return json({ error: "Falha ao processar lembretes" }, 500);
  }
});

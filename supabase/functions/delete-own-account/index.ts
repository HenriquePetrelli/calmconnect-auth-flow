import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";

// Account deletion requested by the patient themself — the data subject's
// right under LGPD (art. 18, VI) and a requirement of both app stores.
// Mirrors admin-delete-patient, plus: cancels any active Stripe subscription
// FIRST (deleting the account while Stripe keeps charging would be worse
// than not deleting it), and removes the tables added since.
//
// Psychologists can't self-delete here: their account carries payouts and
// clinical records with legal retention duties, so it goes through support.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const CONFIRMATION_WORD = "EXCLUIR";

const cancelStripeSubscriptions = async (email: string | undefined): Promise<void> => {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey || !email) return;
  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
  const customers = await stripe.customers.list({ email, limit: 1 });
  if (customers.data.length === 0) return;
  for (const status of ["active", "trialing", "past_due"] as const) {
    const subs = await stripe.subscriptions.list({ customer: customers.data[0].id, status, limit: 20 });
    for (const sub of subs.data) {
      await stripe.subscriptions.cancel(sub.id);
    }
  }
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Token de autorização ausente" }, 401);

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return json({ error: "Token inválido" }, 401);

    const body = await req.json().catch(() => null);
    if (body?.confirmation !== CONFIRMATION_WORD) {
      return json({ error: `Digite ${CONFIRMATION_WORD} para confirmar a exclusão.` }, 400);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profile?.user_type !== "patient") {
      return json({
        error: "A exclusão de contas de psicólogo e de administrador é feita pelo suporte, por envolver repasses e registros com prazo legal de guarda.",
      }, 403);
    }

    const { data: liveSos } = await supabase
      .from("emergency_requests")
      .select("id")
      .eq("patient_id", user.id)
      .in("status", ["pending", "accepted", "in_progress"])
      .limit(1);
    if (liveSos && liveSos.length > 0) {
      return json({ error: "Você tem um atendimento de emergência em andamento. Encerre-o antes de excluir a conta." }, 409);
    }

    try {
      await cancelStripeSubscriptions(user.email);
    } catch (stripeError) {
      console.error("delete-own-account: falha ao cancelar assinatura", stripeError);
      return json({
        error: "Não foi possível cancelar sua assinatura agora, então a conta não foi excluída. Tente de novo em instantes.",
      }, 502);
    }

    const userId = user.id;
    const deletions: [string, string][] = [
      ["notifications", "patient_id"],
      ["patient_weekly_goals", "user_id"],
      ["patient_achievements", "user_id"],
      ["patient_progress", "patient_id"],
      ["patient_statistics", "patient_id"],
      ["patient_mood_logs", "patient_id"],
      ["private_journals", "user_id"],
      ["group_favorites", "user_id"],
      ["group_testimonial_likes", "user_id"],
      ["group_testimonial_reports", "reporter_id"],
      ["group_testimonials", "user_id"],
      ["session_feedback", "user_id"],
      ["safety_plans", "patient_id"],
      ["emergency_contacts", "patient_id"],
      ["webrtc_sessions", "patient_id"],
      ["emergency_requests", "patient_id"],
      ["mensagens", "autor_id"],
      ["conversas", "paciente_id"],
      ["appointments", "patient_id"],
      ["fcm_tokens", "user_id"],
      ["user_preferences", "user_id"],
      ["subscribers", "user_id"],
      ["support_tickets", "user_id"],
      ["patients", "user_id"],
      ["profiles", "user_id"],
    ];

    for (const [table, column] of deletions) {
      const { error } = await supabase.from(table).delete().eq(column, userId);
      // A table that doesn't exist in this environment is not a reason to
      // leave the rest of the person's data behind.
      if (error && error.code !== "42P01") {
        console.error(`delete-own-account: erro ao limpar ${table}`, error);
      }
    }

    await supabase.storage.from("documents").list(userId).then(async ({ data: files }) => {
      if (files && files.length > 0) {
        await supabase.storage.from("documents").remove(files.map((f) => `${userId}/${f.name}`));
      }
    }).catch((e) => console.error("delete-own-account: erro ao limpar arquivos", e));

    await supabase.from("security_audit_log").insert({
      user_id: null,
      action: "account_self_deleted",
      table_name: "auth.users",
      record_id: userId,
      new_values: { deleted_at: new Date().toISOString() },
    });

    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      console.error("delete-own-account: erro ao remover do auth", authDeleteError);
      return json({
        error: "Seus dados foram apagados, mas não conseguimos remover o login. Fale com o suporte para concluir.",
      }, 500);
    }

    return json({ success: true });
  } catch (error: unknown) {
    console.error("delete-own-account error:", error);
    return json({ error: "Não foi possível excluir a conta agora. Tente de novo em instantes." }, 500);
  }
});

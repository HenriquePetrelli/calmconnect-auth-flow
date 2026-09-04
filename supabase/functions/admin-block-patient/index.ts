import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

const DURATIONS: Record<string, number | null> = {
  "24h": 24 * 60 * 60 * 1000,
  "48h": 48 * 60 * 60 * 1000,
  "1w": 7 * 24 * 60 * 60 * 1000,
  "2w": 14 * 24 * 60 * 60 * 1000,
  "1m": 30 * 24 * 60 * 60 * 1000,
  "1y": 365 * 24 * 60 * 60 * 1000,
  forever: null,
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Token de autorização ausente" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "Token inválido" }, 401);

    const { data: isAdmin, error: adminError } = await supabase.rpc("is_super_admin", {
      user_id_param: user.id,
    });
    if (adminError || isAdmin !== true) {
      return json({ error: "Acesso negado. Apenas administradores." }, 403);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "Corpo inválido" }, 400);

    const { patient_id, action, duration, reason } = body as Record<string, any>;
    if (!patient_id || typeof patient_id !== "string") {
      return json({ error: "patient_id é obrigatório" }, 400);
    }
    if (action !== "block" && action !== "unblock") {
      return json({ error: "Ação inválida" }, 400);
    }

    let updates: Record<string, any>;

    if (action === "block") {
      if (typeof duration !== "string" || !(duration in DURATIONS)) {
        return json({ error: "Período de bloqueio inválido" }, 400);
      }
      const trimmedReason = typeof reason === "string" ? reason.trim() : "";
      if (trimmedReason.length < 3) return json({ error: "Informe o motivo do bloqueio" }, 400);
      if (trimmedReason.length > 2000) return json({ error: "Motivo muito longo" }, 400);

      const ms = DURATIONS[duration];
      updates = {
        is_blocked: true,
        blocked_at: new Date().toISOString(),
        blocked_until: ms === null ? null : new Date(Date.now() + ms).toISOString(),
        blocked_reason: trimmedReason,
        updated_at: new Date().toISOString(),
      };
    } else {
      updates = {
        is_blocked: false,
        blocked_at: null,
        blocked_until: null,
        blocked_reason: null,
        updated_at: new Date().toISOString(),
      };
    }

    const { error: updateError } = await supabase
      .from("patients")
      .update(updates)
      .eq("id", patient_id);
    if (updateError) return json({ error: updateError.message }, 400);

    const { data: updated } = await supabase
      .from("patients")
      .select("*")
      .eq("id", patient_id)
      .maybeSingle();

    await supabase.from("admin_audit_log").insert({
      admin_id: user.id,
      action: action === "block" ? "block_patient" : "unblock_patient",
      target_type: "patient",
      target_id: updated?.user_id ?? null,
      target_name: updated?.full_name ?? null,
      details: action === "block" ? { duration, reason } : {},
    });

    return json({
      success: true,
      data: updated,
      message: action === "block" ? "Paciente bloqueado com sucesso" : "Paciente desbloqueado com sucesso",
    });
  } catch (error: any) {
    console.error("admin-block-patient error:", error);
    return json({ error: error?.message || "Erro interno do servidor" }, 500);
  }
});

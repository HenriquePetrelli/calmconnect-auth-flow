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
    const patientId = body?.patient_id;
    if (!patientId || typeof patientId !== "string") {
      return json({ error: "patient_id é obrigatório" }, 400);
    }

    const { data: patient, error: fetchError } = await supabase
      .from("patients")
      .select("id, user_id")
      .eq("id", patientId)
      .maybeSingle();

    if (fetchError) return json({ error: fetchError.message }, 400);
    if (!patient) return json({ error: "Paciente não encontrado" }, 404);

    const userId: string | null = patient.user_id;

    if (userId) {
      await supabase.from("notifications").delete().eq("patient_id", userId);
      await supabase.from("patient_weekly_goals").delete().eq("user_id", userId);
      await supabase.from("patient_achievements").delete().eq("user_id", userId);
      await supabase.from("patient_progress").delete().eq("patient_id", userId);
      await supabase.from("patient_statistics").delete().eq("patient_id", userId);
      await supabase.from("private_journals").delete().eq("user_id", userId);
      await supabase.from("group_favorites").delete().eq("user_id", userId);
      await supabase.from("group_testimonial_likes").delete().eq("user_id", userId);
      await supabase.from("group_testimonials").delete().eq("user_id", userId);
      await supabase.from("session_feedback").delete().eq("user_id", userId);
      await supabase.from("webrtc_sessions").delete().eq("patient_id", userId);
      await supabase.from("emergency_requests").delete().eq("patient_id", userId);
      await supabase.from("mensagens").delete().eq("autor_id", userId);
      await supabase.from("conversas").delete().eq("paciente_id", userId);
      await supabase.from("appointments").delete().eq("patient_id", userId);
      await supabase.from("fcm_tokens").delete().eq("user_id", userId);
      await supabase.from("user_preferences").delete().eq("user_id", userId);
      await supabase.from("subscribers").delete().eq("user_id", userId);
      await supabase.from("support_tickets").delete().eq("user_id", userId);
    }

    const { error: deleteError } = await supabase.from("patients").delete().eq("id", patient.id);
    if (deleteError) return json({ error: deleteError.message }, 400);

    if (userId) {
      await supabase.from("profiles").delete().eq("user_id", userId);
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
      if (authDeleteError) {
        console.error("Erro ao remover usuário do auth:", authDeleteError);
        return json({
          success: true,
          warning: "Registros removidos, mas a conta de autenticação não pôde ser excluída.",
          message: "Paciente excluído parcialmente",
        });
      }
    }

    return json({ success: true, message: "Paciente excluído permanentemente" });
  } catch (error: any) {
    console.error("admin-delete-patient error:", error);
    return json({ error: error?.message || "Erro interno do servidor" }, 500);
  }
});

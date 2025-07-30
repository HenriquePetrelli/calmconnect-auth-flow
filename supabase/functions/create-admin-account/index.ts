import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-ADMIN-ACCOUNT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting admin account creation");

    // Use service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { email, password, fullName } = await req.json();

    // Validate input
    if (!email || !password || !fullName) {
      throw new Error("Email, password e nome completo são obrigatórios");
    }

    logStep("Creating admin user in auth.users", { email });

    // Create user in auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        user_type: 'admin'
      }
    });

    if (authError) {
      logStep("Auth user creation failed", { error: authError });
      throw new Error(`Erro ao criar usuário: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error("Usuário não foi criado");
    }

    const userId = authData.user.id;
    logStep("Auth user created successfully", { userId });

    // Create profile entry
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: userId,
        user_type: 'admin',
        full_name: fullName
      });

    if (profileError) {
      logStep("Profile creation failed", { error: profileError });
      // Cleanup: delete auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(`Erro ao criar perfil: ${profileError.message}`);
    }

    logStep("Profile created successfully");

    // Add to admin_users table
    const { error: adminError } = await supabaseAdmin
      .from('admin_users')
      .insert({
        user_id: userId,
        granted_by: userId, // Self-granted for initial admin
        is_active: true
      });

    if (adminError) {
      logStep("Admin role assignment failed", { error: adminError });
      // Cleanup: delete auth user and profile if admin role assignment fails
      await supabaseAdmin.auth.admin.deleteUser(userId);
      await supabaseAdmin.from('profiles').delete().eq('user_id', userId);
      throw new Error(`Erro ao atribuir papel de admin: ${adminError.message}`);
    }

    logStep("Admin role assigned successfully");

    return new Response(JSON.stringify({
      success: true,
      message: "Conta de administrador criada com sucesso",
      data: {
        email,
        userId,
        fullName,
        userType: 'admin'
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-admin-account", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
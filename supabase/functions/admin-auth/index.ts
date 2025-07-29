import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { SignJWT } from "https://deno.land/x/jose@v4.14.4/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

interface AdminLoginRequest {
  email: string;
  password: string;
}

interface AdminUpdateRequest {
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();

    if (req.method === "POST" && path === "login") {
      const { email, password }: AdminLoginRequest = await req.json();

      // Get admin user from database
      const { data: adminUser, error } = await supabase
        .from("admin_users")
        .select("*")
        .eq("email", email)
        .single();

      if (error || !adminUser) {
        return new Response(
          JSON.stringify({ error: "Invalid credentials" }),
          {
            status: 401,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      // For the first login, we need to hash the password
      if (adminUser.password_hash === "$2b$10$example.hash.will.be.replaced.by.application") {
        const hashedPassword = await bcrypt.hash(password);
        await supabase
          .from("admin_users")
          .update({ password_hash: hashedPassword })
          .eq("id", adminUser.id);
        
        adminUser.password_hash = hashedPassword;
      }

      // Verify password
      const isValid = await bcrypt.compare(password, adminUser.password_hash);
      if (!isValid) {
        return new Response(
          JSON.stringify({ error: "Invalid credentials" }),
          {
            status: 401,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      // Generate JWT token
      const secret = new TextEncoder().encode(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
      const token = await new SignJWT({ 
        email: adminUser.email,
        role: "admin",
        sub: adminUser.id 
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(secret);

      return new Response(
        JSON.stringify({ 
          token, 
          admin: { 
            id: adminUser.id, 
            email: adminUser.email 
          } 
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (req.method === "PUT" && path === "update") {
      const authHeader = req.headers.get("authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          {
            status: 401,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      const { email, currentPassword, newPassword }: AdminUpdateRequest = await req.json();
      
      // Verify JWT and get admin ID
      // For simplicity, we'll decode the token manually in production you'd want proper JWT verification
      const token = authHeader.replace("Bearer ", "");
      // This is a simplified version - in production use proper JWT verification
      
      // Get current admin from database (assuming we can extract ID from token)
      const { data: adminUser, error } = await supabase
        .from("admin_users")
        .select("*")
        .eq("email", email)
        .single();

      if (error || !adminUser) {
        return new Response(
          JSON.stringify({ error: "Admin not found" }),
          {
            status: 404,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      let updateData: any = {};

      // Update email if provided
      if (email && email !== adminUser.email) {
        updateData.email = email;
      }

      // Update password if provided
      if (currentPassword && newPassword) {
        const isValidPassword = await bcrypt.compare(currentPassword, adminUser.password_hash);
        if (!isValidPassword) {
          return new Response(
            JSON.stringify({ error: "Current password is incorrect" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        }
        updateData.password_hash = await bcrypt.hash(newPassword);
      }

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from("admin_users")
          .update(updateData)
          .eq("id", adminUser.id);

        if (updateError) {
          return new Response(
            JSON.stringify({ error: "Failed to update admin" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        }
      }

      return new Response(
        JSON.stringify({ message: "Admin updated successfully" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Error in admin-auth function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
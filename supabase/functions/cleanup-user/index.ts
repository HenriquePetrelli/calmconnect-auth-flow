import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CleanupUserRequest {
  userId: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { userId }: CleanupUserRequest = await req.json();

    console.log('Starting cleanup for user:', userId);

    // 1. Remove documents from storage
    const { data: files } = await supabaseAdmin.storage
      .from('documents')
      .list(userId);
    
    if (files && files.length > 0) {
      const filesToRemove = files.map(f => `${userId}/${f.name}`);
      await supabaseAdmin.storage
        .from('documents')
        .remove(filesToRemove);
      console.log('Documents removed from storage');
    }

    // 2. Remove from database tables (in order due to constraints)
    await supabaseAdmin
      .from('psychologist_registrations')
      .delete()
      .eq('user_id', userId);

    await supabaseAdmin
      .from('psychologists')
      .delete()
      .eq('user_id', userId);

    await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('user_id', userId);

    console.log('Database records removed');

    // 3. Delete user from auth (requires admin privileges)
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (deleteUserError) {
      console.error('Error deleting user from auth:', deleteUserError);
      throw deleteUserError;
    }

    console.log('User successfully deleted from auth');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User cleanup completed successfully' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in cleanup-user function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to cleanup user' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
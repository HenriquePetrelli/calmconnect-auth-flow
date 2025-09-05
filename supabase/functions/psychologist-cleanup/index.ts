import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const handler = async (req: Request): Promise<Response> => {
  console.log('Psychologist cleanup function called:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Find rejected psychologists older than 3 days
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { data: rejectedPsychologists, error: fetchError } = await supabase
      .from('psychologist_registrations')
      .select(`
        user_id,
        rejected_at,
        psychologists (
          document_url,
          full_name,
          email
        )
      `)
      .eq('status', 'rejected')
      .not('rejected_at', 'is', null)
      .lt('rejected_at', threeDaysAgo.toISOString());

    if (fetchError) {
      console.error('Error fetching rejected psychologists:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${rejectedPsychologists?.length || 0} psychologists to cleanup`);

    let cleanedCount = 0;
    let errorCount = 0;

    if (rejectedPsychologists && rejectedPsychologists.length > 0) {
      for (const psychologist of rejectedPsychologists) {
        try {
          console.log(`Cleaning up psychologist: ${psychologist.user_id}`);

          // Delete documents from storage if they exist
          if (psychologist.psychologists?.document_url) {
            const documentPath = extractDocumentPath(psychologist.psychologists.document_url);
            if (documentPath) {
              const { error: storageError } = await supabase.storage
                .from('psychologist-documents')
                .remove([documentPath]);
              
              if (storageError) {
                console.warn(`Error deleting document for ${psychologist.user_id}:`, storageError);
              } else {
                console.log(`Deleted document: ${documentPath}`);
              }
            }
          }

          // Delete from database tables
          const { error: regError } = await supabase
            .from('psychologist_registrations')
            .delete()
            .eq('user_id', psychologist.user_id);

          if (regError) {
            console.error(`Error deleting registration for ${psychologist.user_id}:`, regError);
            throw regError;
          }

          const { error: psychError } = await supabase
            .from('psychologists')
            .delete()
            .eq('user_id', psychologist.user_id);

          if (psychError) {
            console.error(`Error deleting psychologist for ${psychologist.user_id}:`, psychError);
            throw psychError;
          }

          const { error: profileError } = await supabase
            .from('profiles')
            .delete()
            .eq('user_id', psychologist.user_id)
            .eq('user_type', 'psychologist');

          if (profileError) {
            console.error(`Error deleting profile for ${psychologist.user_id}:`, profileError);
            throw profileError;
          }

          // Delete user from auth
          const { error: authError } = await supabase.auth.admin.deleteUser(psychologist.user_id);
          
          if (authError) {
            console.error(`Error deleting auth user ${psychologist.user_id}:`, authError);
            throw authError;
          }

          cleanedCount++;
          console.log(`Successfully cleaned up psychologist: ${psychologist.user_id}`);

        } catch (error: any) {
          console.error(`Error cleaning up psychologist ${psychologist.user_id}:`, error);
          errorCount++;
        }
      }
    }

    const result = {
      success: true,
      message: `Cleanup completed. Processed: ${rejectedPsychologists?.length || 0}, Cleaned: ${cleanedCount}, Errors: ${errorCount}`,
      processed: rejectedPsychologists?.length || 0,
      cleaned: cleanedCount,
      errors: errorCount
    };

    console.log('Cleanup result:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Cleanup function error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message || 'Internal server error',
      message: 'Falha na limpeza automática'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
};

// Helper function to extract document path from URL
const extractDocumentPath = (url: string): string | null => {
  if (!url) return null;
  
  // Remove query parameters if any
  const cleanUrl = url.split('?')[0];
  
  // Supabase storage pattern
  const supabasePattern = /\/storage\/v1\/object\/public\/psychologist-documents\/(.+)$/;
  const supabaseMatch = cleanUrl.match(supabasePattern);
  
  if (supabaseMatch) {
    return supabaseMatch[1];
  }
  
  // If it's already a simple path (without http)
  if (!cleanUrl.startsWith('http')) {
    return cleanUrl;
  }
  
  return null;
};

serve(handler);
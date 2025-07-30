import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  topic?: string;
  tokens?: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: NotificationPayload = await req.json();

    if (!payload.title || !payload.body) {
      return new Response(
        JSON.stringify({ error: 'Title and body are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Firebase server key from secrets
    const firebaseServerKey = Deno.env.get('FIREBASE_SERVER_KEY');
    if (!firebaseServerKey) {
      return new Response(
        JSON.stringify({ error: 'Firebase configuration not found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare FCM message
    let fcmMessage: any = {
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {},
    };

    // Send to topic or specific tokens
    if (payload.topic) {
      fcmMessage.to = `/topics/${payload.topic}`;
    } else if (payload.tokens && payload.tokens.length > 0) {
      fcmMessage.registration_ids = payload.tokens;
    } else {
      return new Response(
        JSON.stringify({ error: 'Either topic or tokens must be provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send notification via FCM
    const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${firebaseServerKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fcmMessage),
    });

    const fcmResult = await fcmResponse.json();

    if (!fcmResponse.ok) {
      console.error('FCM Error:', fcmResult);
      return new Response(
        JSON.stringify({ error: 'Failed to send notification', details: fcmResult }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log notification sent
    console.log(`Notification sent successfully:`, {
      title: payload.title,
      topic: payload.topic,
      tokens_count: payload.tokens?.length || 0,
      fcm_response: fcmResult
    });

    // Store notification in database for tracking
    const { error: logError } = await supabase
      .from('notification_logs')
      .insert({
        user_id: user.id,
        title: payload.title,
        body: payload.body,
        topic: payload.topic,
        recipient_count: fcmResult.success || 1,
        fcm_response: fcmResult,
      });

    if (logError) {
      console.error('Error logging notification:', logError);
    }

    return new Response(
      JSON.stringify({ 
        message: 'Notification sent successfully',
        result: fcmResult 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in firebase-notifications function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
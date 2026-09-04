import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  /** Explicit token list — the only targeting mode supported today. */
  tokens?: string[];
}

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

const base64url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const pemToArrayBuffer = (pem: string): ArrayBuffer => {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};

/**
 * FCM's legacy `fcm.googleapis.com/fcm/send` HTTP API (server key + a
 * bare `key=` header) was shut down by Google in June 2024. The only way
 * to send today is the HTTP v1 API, which is authenticated with a
 * short-lived OAuth2 access token obtained via a signed JWT — this
 * exchanges a Firebase service account for that token, entirely with the
 * Web Crypto API already built into Deno (no extra dependency).
 */
const getAccessToken = async (serviceAccount: ServiceAccount): Promise<string> => {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const encoder = new TextEncoder();
  const unsigned = `${base64url(encoder.encode(JSON.stringify(header)))}.${base64url(encoder.encode(JSON.stringify(claims)))}`;

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(serviceAccount.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(unsigned));
  const jwt = `${unsigned}.${base64url(new Uint8Array(signature))}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(`Failed to obtain FCM access token: ${await tokenResponse.text()}`);
  }

  const { access_token } = await tokenResponse.json();
  return access_token;
};

Deno.serve(async (req) => {
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

    // This function is meant to be called server-to-server (from another
    // edge function that just wrote a notification) as well as by a
    // logged-in user's own client, so both a service-role caller (no user
    // JWT) and an authenticated user are accepted — but a bare request
    // with neither is not.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const callerToken = authHeader.replace('Bearer ', '');
    const isServiceRoleCall = callerToken === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    let callerUserId: string | null = null;
    if (!isServiceRoleCall) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(callerToken);
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      callerUserId = user.id;
    }

    const payload: NotificationPayload = await req.json();

    if (!payload.title || !payload.body) {
      return new Response(
        JSON.stringify({ error: 'Title and body are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!payload.tokens || payload.tokens.length === 0) {
      return new Response(
        JSON.stringify({ error: 'tokens must be provided (a non-empty array)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Requires three secrets from a Firebase service account JSON
    // (Project Settings → Service Accounts → Generate new private key):
    // FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_PROJECT_ID.
    const serviceAccount: ServiceAccount = {
      client_email: Deno.env.get('FIREBASE_CLIENT_EMAIL') ?? '',
      private_key: (Deno.env.get('FIREBASE_PRIVATE_KEY') ?? '').replace(/\\n/g, '\n'),
      project_id: Deno.env.get('FIREBASE_PROJECT_ID') ?? '',
    };
    if (!serviceAccount.client_email || !serviceAccount.private_key || !serviceAccount.project_id) {
      return new Response(
        JSON.stringify({ error: 'Firebase configuration not found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = await getAccessToken(serviceAccount);

    // The v1 API takes one token per request — send them in parallel and
    // report per-token success so a handful of stale tokens (uninstalled
    // app, revoked permission) don't look like a total failure.
    const results = await Promise.all(
      payload.tokens.map(async (token) => {
        const response = await fetch(
          `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: {
                token,
                notification: { title: payload.title, body: payload.body },
                data: payload.data ?? {},
              },
            }),
          }
        );
        const body = await response.json();
        return { token, ok: response.ok, body };
      })
    );

    const successCount = results.filter((r) => r.ok).length;

    // Tokens FCM reports as unregistered/invalid will never succeed again
    // — deactivate them so future sends stop wasting a call on them.
    const deadTokens = results
      .filter((r) => !r.ok && (r.body?.error?.status === 'NOT_FOUND' || r.body?.error?.status === 'INVALID_ARGUMENT'))
      .map((r) => r.token);
    if (deadTokens.length > 0) {
      await supabase.from('fcm_tokens').update({ is_active: false }).in('token', deadTokens);
    }

    await supabase.from('notification_logs').insert({
      user_id: callerUserId,
      title: payload.title,
      body: payload.body,
      recipient_count: successCount,
      fcm_response: { results },
    });

    return new Response(
      JSON.stringify({ message: 'Notifications processed', sent: successCount, total: payload.tokens.length }),
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

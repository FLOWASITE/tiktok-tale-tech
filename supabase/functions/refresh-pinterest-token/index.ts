import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { decryptCredential, encrypt } from "../_shared/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(withPerf({ functionName: 'refresh-pinterest-token' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getServiceClient();
    const { connectionId } = await req.json();

    if (!connectionId) throw new Error('connectionId is required');

    const { data: connection, error: connError } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('platform', 'pinterest')
      .single();

    if (connError || !connection) throw new Error('Pinterest connection not found');

    if (!connection.refresh_token) {
      await supabase
        .from('social_connections')
        .update({
          is_active: false,
          metadata: { ...connection.metadata, needs_reauth: true, refresh_error: 'No refresh token' },
        })
        .eq('id', connectionId);
      return new Response(
        JSON.stringify({ success: false, error: 'No refresh token available', needs_reauth: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve OAuth client creds: admin DB first, env fallback
    let clientId: string | null = null;
    let clientSecret: string | null = null;
    try {
      const { data: adminCreds } = await supabase
        .from('social_platform_settings')
        .select('consumer_key, consumer_secret')
        .eq('platform', 'pinterest')
        .eq('is_active', true)
        .maybeSingle();
      if (adminCreds?.consumer_key && adminCreds?.consumer_secret) {
        clientId = await decryptCredential(adminCreds.consumer_key);
        clientSecret = await decryptCredential(adminCreds.consumer_secret);
      }
    } catch (e) {
      console.warn('[refresh-pinterest-token] admin creds unavailable:', (e as Error).message);
    }
    if (!clientId) clientId = Deno.env.get('PINTEREST_CLIENT_ID') || null;
    if (!clientSecret) clientSecret = Deno.env.get('PINTEREST_CLIENT_SECRET') || null;
    if (!clientId || !clientSecret) throw new Error('Pinterest credentials not configured (Admin → Social Platforms → Pinterest)');

    const refreshToken = await decryptCredential(connection.refresh_token);
    if (!refreshToken) throw new Error('Failed to decrypt refresh token');

    console.log(`Refreshing Pinterest token for connection ${connectionId}`);

    const basicAuth = btoa(`${clientId}:${clientSecret}`);
    const tokenRes = await fetch('https://api.pinterest.com/v5/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        scope: 'boards:read,boards:write,pins:read,pins:write,user_accounts:read',
      }).toString(),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      const errMsg = tokenData.message || tokenData.error_description || `HTTP ${tokenRes.status}`;
      await supabase
        .from('social_connections')
        .update({
          is_active: false,
          metadata: { ...connection.metadata, needs_reauth: true, refresh_error: errMsg },
        })
        .eq('id', connectionId);
      return new Response(
        JSON.stringify({ success: false, error: errMsg, needs_reauth: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const expiresIn = tokenData.expires_in || 30 * 24 * 3600;
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    const encAccess = await encrypt(tokenData.access_token);
    // Pinterest sometimes returns rotated refresh_token, sometimes not
    const encRefresh = tokenData.refresh_token
      ? await encrypt(tokenData.refresh_token)
      : connection.refresh_token;

    await supabase
      .from('social_connections')
      .update({
        access_token: encAccess,
        refresh_token: encRefresh,
        token_expires_at: tokenExpiresAt,
        is_active: true,
        metadata: {
          ...connection.metadata,
          last_refreshed: new Date().toISOString(),
          needs_reauth: false,
        },
      })
      .eq('id', connectionId);

    return new Response(
      JSON.stringify({ success: true, expiresAt: tokenExpiresAt }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[refresh-pinterest-token] error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));

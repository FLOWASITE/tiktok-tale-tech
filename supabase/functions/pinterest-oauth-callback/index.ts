import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { encrypt } from "../_shared/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getFrontendUrl(stateOrigin: string | null): string {
  if (stateOrigin) return stateOrigin;
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  if (supabaseUrl.includes('supabase.co')) {
    return supabaseUrl.replace('.supabase.co', '.lovable.app').replace('/functions/v1', '');
  }
  return 'http://localhost:5173';
}

Deno.serve(withPerf({ functionName: 'pinterest-oauth-callback' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let frontendUrl = 'http://localhost:5173';

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    const supabase = getServiceClient();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

    // Lookup OAuth session by state
    let session: any = null;
    if (state) {
      const { data } = await supabase
        .from('pinterest_oauth_sessions')
        .select('*')
        .eq('state', state)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
      session = data;
    }

    frontendUrl = getFrontendUrl(session?.frontend_origin || null);

    if (error) {
      console.error('Pinterest OAuth error:', error, errorDescription);
      const r = new URL('/auth/pinterest/callback', frontendUrl);
      r.searchParams.set('error', errorDescription || error);
      return Response.redirect(r.toString(), 302);
    }

    if (!code || !state || !session) {
      const r = new URL('/auth/pinterest/callback', frontendUrl);
      r.searchParams.set('error', !session ? 'OAuth session expired or invalid state' : 'Missing code/state');
      return Response.redirect(r.toString(), 302);
    }

    const clientId = Deno.env.get('PINTEREST_CLIENT_ID');
    const clientSecret = Deno.env.get('PINTEREST_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      const r = new URL('/auth/pinterest/callback', frontendUrl);
      r.searchParams.set('error', 'Pinterest credentials not configured');
      return Response.redirect(r.toString(), 302);
    }

    const redirectUri = `${supabaseUrl}/functions/v1/pinterest-oauth-callback`;

    // Exchange code for token (Basic auth + PKCE verifier)
    const basicAuth = btoa(`${clientId}:${clientSecret}`);
    const tokenRes = await fetch('https://api.pinterest.com/v5/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: session.code_verifier,
      }).toString(),
    });

    if (!tokenRes.ok) {
      const txt = await tokenRes.text();
      console.error('[pinterest] token exchange failed:', tokenRes.status, txt);
      const r = new URL('/auth/pinterest/callback', frontendUrl);
      r.searchParams.set('error', `Token exchange failed: ${tokenRes.status}`);
      return Response.redirect(r.toString(), 302);
    }

    const tokenData = await tokenRes.json();
    const accessToken: string = tokenData.access_token;
    const refreshToken: string | undefined = tokenData.refresh_token;
    const expiresIn: number = tokenData.expires_in || 30 * 24 * 3600; // 30d default
    const refreshExpiresIn: number | undefined = tokenData.refresh_token_expires_in;

    if (!accessToken) {
      const r = new URL('/auth/pinterest/callback', frontendUrl);
      r.searchParams.set('error', 'No access token returned');
      return Response.redirect(r.toString(), 302);
    }

    // Fetch user account info
    let username = 'Pinterest User';
    let userId = '';
    let avatarUrl: string | null = null;
    try {
      const meRes = await fetch('https://api.pinterest.com/v5/user_account', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (meRes.ok) {
        const me = await meRes.json();
        username = me.username || username;
        userId = me.id || '';
        avatarUrl = me.profile_image || null;
      } else {
        console.warn('[pinterest] user_account fetch failed:', meRes.status);
      }
    } catch (e) {
      console.warn('[pinterest] user_account fetch error:', e);
    }

    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    const encAccess = await encrypt(accessToken);
    const encRefresh = refreshToken ? await encrypt(refreshToken) : null;

    // Find existing connection
    let q = supabase.from('social_connections').select('id').eq('platform', 'pinterest');
    if (session.brand_template_id) q = q.eq('brand_template_id', session.brand_template_id);
    else if (session.organization_id) q = q.eq('organization_id', session.organization_id);
    const { data: existing } = await q.maybeSingle();

    const connectionData = {
      organization_id: session.organization_id || null,
      brand_template_id: session.brand_template_id || null,
      user_id: session.user_id,
      platform: 'pinterest',
      platform_user_id: userId,
      platform_username: username,
      platform_avatar_url: avatarUrl,
      access_token: encAccess,
      refresh_token: encRefresh,
      token_expires_at: tokenExpiresAt,
      is_active: true,
      connected_at: new Date().toISOString(),
      scopes: ['boards:read', 'boards:write', 'pins:read', 'pins:write', 'user_accounts:read'],
      metadata: {
        refresh_token_expires_in: refreshExpiresIn || null,
        uses_global_credentials: true,
      },
    };

    if (existing) {
      const { error: upErr } = await supabase
        .from('social_connections')
        .update(connectionData)
        .eq('id', existing.id);
      if (upErr) {
        console.error('[pinterest] update error:', upErr);
        const r = new URL('/auth/pinterest/callback', frontendUrl);
        r.searchParams.set('error', 'Failed to update connection');
        return Response.redirect(r.toString(), 302);
      }
    } else {
      const { error: insErr } = await supabase
        .from('social_connections')
        .insert(connectionData);
      if (insErr) {
        console.error('[pinterest] insert error:', insErr);
        const r = new URL('/auth/pinterest/callback', frontendUrl);
        r.searchParams.set('error', 'Failed to save connection');
        return Response.redirect(r.toString(), 302);
      }
    }

    // Cleanup session
    await supabase.from('pinterest_oauth_sessions').delete().eq('state', state);

    const r = new URL('/auth/pinterest/callback', frontendUrl);
    r.searchParams.set('success', 'true');
    r.searchParams.set('username', username);
    if (session.brand_template_id) r.searchParams.set('brandTemplateId', session.brand_template_id);
    return Response.redirect(r.toString(), 302);

  } catch (err) {
    console.error('[pinterest-oauth-callback] error:', err);
    const r = new URL('/auth/pinterest/callback', frontendUrl);
    r.searchParams.set('error', err instanceof Error ? err.message : 'Unknown error');
    return Response.redirect(r.toString(), 302);
  }
}));

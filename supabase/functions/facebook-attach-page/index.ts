import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { encrypt as encryptGCM } from "../_shared/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

/**
 * Attaches a single Facebook Page (from a previously created OAuth session)
 * to a brand_template_id as a social_connection. Idempotent on (brand, page_id).
 *
 * Body: { session_id: string, page_id: string, set_default?: boolean }
 */
Deno.serve(withPerf({ functionName: 'facebook-attach-page' }, async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = getServiceClient();
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization' }, 401);

    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json();
    const { session_id, page_id, set_default = false } = body;
    if (!session_id || !page_id) return json({ error: 'session_id and page_id required' }, 400);

    // Load session
    const { data: session, error: sessionErr } = await supabase
      .from('facebook_oauth_sessions')
      .select('id, user_id, organization_id, brand_template_id, pages, expires_at')
      .eq('id', session_id)
      .maybeSingle();

    if (sessionErr || !session) return json({ error: 'Session not found' }, 404);
    if (session.user_id !== user.id) return json({ error: 'Forbidden' }, 403);
    if (new Date(session.expires_at) < new Date()) {
      return json({ error: 'Session expired. Please reconnect Facebook.', expired: true }, 410);
    }

    const page = (session.pages as any[]).find((p) => p.id === page_id);
    if (!page) return json({ error: 'Page not in session' }, 404);
    if (!page.access_token) return json({ error: 'Page access token missing' }, 400);

    const tokenExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
    const encryptedToken = await encryptGCM(page.access_token);

    // Check existing connection (brand-scoped or org-scoped)
    let query = supabase
      .from('social_connections')
      .select('id, metadata')
      .eq('platform', 'facebook')
      .eq('platform_user_id', page_id);

    if (session.brand_template_id) {
      query = query.eq('brand_template_id', session.brand_template_id);
    } else if (session.organization_id) {
      query = query.eq('organization_id', session.organization_id).is('brand_template_id', null);
    }

    const { data: existing } = await query.maybeSingle();

    // If set_default requested, unset default on other facebook connections of same brand
    if (set_default && session.brand_template_id) {
      await supabase
        .from('social_connections')
        .update({
          metadata: { is_default: false } as any,
        })
        .eq('platform', 'facebook')
        .eq('brand_template_id', session.brand_template_id)
        .neq('platform_user_id', page_id);
    }

    const baseConnection = {
      organization_id: session.organization_id || null,
      brand_template_id: session.brand_template_id || null,
      user_id: session.user_id,
      platform: 'facebook',
      platform_username: page.name,
      platform_user_id: page_id,
      access_token: encryptedToken,
      refresh_token: null,
      token_expires_at: tokenExpiresAt,
      is_active: true,
      connected_at: new Date().toISOString(),
      scopes: ['pages_manage_posts', 'pages_read_engagement', 'pages_show_list', 'pages_manage_metadata'],
      metadata: {
        page_id,
        page_name: page.name,
        page_category: page.category,
        page_picture: page.picture,
        fan_count: page.fan_count,
        followers_count: page.followers_count,
        token_type: 'page_access_token',
        is_default: set_default,
        uses_global_credentials: true,
      },
    };

    let connection;
    if (existing) {
      const { data, error: updateError } = await supabase
        .from('social_connections')
        .update(baseConnection)
        .eq('id', existing.id)
        .select()
        .single();
      if (updateError) throw updateError;
      connection = data;
    } else {
      const { data, error: insertError } = await supabase
        .from('social_connections')
        .insert(baseConnection)
        .select()
        .single();
      if (insertError) throw insertError;
      connection = data;
    }

    // Subscribe page to webhooks (non-blocking)
    try {
      await fetch(`https://graph.facebook.com/v21.0/${page_id}/subscribed_apps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          subscribed_fields: 'feed',
          access_token: page.access_token,
        }).toString(),
      });
    } catch (e) {
      console.warn('[facebook-attach-page] webhook subscribe failed:', e);
    }

    return json({
      success: true,
      connection_id: connection.id,
      page: {
        id: page_id,
        name: page.name,
        picture: page.picture,
      },
    });
  } catch (e) {
    console.error('[facebook-attach-page] error:', e);
    return json({ error: e instanceof Error ? e.message : 'Internal error' }, 500);
  }
}));

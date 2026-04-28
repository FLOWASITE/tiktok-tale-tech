import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

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
 * GET-style: returns the list of pages from a facebook_oauth_sessions row,
 * plus which pages are already connected (per brand_template_id) so the UI
 * can render "Đã kết nối" badges.
 *
 * Body: { session_id: string }
 */
Deno.serve(withPerf({ functionName: 'facebook-list-session-pages' }, async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = getServiceClient();
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization' }, 401);

    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401);

    const { session_id } = await req.json();
    if (!session_id) return json({ error: 'session_id required' }, 400);

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

    // Strip access_token before returning to client
    const pages = (session.pages as any[]).map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      picture: p.picture,
      fan_count: p.fan_count,
      followers_count: p.followers_count,
    }));

    // Find already-connected pages for this brand
    let connectedPageIds: string[] = [];
    if (session.brand_template_id) {
      const { data: existing } = await supabase
        .from('social_connections')
        .select('platform_user_id')
        .eq('platform', 'facebook')
        .eq('brand_template_id', session.brand_template_id)
        .eq('is_active', true);
      connectedPageIds = (existing || []).map((r: any) => r.platform_user_id).filter(Boolean);
    } else if (session.organization_id) {
      const { data: existing } = await supabase
        .from('social_connections')
        .select('platform_user_id')
        .eq('platform', 'facebook')
        .eq('organization_id', session.organization_id)
        .is('brand_template_id', null)
        .eq('is_active', true);
      connectedPageIds = (existing || []).map((r: any) => r.platform_user_id).filter(Boolean);
    }

    return json({
      success: true,
      session: {
        id: session.id,
        organization_id: session.organization_id,
        brand_template_id: session.brand_template_id,
        expires_at: session.expires_at,
      },
      pages,
      connected_page_ids: connectedPageIds,
    });
  } catch (e) {
    console.error('[facebook-list-session-pages] error:', e);
    return json({ error: e instanceof Error ? e.message : 'Internal error' }, 500);
  }
}));

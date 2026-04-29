import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { encrypt as encryptGCM, decryptCredential } from "../_shared/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(withPerf({ functionName: 'wordpress-com-oauth-callback' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  let frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://app.flowa.one';

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    console.log('[wordpress-com-oauth-callback] received:', { code: !!code, state: !!state, error });

    if (error) throw new Error(`OAuth error: ${errorDescription || error}`);
    if (!code || !state) throw new Error('Missing code or state parameter');

    let stateData: { brandTemplateId: string | null; organizationId: string | null; userId: string; frontendOrigin?: string | null };
    try {
      stateData = JSON.parse(atob(state));
    } catch {
      throw new Error('Invalid state parameter');
    }
    const { brandTemplateId, userId, frontendOrigin } = stateData;
    let { organizationId } = stateData;
    if (frontendOrigin) frontendUrl = frontendOrigin;

    const supabase = getServiceClient();

    if (!organizationId && brandTemplateId) {
      const { data: bt } = await supabase
        .from('brand_templates')
        .select('organization_id')
        .eq('id', brandTemplateId)
        .maybeSingle();
      if (bt?.organization_id) organizationId = bt.organization_id;
    }

    // Load WordPress.com app credentials from social_platform_settings (platform='wordpress')
    const { data: settings } = await supabase
      .from('social_platform_settings')
      .select('consumer_key, consumer_secret')
      .eq('platform', 'wordpress')
      .eq('is_active', true)
      .maybeSingle();

    if (!settings?.consumer_key || !settings?.consumer_secret) {
      throw new Error('WordPress.com chưa cấu hình. Liên hệ Admin để khai báo Client ID/Secret.');
    }

    const clientId = await decryptCredential(settings.consumer_key);
    const clientSecret = await decryptCredential(settings.consumer_secret);
    if (!clientId || !clientSecret) throw new Error('Invalid WordPress.com credentials');

    const redirectUri = `${supabaseUrl}/functions/v1/wordpress-com-oauth-callback`;

    // Exchange code for access token
    const tokenResp = await fetch('https://public-api.wordpress.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const tokenData = await tokenResp.json();
    if (!tokenData.access_token) {
      console.error('[wordpress-com-oauth-callback] token exchange failed:', tokenData);
      throw new Error(tokenData.error_description || tokenData.error || 'Failed to get access token');
    }

    const accessToken = tokenData.access_token as string;
    // WP.com gives blog_id, blog_url, scope at first authorization
    const initialBlogId = tokenData.blog_id ? String(tokenData.blog_id) : null;
    const initialBlogUrl = tokenData.blog_url || null;

    // Fetch user profile
    const meResp = await fetch('https://public-api.wordpress.com/rest/v1.1/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const meData = await meResp.json();

    // Fetch all sites the user can post to
    const sitesResp = await fetch('https://public-api.wordpress.com/rest/v1.2/me/sites?fields=ID,name,URL,description,icon,is_private,capabilities', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const sitesData = await sitesResp.json();
    const allSites = (sitesData.sites || []).map((s: any) => ({
      id: String(s.ID),
      name: s.name || s.URL,
      url: s.URL,
      description: s.description || '',
      icon: s.icon?.img || null,
      can_publish: !!(s.capabilities?.publish_posts || s.capabilities?.edit_posts),
    }));

    const publishableSites = allSites.filter((s: any) => s.can_publish);
    if (publishableSites.length === 0) {
      throw new Error('Tài khoản WordPress.com này không có site nào bạn có quyền đăng bài.');
    }

    // Pick primary site: blog_id from token if it can publish, else first publishable
    const primarySite = publishableSites.find((s: any) => s.id === initialBlogId) || publishableSites[0];

    // Upsert connection (one connection per brand+site)
    let query = supabase
      .from('social_connections')
      .select('id')
      .eq('platform', 'wordpress_com')
      .eq('page_id', primarySite.id);
    if (brandTemplateId) query = query.eq('brand_template_id', brandTemplateId);
    else if (organizationId) query = query.eq('organization_id', organizationId);

    const { data: existing } = await query.maybeSingle();

    const encryptedAccessToken = await encryptGCM(accessToken);

    const connectionData: any = {
      organization_id: organizationId || null,
      brand_template_id: brandTemplateId || null,
      user_id: userId,
      platform: 'wordpress_com',
      platform_user_id: meData?.ID ? String(meData.ID) : primarySite.id,
      platform_username: meData?.username || meData?.display_name || primarySite.name,
      platform_display_name: meData?.display_name || meData?.username || primarySite.name,
      platform_avatar_url: meData?.avatar_URL || primarySite.icon || null,
      access_token: encryptedAccessToken,
      refresh_token: null,
      token_expires_at: null, // WP.com tokens don't expire unless revoked
      is_active: true,
      connected_at: new Date().toISOString(),
      scopes: ['global'],
      page_id: primarySite.id,
      page_name: primarySite.name,
      metadata: {
        sites: publishableSites,
        selected_site_id: primarySite.id,
        selected_site_url: primarySite.url,
        selected_site_name: primarySite.name,
        wp_user_id: meData?.ID,
        wp_username: meData?.username,
        initial_blog_url: initialBlogUrl,
      },
    };

    if (existing) {
      const { error: updErr } = await supabase
        .from('social_connections')
        .update(connectionData)
        .eq('id', existing.id);
      if (updErr) throw new Error(`DB update failed: ${updErr.message}`);
      console.log('[wordpress-com-oauth-callback] UPDATE ok for', existing.id);
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from('social_connections')
        .insert(connectionData)
        .select('id')
        .single();
      if (insErr) throw new Error(`DB insert failed: ${insErr.message}`);
      console.log('[wordpress-com-oauth-callback] INSERT ok, id:', inserted?.id);
    }

    const redirectUrl = `${frontendUrl}/auth/wordpress-com/callback?success=true&platform=wordpress_com&site=${encodeURIComponent(primarySite.name)}&site_url=${encodeURIComponent(primarySite.url)}`;
    return new Response(null, { status: 302, headers: { ...corsHeaders, Location: redirectUrl } });
  } catch (err: any) {
    console.error('[wordpress-com-oauth-callback] error:', err);
    const redirectUrl = `${frontendUrl}/auth/wordpress-com/callback?success=false&error=${encodeURIComponent(err.message)}`;
    return new Response(null, { status: 302, headers: { ...corsHeaders, Location: redirectUrl } });
  }
}));

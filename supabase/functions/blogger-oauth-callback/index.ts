import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { encrypt as encryptGCM, decryptCredential } from "../_shared/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(withPerf({ functionName: 'blogger-oauth-callback' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const frontendUrl = Deno.env.get('FRONTEND_URL') || supabaseUrl.replace('.supabase.co', '.lovableproject.com');

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    console.log('[blogger-oauth-callback] received:', { code: !!code, state: !!state, error });

    if (error) throw new Error(`OAuth error: ${error}`);
    if (!code || !state) throw new Error('Missing code or state parameter');

    let stateData: { brandTemplateId: string | null; organizationId: string | null; userId: string };
    try {
      stateData = JSON.parse(atob(state));
    } catch {
      throw new Error('Invalid state parameter');
    }
    const { brandTemplateId, organizationId, userId } = stateData;

    const supabase = getServiceClient();

    // Get Google credentials (shared with google_business if available, else 'blogger')
    let { data: settings } = await supabase
      .from('social_platform_settings')
      .select('consumer_key, consumer_secret')
      .eq('platform', 'blogger')
      .eq('is_active', true)
      .maybeSingle();

    if (!settings) {
      const { data: gbSettings } = await supabase
        .from('social_platform_settings')
        .select('consumer_key, consumer_secret')
        .eq('platform', 'google_business')
        .eq('is_active', true)
        .maybeSingle();
      settings = gbSettings;
    }

    if (!settings) throw new Error('Blogger chưa được cấu hình. Liên hệ Admin.');

    const clientId = await decryptCredential(settings.consumer_key);
    const clientSecret = await decryptCredential(settings.consumer_secret);
    if (!clientId || !clientSecret) throw new Error('Invalid Google credentials');

    const redirectUri = `${supabaseUrl}/functions/v1/blogger-oauth-callback`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.error || 'Failed to get access token');
    }

    const accessToken = tokenData.access_token as string;
    const refreshToken = tokenData.refresh_token as string | undefined;
    const expiresIn = tokenData.expires_in || 3600;

    // Fetch user's blogs
    const blogsResp = await fetch('https://www.googleapis.com/blogger/v3/users/self/blogs', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const blogsData = await blogsResp.json();
    const blogs = (blogsData.items || []).map((b: any) => ({
      id: b.id,
      name: b.name,
      url: b.url,
      description: b.description || '',
      posts_count: b.posts?.totalItems || 0,
    }));

    if (blogs.length === 0) {
      throw new Error('Tài khoản Google này không có blog Blogger nào. Hãy tạo blog tại blogger.com trước.');
    }

    const primaryBlog = blogs[0];
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Upsert connection
    let query = supabase
      .from('social_connections')
      .select('id, metadata')
      .eq('platform', 'blogger');
    if (brandTemplateId) query = query.eq('brand_template_id', brandTemplateId);
    else if (organizationId) query = query.eq('organization_id', organizationId);

    const { data: existing } = await query.maybeSingle();

    const encryptedAccessToken = await encryptGCM(accessToken);
    const encryptedRefreshToken = refreshToken ? await encryptGCM(refreshToken) : (existing as any)?.refresh_token ?? null;

    const connectionData: any = {
      organization_id: organizationId || null,
      brand_template_id: brandTemplateId || null,
      user_id: userId,
      platform: 'blogger',
      platform_user_id: primaryBlog.id,
      platform_username: primaryBlog.name,
      platform_display_name: primaryBlog.name,
      access_token: encryptedAccessToken,
      refresh_token: encryptedRefreshToken,
      token_expires_at: tokenExpiresAt,
      is_active: true,
      connected_at: new Date().toISOString(),
      scopes: ['https://www.googleapis.com/auth/blogger'],
      page_id: primaryBlog.id,
      page_name: primaryBlog.name,
      metadata: {
        blogs,
        selected_blog_id: primaryBlog.id,
        selected_blog_url: primaryBlog.url,
        selected_blog_name: primaryBlog.name,
        uses_global_credentials: true,
      },
    };

    if (existing) {
      await supabase.from('social_connections').update(connectionData).eq('id', existing.id);
    } else {
      await supabase.from('social_connections').insert(connectionData);
    }

    const redirectUrl = `${frontendUrl}/auth/blogger/callback?success=true&platform=blogger&username=${encodeURIComponent(primaryBlog.name)}`;
    return new Response(null, { status: 302, headers: { ...corsHeaders, Location: redirectUrl } });
  } catch (error: any) {
    console.error('[blogger-oauth-callback] error:', error);
    const redirectUrl = `${frontendUrl}/auth/blogger/callback?success=false&error=${encodeURIComponent(error.message)}`;
    return new Response(null, { status: 302, headers: { ...corsHeaders, Location: redirectUrl } });
  }
}));

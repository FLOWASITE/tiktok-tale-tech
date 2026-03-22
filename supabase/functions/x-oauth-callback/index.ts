import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { buildOAuth1Header } from "../_shared/oauth1a.ts";
import { decryptCredential } from "../_shared/crypto.ts";

const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/,
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/,
  /^https:\/\/(app\.)?flowa\.(one|vn)$/,
  /^http:\/\/localhost(:\d+)?$/,
  /^https:\/\/id-preview--[a-z0-9-]+\.lovable\.app$/,
];

function isAllowedOrigin(origin: string): boolean {
  return ALLOWED_ORIGIN_PATTERNS.some(p => p.test(origin));
}

function getFrontendUrl(stateOrigin?: string | null): string {
  if (stateOrigin && isAllowedOrigin(stateOrigin)) return stateOrigin;
  const configured = Deno.env.get('FRONTEND_URL');
  if (configured) return configured;
  return 'https://tiktok-tale-tech.lovable.app';
}

function buildRedirect(frontendOrigin: string | null, params: Record<string, string>): Response {
  const searchParams = new URLSearchParams(params);
  return Response.redirect(`${getFrontendUrl(frontendOrigin)}/auth/x/callback?${searchParams}`, 302);
}

function buildErrorRedirect(frontendOrigin: string | null, code: string, message: string, brandTemplateId?: string, hint?: string): Response {
  const params: Record<string, string> = { error: code, error_description: message };
  if (hint) params.error_hint = hint;
  if (brandTemplateId) params.brand_template_id = brandTemplateId;
  return buildRedirect(frontendOrigin, params);
}

async function getConsumerCredentials(supabase: any): Promise<{ key: string; secret: string }> {
  // Try social_platform_settings first
  const { data } = await supabase
    .from('social_platform_settings')
    .select('consumer_key, consumer_secret')
    .eq('platform', 'twitter')
    .eq('is_active', true)
    .single();

  if (data?.consumer_key && data?.consumer_secret) {
    const [key, secret] = await Promise.all([
      decryptCredential(data.consumer_key),
      decryptCredential(data.consumer_secret),
    ]);
    if (key && secret) return { key, secret };
  }

  // Fallback to env vars
  const key = Deno.env.get('TWITTER_CONSUMER_KEY');
  const secret = Deno.env.get('TWITTER_CONSUMER_SECRET');
  if (key && secret) return { key, secret };

  throw new Error('Twitter Consumer Key/Secret not configured');
}

Deno.serve(withPerf({ functionName: 'x-oauth-callback' }, async (req) => {
  let frontendOrigin: string | null = null;
  let brandTemplateId: string | undefined;

  try {
    const url = new URL(req.url);
    const oauthToken = url.searchParams.get('oauth_token');
    const oauthVerifier = url.searchParams.get('oauth_verifier');
    const stateParam = url.searchParams.get('state');
    const denied = url.searchParams.get('denied');

    console.log('X OAuth 1.0a callback received:', { hasToken: !!oauthToken, hasVerifier: !!oauthVerifier, denied: !!denied });

    // Parse state
    let stateData: any = {};
    if (stateParam) {
      try {
        stateData = JSON.parse(atob(decodeURIComponent(stateParam)));
        frontendOrigin = stateData.frontendOrigin || null;
        brandTemplateId = stateData.brandTemplateId;
      } catch { /* ignore */ }
    }

    if (denied) {
      return buildErrorRedirect(frontendOrigin, 'access_denied', 'Bạn đã từ chối quyền truy cập', brandTemplateId);
    }

    if (!oauthToken || !oauthVerifier) {
      return buildErrorRedirect(frontendOrigin, 'x_missing_params', 'Thiếu thông tin xác thực từ X', brandTemplateId);
    }

    const { organizationId, userId, oauthTokenSecret } = stateData;
    if (!oauthTokenSecret) {
      return buildErrorRedirect(frontendOrigin, 'x_missing_params', 'Thiếu oauth_token_secret trong state', brandTemplateId);
    }

    console.log('State decoded:', { brandTemplateId, organizationId, userId });

    const supabase = getServiceClient();
    const creds = await getConsumerCredentials(supabase);

    // Step 3: Exchange for access token
    const accessTokenUrl = 'https://api.x.com/oauth/access_token';
    const oauthHeader = buildOAuth1Header(
      'POST',
      accessTokenUrl,
      creds.key,
      creds.secret,
      oauthToken,
      oauthTokenSecret,
      { oauth_verifier: oauthVerifier }
    );

    const atResponse = await fetch(accessTokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': oauthHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `oauth_verifier=${encodeURIComponent(oauthVerifier)}`,
    });

    const atText = await atResponse.text();
    console.log('Access token response status:', atResponse.status);

    if (!atResponse.ok) {
      console.error('Access token exchange failed:', atText);
      return buildErrorRedirect(frontendOrigin, 'x_token_exchange_failed', 'Không thể đổi mã xác thực từ X', brandTemplateId,
        'Thử kết nối lại. Nếu vẫn lỗi, kiểm tra Consumer Key/Secret.');
    }

    const atParams = new URLSearchParams(atText);
    const accessToken = atParams.get('oauth_token')!;
    const accessTokenSecret = atParams.get('oauth_token_secret')!;
    const xUserId = atParams.get('user_id');
    const xScreenName = atParams.get('screen_name');

    console.log('Access token obtained for:', xScreenName);

    // Fetch user profile via OAuth 1.0a
    let profileImageUrl: string | null = null;
    let displayName = xScreenName || 'X Account';
    try {
      const profileUrl = 'https://api.x.com/2/users/me?user.fields=profile_image_url,name,username';
      const profileHeader = buildOAuth1Header('GET', 'https://api.x.com/2/users/me', creds.key, creds.secret, accessToken, accessTokenSecret, {
        'user.fields': 'profile_image_url,name,username',
      });

      const profileResponse = await fetch(profileUrl, {
        headers: { 'Authorization': profileHeader },
      });

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        const userData = profileData.data;
        if (userData) {
          displayName = userData.name || displayName;
          profileImageUrl = userData.profile_image_url?.replace('_normal', '_400x400') || null;
        }
        console.log('Profile fetched:', { username: userData?.username, name: userData?.name });
      } else {
        const errText = await profileResponse.text();
        console.warn('Profile fetch failed (non-critical):', profileResponse.status, errText);
      }
    } catch (profileErr) {
      console.warn('Profile fetch error (non-critical):', profileErr);
    }

    // Save to database
    let query = supabase.from('social_connections').select('id').eq('platform', 'twitter');
    if (brandTemplateId) query = query.eq('brand_template_id', brandTemplateId);
    else if (organizationId) query = query.eq('organization_id', organizationId);

    const { data: existingConnection } = await query.maybeSingle();

    const connectionData: Record<string, unknown> = {
      organization_id: organizationId || null,
      brand_template_id: brandTemplateId || null,
      user_id: userId,
      platform: 'twitter',
      platform_user_id: xUserId || null,
      platform_username: xScreenName || null,
      platform_display_name: displayName,
      platform_avatar_url: profileImageUrl,
      access_token: accessToken,
      refresh_token: accessTokenSecret, // OAuth 1.0a access_token_secret stored here
      token_expires_at: null, // OAuth 1.0a tokens don't expire
      is_active: true,
      connected_at: new Date().toISOString(),
      last_verified_at: new Date().toISOString(),
      scopes: ['tweet.read', 'tweet.write', 'users.read'],
      last_error: null,
      metadata: {
        oauth_version: '1.0a',
        token_type: 'oauth1',
      },
    };

    let connection;
    if (existingConnection) {
      const { data, error: updateError } = await supabase.from('social_connections').update(connectionData).eq('id', existingConnection.id).select().single();
      if (updateError) throw updateError;
      connection = data;
    } else {
      const { data, error: insertError } = await supabase.from('social_connections').insert(connectionData).select().single();
      if (insertError) throw insertError;
      connection = data;
    }

    const redirectParams: Record<string, string> = {
      success: 'true',
      username: xScreenName || 'unknown',
      display_name: displayName,
      connection_id: connection.id,
    };
    if (brandTemplateId) redirectParams.brand_template_id = brandTemplateId;

    return buildRedirect(frontendOrigin, redirectParams);

  } catch (error) {
    console.error('X OAuth 1.0a callback error:', error);
    return buildErrorRedirect(frontendOrigin || null, 'x_callback_failed',
      'Đã xảy ra lỗi khi kết nối X. Vui lòng thử lại.', brandTemplateId);
  }
}));

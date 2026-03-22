import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";


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

function extractFrontendOrigin(req: Request): string | null {
  try {
    const url = new URL(req.url);
    const state = url.searchParams.get('state');
    if (state) return JSON.parse(atob(state)).frontendOrigin;
  } catch { /* ignore */ }
  return null;
}

interface NormalizedError {
  code: string;
  message: string;
  hint?: string;
}

function normalizeXError(rawText: string, context: string): NormalizedError {
  try {
    const parsed = JSON.parse(rawText);
    if (parsed.reason === 'client-not-enrolled') {
      return {
        code: 'x_client_not_enrolled',
        message: 'App X chưa đủ quyền truy cập API v2',
        hint: `Kiểm tra: (1) App đã gắn vào Project, (2) Project có API access phù hợp (Basic trở lên), (3) Client ID/Secret khớp app đã gắn Project. Required: ${parsed.required_enrollment || 'N/A'}`,
      };
    }
    if (parsed.error === 'invalid_request' || parsed.error === 'invalid_grant') {
      return {
        code: 'x_token_exchange_failed',
        message: 'Không thể đổi mã xác thực từ X',
        hint: 'Thử kết nối lại. Nếu vẫn lỗi, kiểm tra cấu hình Redirect URI',
      };
    }
  } catch { /* not JSON */ }

  return {
    code: context === 'token' ? 'x_token_exchange_failed' : 'x_callback_failed',
    message: context === 'token' ? 'Lỗi khi đổi mã xác thực' : 'Lỗi khi lấy thông tin tài khoản X',
  };
}

function buildRedirect(frontendOrigin: string | null, params: Record<string, string>): Response {
  const searchParams = new URLSearchParams(params);
  return Response.redirect(`${getFrontendUrl(frontendOrigin)}/auth/x/callback?${searchParams}`, 302);
}

function buildErrorRedirect(frontendOrigin: string | null, error: NormalizedError, brandTemplateId?: string): Response {
  const params: Record<string, string> = {
    error: error.code,
    error_description: error.message,
  };
  if (error.hint) params.error_hint = error.hint;
  if (brandTemplateId) params.brand_template_id = brandTemplateId;
  return buildRedirect(frontendOrigin, params);
}

serve(async (req) => {
  let frontendOrigin: string | null = null;
  let brandTemplateId: string | undefined;

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    frontendOrigin = extractFrontendOrigin(req);
    console.log('X OAuth callback received:', { hasCode: !!code, hasState: !!state, error });

    if (error) {
      const normalized: NormalizedError = error === 'access_denied'
        ? { code: 'access_denied', message: 'Bạn đã từ chối quyền truy cập' }
        : { code: 'x_oauth_error', message: `Lỗi từ X: ${error}` };
      return buildErrorRedirect(frontendOrigin, normalized);
    }

    if (!code || !state) {
      return buildErrorRedirect(frontendOrigin, { code: 'x_missing_params', message: 'Thiếu thông tin xác thực từ X' });
    }

    let stateData;
    try {
      stateData = JSON.parse(atob(state));
    } catch {
      return buildErrorRedirect(frontendOrigin, { code: 'x_invalid_state', message: 'Dữ liệu state không hợp lệ' });
    }

    const { organizationId, userId, codeVerifier } = stateData;
    brandTemplateId = stateData.brandTemplateId;
    frontendOrigin = stateData.frontendOrigin || frontendOrigin;
    console.log('State decoded:', { brandTemplateId, organizationId, userId, hasFrontendOrigin: !!frontendOrigin, hasCodeVerifier: !!codeVerifier });

    if (!codeVerifier) {
      return buildErrorRedirect(frontendOrigin, { code: 'x_missing_verifier', message: 'Thiếu code_verifier' }, brandTemplateId);
    }

    const clientId = Deno.env.get('X_CLIENT_ID')!;
    const clientSecret = Deno.env.get('X_CLIENT_SECRET')!;
    const callbackUrl = Deno.env.get('X_CALLBACK_URL')!;

    // Exchange code for tokens
    console.log('Exchanging code for tokens...');
    const tokenResponse = await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`),
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: callbackUrl,
        client_id: clientId,
        code_verifier: codeVerifier,
      }).toString(),
    });

    const tokenText = await tokenResponse.text();
    console.log('Token response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokenText);
      return buildErrorRedirect(frontendOrigin, normalizeXError(tokenText, 'token'), brandTemplateId);
    }

    const tokenData = JSON.parse(tokenText);
    const { access_token, refresh_token, expires_in } = tokenData;
    console.log('Tokens obtained, expires_in:', expires_in);

    // Fetch user profile — tolerate failure
    console.log('Fetching X user profile...');
    let xUser: { id: string; username: string; name: string; profile_image_url?: string } | null = null;
    let profileWarning: string | null = null;

    const userResponse = await fetch('https://api.x.com/2/users/me?user.fields=profile_image_url,name,username', {
      headers: { 'Authorization': `Bearer ${access_token}` },
    });

    const userText = await userResponse.text();
    if (userResponse.ok) {
      xUser = JSON.parse(userText).data;
      console.log('X user:', { id: xUser!.id, username: xUser!.username, name: xUser!.name });
    } else {
      console.warn('User fetch failed (will save limited connection):', userText);
      const normalized = normalizeXError(userText, 'user');
      profileWarning = normalized.code;
    }

    const tokenExpiresAt = new Date(Date.now() + (expires_in || 7200) * 1000).toISOString();

    // Save to database — even if profile fetch failed
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    let query = supabase.from('social_connections').select('id').eq('platform', 'twitter');
    if (brandTemplateId) query = query.eq('brand_template_id', brandTemplateId);
    else if (organizationId) query = query.eq('organization_id', organizationId);

    const { data: existingConnection } = await query.maybeSingle();

    const connectionData: Record<string, unknown> = {
      organization_id: organizationId || null,
      brand_template_id: brandTemplateId || null,
      user_id: userId,
      platform: 'twitter',
      platform_user_id: xUser?.id || null,
      platform_username: xUser?.username || null,
      platform_display_name: xUser?.name || null,
      platform_avatar_url: xUser?.profile_image_url?.replace('_normal', '_400x400') || null,
      access_token,
      refresh_token: refresh_token || null,
      token_expires_at: tokenExpiresAt,
      is_active: true,
      connected_at: new Date().toISOString(),
      last_verified_at: xUser ? new Date().toISOString() : null,
      scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
      metadata: {
        oauth2_pkce: true,
        token_type: 'bearer',
        ...(profileWarning ? { profile_status: 'unavailable', oauth_warning_code: profileWarning } : {}),
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
      username: xUser?.username || 'unknown',
      display_name: xUser?.name || 'X Account',
      connection_id: connection.id,
    };
    if (brandTemplateId) redirectParams.brand_template_id = brandTemplateId;
    if (profileWarning) redirectParams.warning = profileWarning;

    return buildRedirect(frontendOrigin, redirectParams);

  } catch (error) {
    console.error('X OAuth callback error:', error);
    return buildErrorRedirect(frontendOrigin, {
      code: 'x_callback_failed',
      message: 'Đã xảy ra lỗi khi kết nối X. Vui lòng thử lại.',
    }, brandTemplateId);
  }
});

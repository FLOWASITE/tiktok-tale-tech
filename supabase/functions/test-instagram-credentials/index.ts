import { decryptCredential } from "../_shared/crypto.ts";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestRequest {
  platform: string;
  useStoredCredentials?: boolean;
  appId?: string;
  appSecret?: string;
}

function trimCredential(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function extractErrorDetail(responseText: string): string {
  try {
    const payload = JSON.parse(responseText);

    if (typeof payload?.error_message === 'string' && payload.error_message.trim()) {
      return payload.error_message.trim();
    }

    if (typeof payload?.error_description === 'string' && payload.error_description.trim()) {
      return payload.error_description.trim();
    }

    if (typeof payload?.error === 'string' && payload.error.trim()) {
      return payload.error.trim();
    }

    if (typeof payload?.error?.message === 'string' && payload.error.message.trim()) {
      return payload.error.message.trim();
    }
  } catch {
    // Ignore JSON parse issues and fall back to raw text.
  }

  return responseText.trim();
}

function isRedirectIssue(message: string): boolean {
  const normalized = message.toLowerCase();
  return [
    'redirect_uri',
    'redirect uri',
    'redirect url',
    'oauth callback url',
    'used in the oauth dialog request',
    'valid oauth redirect uris',
  ].some((needle) => normalized.includes(needle));
}

function isCredentialIssue(message: string): boolean {
  const normalized = message.toLowerCase();
  return [
    'invalid client',
    'invalid_client',
    'client_id',
    'client id',
    'client secret',
    'app secret',
    'app id',
    'invalid platform app',
    'error validating application',
    'cannot get application info',
  ].some((needle) => normalized.includes(needle));
}

function isExpectedCodeValidationFailure(message: string): boolean {
  const normalized = message.toLowerCase();
  return [
    'invalid code',
    'authorization code',
    'verification code',
    'code has expired',
    'code was used',
    'error validating verification code',
  ].some((needle) => normalized.includes(needle));
}

Deno.serve(withPerf({ functionName: 'test-instagram-credentials' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getServiceClient();

    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = roles?.some(r => r.role === 'admin');
    if (!isAdmin) {
      throw new Error('Admin access required');
    }

    const body: TestRequest = await req.json();
    const { platform, useStoredCredentials, appId: rawAppId, appSecret: rawAppSecret } = body;

    if (platform !== 'instagram') {
      throw new Error('This endpoint is for Instagram only');
    }

    let appId = trimCredential(rawAppId);
    let appSecret = trimCredential(rawAppSecret);

    if (useStoredCredentials || (!appId && !appSecret)) {
      console.log('Fetching stored credentials for Instagram...');

      const { data: settings, error: settingsError } = await supabase
        .from('social_platform_settings')
        .select('consumer_key, consumer_secret')
        .eq('platform', 'instagram')
        .eq('is_active', true)
        .single();

      if (settingsError || !settings) {
        throw new Error('Không tìm thấy cấu hình cho Instagram');
      }

      if (!settings.consumer_key || !settings.consumer_secret) {
        throw new Error('Instagram App ID/Secret chưa được cấu hình');
      }

      appId = trimCredential(await decryptCredential(settings.consumer_key));
      appSecret = trimCredential(await decryptCredential(settings.consumer_secret));

      if (!appId || !appSecret) {
        throw new Error('Không thể giải mã credentials - kiểm tra encryption key');
      }
    }

    if (!appId || !appSecret) {
      throw new Error('Instagram App ID và Instagram App Secret là bắt buộc');
    }

    const maskedId = appId.slice(0, 4) + '****' + appId.slice(-4);
    console.log(`Testing Instagram credentials... appId=${maskedId}, secretLen=${appSecret.length}`);

    const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/instagram-oauth-callback`;

    // Instagram Login does not support the Facebook Graph client_credentials app check
    // used by Facebook/Threads. Instead, we preflight the real OAuth token exchange with
    // a deliberately invalid code. If the response reaches code validation, the App ID,
    // App Secret, and redirect URI are wired correctly for the current Instagram flow.
    const preflightResponse = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        grant_type: 'authorization_code',
        redirect_uri: callbackUrl,
        code: 'lovable_preflight_invalid_code',
      }),
    });

    const responseText = await preflightResponse.text();
    const detail = extractErrorDetail(responseText);
    const normalizedDetail = detail || responseText;

    console.log('Instagram OAuth preflight response:', preflightResponse.status, normalizedDetail.slice(0, 200));

    if (isRedirectIssue(normalizedDetail)) {
      throw new Error('OAuth Callback URL chưa được cấu hình đúng trong Business login settings.');
    }

    if (isCredentialIssue(normalizedDetail)) {
      throw new Error(
        'Instagram App ID hoặc App Secret không hợp lệ. ' +
        'Hãy lấy từ Meta App Dashboard → Instagram → API setup with Instagram login → Business login settings.'
      );
    }

    const looksLikeExpectedInvalidCode = isExpectedCodeValidationFailure(normalizedDetail);

    if (!preflightResponse.ok && !looksLikeExpectedInvalidCode) {
      throw new Error(
        `Không thể xác minh Instagram Login credentials (HTTP ${preflightResponse.status}). ` +
        (detail ? `Meta API: ${detail}. ` : '') +
        'Hãy kiểm tra lại Business login settings và callback URL.'
      );
    }

    console.log('Instagram credentials verified successfully via OAuth preflight');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Instagram Login credentials hợp lệ cho OAuth flow ✓',
        details: {
          appId: maskedId,
          appName: null,
          platform: 'instagram',
          callbackUrl,
          validationMode: looksLikeExpectedInvalidCode ? 'oauth-preflight' : 'oauth-token-response',
          note: `Đảm bảo đã thêm callback URL vào Valid OAuth Redirect URIs trong Business login settings: ${callbackUrl}`,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Test Instagram credentials error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        hint: 'Kiểm tra Instagram App ID và Instagram App Secret tại Meta App Dashboard → Instagram → API setup with Instagram login → Business login settings.',
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));

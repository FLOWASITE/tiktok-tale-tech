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

Deno.serve(withPerf({ functionName: 'test-pinterest-credentials' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getServiceClient();

    // Verify admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    const isAdmin = roles?.some((r: { role: string }) => r.role === 'admin');
    if (!isAdmin) throw new Error('Admin access required');

    const body: TestRequest = await req.json();
    const { platform, useStoredCredentials, appId: rawAppId, appSecret: rawAppSecret } = body;
    if (platform !== 'pinterest') throw new Error('This endpoint is for Pinterest only');

    let appId = rawAppId;
    let appSecret = rawAppSecret;

    if (useStoredCredentials || (!appId && !appSecret)) {
      const { data: settings, error: settingsError } = await supabase
        .from('social_platform_settings')
        .select('consumer_key, consumer_secret')
        .eq('platform', 'pinterest')
        .eq('is_active', true)
        .single();

      if (settingsError || !settings) {
        throw new Error('Không tìm thấy cấu hình cho Pinterest');
      }
      if (!settings.consumer_key || !settings.consumer_secret) {
        throw new Error('App ID/Secret chưa được cấu hình');
      }

      try {
        appId = await decryptCredential(settings.consumer_key) || undefined;
        appSecret = await decryptCredential(settings.consumer_secret) || undefined;
      } catch (e) {
        console.error('[test-pinterest-credentials] decrypt error:', e);
        throw new Error('Không thể giải mã credentials - kiểm tra encryption key');
      }
    }

    if (!appId || !appSecret) {
      throw new Error('App ID và App Secret là bắt buộc');
    }

    // Pinterest doesn't support client_credentials grant, so we validate by
    // hitting the OAuth token endpoint with a dummy auth code. A 4xx response
    // with `invalid_grant` means credentials are valid (Basic auth accepted);
    // an `invalid_client` response means credentials are wrong.
    const basicAuth = btoa(`${appId}:${appSecret}`);
    const res = await fetch('https://api.pinterest.com/v5/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: 'invalid_test_code',
        redirect_uri: 'https://example.com/callback',
      }).toString(),
    });

    const responseText = await res.text();
    console.log('[test-pinterest-credentials] status:', res.status, responseText.slice(0, 200));

    let parsed: any = null;
    try { parsed = JSON.parse(responseText); } catch { /* ignore */ }

    // 401 with invalid_client → bad credentials
    if (res.status === 401 || parsed?.code === 1 || parsed?.error === 'invalid_client') {
      throw new Error('Pinterest App ID/Secret không hợp lệ');
    }

    // Any other response (typically 400 invalid_grant) means Basic auth was accepted
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Pinterest API credentials hợp lệ! ✓',
        details: {
          appId,
          platform: 'pinterest',
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[test-pinterest-credentials] error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        hint: 'Kiểm tra lại App ID và App Secret từ Pinterest Developer Portal (developers.pinterest.com)',
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));

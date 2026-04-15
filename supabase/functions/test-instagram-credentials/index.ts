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

Deno.serve(withPerf({ functionName: 'test-instagram-credentials' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getServiceClient();

    const authHeader = req.headers.get('Authorization');
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

    let appId = rawAppId;
    let appSecret = rawAppSecret;

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

      appId = await decryptCredential(settings.consumer_key);
      appSecret = await decryptCredential(settings.consumer_secret);

      if (!appId || !appSecret) {
        throw new Error('Không thể giải mã credentials - kiểm tra encryption key');
      }
    }

    if (!appId || !appSecret) {
      throw new Error('Instagram App ID và Instagram App Secret là bắt buộc');
    }

    const maskedId = appId.slice(0, 4) + '****' + appId.slice(-4);
    console.log(`Testing Instagram credentials... appId=${maskedId}, secretLen=${appSecret.length}`);

    // Use OAuth client_credentials grant — works for both Facebook App ID and Instagram App ID
    const tokenUrl = new URL('https://graph.facebook.com/v24.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', appId);
    tokenUrl.searchParams.set('client_secret', appSecret);
    tokenUrl.searchParams.set('grant_type', 'client_credentials');

    const testResponse = await fetch(tokenUrl.toString(), { method: 'GET' });
    const responseText = await testResponse.text();
    console.log('Meta OAuth token response:', testResponse.status, responseText.slice(0, 200));

    if (!testResponse.ok) {
      let detail = '';
      try {
        const errorData = JSON.parse(responseText);
        detail = errorData.error?.message || '';
      } catch { /* ignore parse errors */ }

      throw new Error(
        `App ID hoặc App Secret không hợp lệ (HTTP ${testResponse.status}). ` +
        (detail ? `Meta API: ${detail}. ` : '') +
        `Hãy kiểm tra tại Meta App Dashboard → Settings → Basic.`
      );
    }

    // Token received — now fetch app info to confirm
    let appName = 'Unknown';
    try {
      const tokenData = JSON.parse(responseText);
      const infoRes = await fetch(
        `https://graph.facebook.com/v24.0/${appId}?access_token=${tokenData.access_token}&fields=id,name`
      );
      if (infoRes.ok) {
        const info = await infoRes.json();
        appName = info.name || appName;
      }
    } catch { /* non-critical */ }

    console.log('Instagram credentials verified successfully!', appName);

    console.log('Instagram credentials verified successfully!', appData.name);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Instagram API credentials hợp lệ! ✓',
        details: {
          appId: appData.id,
          appName: appData.name,
          platform: 'instagram',
          note: 'Đảm bảo App đã thêm Instagram Product và cấu hình Business login settings',
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

import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { decryptCredential } from "../_shared/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(withPerf({ functionName: 'test-tiktok-credentials' }, async (req) => {
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

    // Check admin role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = roles?.some(r => r.role === 'admin');
    if (!isAdmin) {
      throw new Error('Admin access required');
    }

    const body = await req.json();
    const { platform, useStoredCredentials, clientKey: rawClientKey, clientSecret: rawClientSecret } = body;

    if (platform !== 'tiktok') {
      throw new Error('This endpoint is for TikTok only');
    }

    let clientKey = rawClientKey;
    let clientSecret = rawClientSecret;

    if (useStoredCredentials || (!clientKey && !clientSecret)) {
      console.log('Fetching stored credentials for TikTok...');

      const { data: settings, error: settingsError } = await supabase
        .from('social_platform_settings')
        .select('consumer_key, consumer_secret')
        .eq('platform', 'tiktok')
        .eq('is_active', true)
        .single();

      if (settingsError || !settings) {
        throw new Error('Không tìm thấy cấu hình cho TikTok');
      }

      if (!settings.consumer_key || !settings.consumer_secret) {
        throw new Error('Client Key/Secret chưa được cấu hình');
      }

      try {
        [clientKey, clientSecret] = await Promise.all([
          decryptCredential(settings.consumer_key),
          decryptCredential(settings.consumer_secret),
        ]);
      } catch {
        throw new Error('Không thể giải mã credentials - kiểm tra encryption key');
      }
    }

    if (!clientKey || !clientSecret) {
      throw new Error('Client Key và Client Secret là bắt buộc');
    }

    console.log('Testing TikTok credentials...');

    // TikTok doesn't have a direct "validate app credentials" endpoint like Facebook.
    // We test by requesting a client access token (client_credentials grant).
    const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
      }).toString(),
    });

    const tokenData = await tokenResponse.json();

    // If we get an access_token or no error, credentials are valid
    if (tokenData.access_token) {
      console.log('TikTok credentials verified successfully!');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'TikTok API credentials hợp lệ! ✓',
          details: {
            clientKey: clientKey.slice(0, 6) + '****',
            platform: 'tiktok',
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for specific errors
    const errorMsg = tokenData.error_description || tokenData.message || 'Invalid credentials';
    throw new Error(`TikTok API: ${errorMsg}`);

  } catch (error: any) {
    console.error('Test TikTok credentials error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        hint: 'Kiểm tra lại Client Key và Client Secret từ TikTok Developer Portal',
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));

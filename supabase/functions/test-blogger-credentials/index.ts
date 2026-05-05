import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { decryptCredential } from "../_shared/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestRequest {
  platform: string;
  useStoredCredentials?: boolean;
  consumerKey?: string;
  consumerSecret?: string;
}

Deno.serve(withPerf({ functionName: 'test-blogger-credentials' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getServiceClient();

    // Verify admin role
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
    const { useStoredCredentials, consumerKey: rawKey, consumerSecret: rawSecret } = body;

    let clientId = rawKey;
    let clientSecret = rawSecret;

    // Blogger uses Google OAuth — fallback to google_business credentials if blogger row absent
    if (useStoredCredentials || (!clientId && !clientSecret)) {
      console.log('Fetching stored credentials for blogger (with google_business fallback)...');

      let { data: settings } = await supabase
        .from('social_platform_settings')
        .select('consumer_key, consumer_secret')
        .eq('platform', 'blogger')
        .eq('is_active', true)
        .maybeSingle();

      if (!settings || !settings.consumer_key || !settings.consumer_secret) {
        const { data: gbSettings } = await supabase
          .from('social_platform_settings')
          .select('consumer_key, consumer_secret')
          .eq('platform', 'google_business')
          .eq('is_active', true)
          .maybeSingle();
        settings = gbSettings;
      }

      if (!settings || !settings.consumer_key || !settings.consumer_secret) {
        throw new Error('Chưa cấu hình Client ID/Secret cho Blogger (cũng không có fallback từ Google Business)');
      }

      try {
        clientId = await decryptCredential(settings.consumer_key);
        clientSecret = await decryptCredential(settings.consumer_secret);
      } catch (e) {
        console.error('decryptCredential failed:', e);
        throw new Error('Không thể giải mã credentials - kiểm tra encryption key');
      }
    }

    if (!clientId || !clientSecret) {
      throw new Error('Client ID và Client Secret là bắt buộc');
    }

    // Validate Google OAuth Client ID format
    if (!clientId.includes('.apps.googleusercontent.com')) {
      throw new Error('Client ID không hợp lệ - phải có đuôi .apps.googleusercontent.com');
    }

    if (clientSecret.length < 20) {
      throw new Error('Client Secret không hợp lệ - quá ngắn');
    }

    // Live verify against Google OAuth: gửi refresh_token rỗng để Google trả về
    // - "invalid_client" nếu Client ID/Secret SAI
    // - "invalid_grant" nếu Client ID/Secret ĐÚNG (vì grant rỗng)
    let liveStatus: 'verified' | 'invalid_client' | 'unknown' = 'unknown';
    let liveError: string | null = null;
    try {
      const probe = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
          refresh_token: 'invalid-probe-token',
        }).toString(),
      });
      const probeData = await probe.json().catch(() => ({}));
      const errCode = String(probeData?.error || '').toLowerCase();
      const errDesc = String(probeData?.error_description || '').toLowerCase();
      if (errCode === 'invalid_client' || errDesc.includes('client secret')) {
        liveStatus = 'invalid_client';
        liveError = probeData?.error_description || 'Client Secret không khớp Client ID';
      } else {
        // invalid_grant / unauthorized_client / etc → credentials hợp lệ
        liveStatus = 'verified';
      }
    } catch (probeErr) {
      console.error('[test-blogger-credentials] live probe failed:', probeErr);
    }

    if (liveStatus === 'invalid_client') {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Google từ chối: ${liveError}. Mở Google Cloud Console → APIs & Services → Credentials, mở đúng OAuth Client (Web application) đang dùng, copy lại Client ID + Client Secret và lưu lại tại đây.`,
          hint: 'Lưu ý: copy "Client secret" — KHÔNG copy "Secret ID". Client ID và Client Secret phải cùng một OAuth Client.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: liveStatus === 'verified'
          ? 'Blogger credentials đã được Google xác thực ✓'
          : 'Blogger credentials hợp lệ (định dạng) ✓ — chưa probe được Google, hãy thử kết nối thật.',
        details: {
          clientIdFormat: 'valid',
          clientSecretFormat: 'valid',
          googleVerification: liveStatus,
          platform: 'blogger',
          note: 'Đảm bảo đã enable Blogger API v3, thêm scope https://www.googleapis.com/auth/blogger trong consent screen, và Authorized redirect URI trùng với OAuth Callback URL trong dialog.',
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Test Blogger credentials error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        hint: 'Kiểm tra Client ID/Secret từ Google Cloud Console → APIs & Services → Credentials, và bật Blogger API v3.',
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));

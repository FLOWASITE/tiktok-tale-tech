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

// Decryption now uses shared decryptCredential (GCM with legacy CBC fallback)

Deno.serve(withPerf({ functionName: 'test-google-business-credentials' }, async (req) => {
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

    // Check admin role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = roles?.some(r => r.role === 'admin');
    if (!isAdmin) {
      throw new Error('Admin access required');
    }

    const body: TestRequest = await req.json();
    const { platform: rawPlatform, useStoredCredentials, consumerKey: rawKey, consumerSecret: rawSecret } = body;

    if (!rawPlatform) {
      throw new Error('platform is required');
    }

    // Normalize: 'google-business' / 'google_maps' -> 'google_business'
    const platform = (rawPlatform === 'google-business' || rawPlatform === 'google_maps')
      ? 'google_business'
      : rawPlatform;

    let clientId = rawKey;
    let clientSecret = rawSecret;

    // If using stored credentials, fetch and decrypt them
    if (useStoredCredentials || (!clientId && !clientSecret)) {
      console.log(`Fetching stored credentials for ${platform}...`);
      
      const { data: settings, error: settingsError } = await supabase
        .from('social_platform_settings')
        .select('consumer_key, consumer_secret')
        .eq('platform', platform)
        .eq('is_active', true)
        .single();

      if (settingsError || !settings) {
        throw new Error(`Không tìm thấy cấu hình cho ${platform}`);
      }

      if (!settings.consumer_key || !settings.consumer_secret) {
        throw new Error('Client ID/Secret chưa được cấu hình');
      }

      try {
        clientId = await decryptCredential(settings.consumer_key);
        clientSecret = await decryptCredential(settings.consumer_secret);
      } catch (e) {
        console.error('decryptCredential failed:', e);
        throw new Error('Không thể giải mã credentials - kiểm tra encryption key');
      }

      if (!clientId || !clientSecret) {
        throw new Error('Không thể giải mã credentials - kiểm tra encryption key');
      }
    }

    if (!clientId || !clientSecret) {
      throw new Error('Client ID và Client Secret là bắt buộc');
    }

    console.log('Testing Google Business credentials...');

    // Validate Google OAuth Client ID format
    // Format: xxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
    if (!clientId.includes('.apps.googleusercontent.com')) {
      throw new Error('Client ID không hợp lệ - phải có đuôi .apps.googleusercontent.com');
    }

    // Validate Client Secret format (typically starts with GOCSPX-)
    if (clientSecret.length < 20) {
      throw new Error('Client Secret không hợp lệ - quá ngắn');
    }

    // Try to validate by calling Google's tokeninfo endpoint
    // Note: Without a valid token, we can only validate format
    // Real validation happens during OAuth flow
    
    console.log('Google Business credentials format validated successfully!');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Google Business credentials hợp lệ (định dạng)! ✓ Kết nối OAuth sẽ xác thực đầy đủ.',
        details: {
          clientIdFormat: 'valid',
          clientSecretFormat: 'valid',
          platform,
          note: 'Google Business yêu cầu OAuth flow để xác thực đầy đủ credentials',
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Test Google Business credentials error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        hint: 'Kiểm tra lại Client ID và Client Secret từ Google Cloud Console → APIs & Services → Credentials',
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptCredential } from "../_shared/crypto.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    const { platform, useStoredCredentials, consumerKey: rawKey, consumerSecret: rawSecret } = body;

    if (!platform) {
      throw new Error('platform is required');
    }

    let appId = rawKey;
    let secretKey = rawSecret;

    // If using stored credentials, fetch and decrypt them
    if (useStoredCredentials || (!appId && !secretKey)) {
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
        throw new Error('App ID/Secret Key chưa được cấu hình');
      }

      appId = await decryptCredential(settings.consumer_key);
      secretKey = await decryptCredential(settings.consumer_secret);

      if (!appId || !secretKey) {
        throw new Error('Không thể giải mã credentials - kiểm tra encryption key');
      }
    }

    if (!appId || !secretKey) {
      throw new Error('App ID và Secret Key là bắt buộc');
    }

    console.log('Testing Zalo OA credentials...');

    // Zalo OA API doesn't have a simple credential test endpoint
    // We'll validate the format and attempt to get a test token
    // Note: Zalo requires a valid authorization code to get tokens
    // So we can only validate format here
    
    // Validate App ID format (typically 10-20 digits)
    if (!/^\d{10,20}$/.test(appId)) {
      throw new Error('App ID không hợp lệ - phải là 10-20 chữ số');
    }

    // Validate Secret Key format (alphanumeric, typically 20-40 chars)
    if (!/^[a-zA-Z0-9]{20,50}$/.test(secretKey)) {
      throw new Error('Secret Key không hợp lệ - phải là 20-50 ký tự chữ và số');
    }

    // Try to verify by checking Zalo developers API (if available)
    // Since Zalo doesn't have a public credential validation endpoint,
    // we'll return success if format is valid
    console.log('Zalo OA credentials format validated successfully!');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Zalo OA credentials hợp lệ (định dạng)! ✓ Kết nối OAuth sẽ xác thực đầy đủ.',
        details: {
          appIdFormat: 'valid',
          secretKeyFormat: 'valid',
          platform,
          note: 'Zalo OA yêu cầu OAuth flow để xác thực đầy đủ credentials',
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Test Zalo OA credentials error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        hint: 'Kiểm tra lại App ID và Secret Key từ Zalo Developers Portal (developers.zalo.me)',
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

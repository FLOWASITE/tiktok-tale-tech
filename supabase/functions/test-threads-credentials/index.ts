import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createDecipheriv } from "node:crypto";
import { Buffer } from "node:buffer";

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

// Decrypt encrypted credentials
function decrypt(encryptedText: string, key: string): string {
  try {
    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedData = Buffer.from(textParts.join(':'), 'hex');
    
    const keyBuffer = Buffer.alloc(32);
    Buffer.from(key).copy(keyBuffer);
    
    const decipher = createDecipheriv('aes-256-cbc', keyBuffer, iv);
    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error('Decryption error:', error);
    return '';
  }
}

Deno.serve(withPerf({ functionName: 'test-threads-credentials' }, async (req) => {
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
    const { platform, useStoredCredentials, appId: rawAppId, appSecret: rawAppSecret } = body;

    if (platform !== 'threads') {
      throw new Error('This endpoint is for Threads only');
    }

    let appId = rawAppId;
    let appSecret = rawAppSecret;

    // If using stored credentials, fetch and decrypt them
    if (useStoredCredentials || (!appId && !appSecret)) {
      console.log('Fetching stored credentials for Threads...');
      
      const { data: settings, error: settingsError } = await supabase
        .from('social_platform_settings')
        .select('consumer_key, consumer_secret')
        .eq('platform', 'threads')
        .eq('is_active', true)
        .single();

      if (settingsError || !settings) {
        throw new Error('Không tìm thấy cấu hình cho Threads');
      }

      if (!settings.consumer_key || !settings.consumer_secret) {
        throw new Error('App ID/Secret chưa được cấu hình');
      }

      const encryptionKey = Deno.env.get('AI_ENCRYPTION_KEY') || 'default-key';
      appId = decrypt(settings.consumer_key, encryptionKey);
      appSecret = decrypt(settings.consumer_secret, encryptionKey);

      if (!appId || !appSecret) {
        throw new Error('Không thể giải mã credentials - kiểm tra encryption key');
      }
    }

    if (!appId || !appSecret) {
      throw new Error('App ID và App Secret là bắt buộc');
    }

    console.log('Testing Threads credentials...');

    // Threads uses the same Meta/Facebook Graph API for app verification
    // Test by generating an App Access Token and verifying the app exists
    const appAccessToken = `${appId}|${appSecret}`;
    
    // Verify the app credentials by calling the Facebook Graph API
    const testResponse = await fetch(
      `https://graph.facebook.com/v24.0/${appId}?access_token=${appAccessToken}&fields=id,name`,
      { method: 'GET' }
    );

    const responseText = await testResponse.text();
    console.log('Threads/Meta API Response:', testResponse.status);

    if (!testResponse.ok) {
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.error?.message) {
          if (errorData.error.code === 190) {
            throw new Error('Threads App ID hoặc App Secret không hợp lệ');
          }
          throw new Error(`Meta API: ${errorData.error.message}`);
        }
      } catch (e) {
        if (e instanceof Error && (e.message.startsWith('Meta API:') || e.message.startsWith('Threads'))) throw e;
      }
      throw new Error(`Threads credentials không hợp lệ (HTTP ${testResponse.status})`);
    }

    const appData = JSON.parse(responseText);
    
    if (!appData.id) {
      throw new Error('Unexpected response from Meta API');
    }

    console.log('Threads credentials verified successfully!', appData.name);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Threads API credentials hợp lệ! ✓',
        details: {
          appId: appData.id,
          appName: appData.name,
          platform: 'threads',
          note: 'Đảm bảo App đã thêm Threads Product và được phê duyệt',
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Test Threads credentials error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        hint: 'Kiểm tra lại App ID và App Secret từ Meta Developer Console. Đảm bảo App đã thêm Threads Product.',
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));

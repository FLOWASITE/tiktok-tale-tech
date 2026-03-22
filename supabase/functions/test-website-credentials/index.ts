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
  consumerKey?: string;  // API URL
  consumerSecret?: string;  // API Key
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

Deno.serve(withPerf({ functionName: 'test-website-credentials' }, async (req) => {
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
    const { platform, useStoredCredentials, consumerKey: rawKey, consumerSecret: rawSecret } = body;

    if (!platform) {
      throw new Error('platform is required');
    }

    let apiUrl = rawKey;
    let apiKey = rawSecret;

    // If using stored credentials, fetch and decrypt them
    if (useStoredCredentials || (!apiUrl)) {
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

      if (!settings.consumer_key) {
        throw new Error('API URL chưa được cấu hình');
      }

      const encryptionKey = Deno.env.get('AI_ENCRYPTION_KEY') || 'default-key';
      apiUrl = decrypt(settings.consumer_key, encryptionKey);
      apiKey = settings.consumer_secret ? decrypt(settings.consumer_secret, encryptionKey) : '';

      if (!apiUrl) {
        throw new Error('Không thể giải mã credentials - kiểm tra encryption key');
      }
    }

    if (!apiUrl) {
      throw new Error('API URL là bắt buộc');
    }

    console.log('Testing Website/API credentials...');

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(apiUrl);
    } catch {
      throw new Error('API URL không hợp lệ - phải là URL đầy đủ (https://...)');
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('API URL phải sử dụng http hoặc https');
    }

    // Check if it's a WordPress site by trying to access REST API
    const isWordPress = apiUrl.includes('/wp-json') || !apiUrl.includes('/api');
    let testUrl = apiUrl;
    
    if (isWordPress && !apiUrl.includes('/wp-json')) {
      // Try WordPress REST API discovery
      testUrl = `${parsedUrl.origin}/wp-json`;
    }

    console.log(`Testing connection to: ${testUrl}`);

    // Try to connect to the API
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'FLOWA-ContentHub/1.0',
    };

    if (apiKey) {
      // Try different auth methods
      if (apiKey.includes(':')) {
        // WordPress Application Password format: username:password
        headers['Authorization'] = `Basic ${btoa(apiKey)}`;
      } else {
        // Bearer token or API key
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
    }

    const response = await fetch(testUrl, {
      method: 'GET',
      headers,
    });

    console.log(`API response status: ${response.status}`);

    if (!response.ok && response.status !== 401) {
      // 401 is expected if auth is required but we want to verify the endpoint exists
      if (response.status === 404) {
        throw new Error('API endpoint không tồn tại (404)');
      }
      if (response.status >= 500) {
        throw new Error(`Server error (${response.status})`);
      }
    }

    let apiType = 'Generic API';
    let details: Record<string, any> = {};

    try {
      const data = await response.json();
      
      // Check if it's WordPress
      if (data.name && data.namespaces && data.routes) {
        apiType = 'WordPress REST API';
        details = {
          siteName: data.name,
          url: data.url,
          namespaces: data.namespaces?.slice(0, 5),
        };
      } else if (data.version || data.api_version) {
        apiType = 'Custom API';
        details = {
          version: data.version || data.api_version,
        };
      }
    } catch {
      // Not JSON response, but endpoint is reachable
      apiType = 'Web Endpoint';
    }

    console.log(`Website/API credentials validated: ${apiType}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${apiType} kết nối thành công! ✓`,
        details: {
          apiType,
          url: parsedUrl.origin,
          hasAuth: !!apiKey,
          platform,
          ...details,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Test Website credentials error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        hint: 'Kiểm tra lại API URL và API Key. Với WordPress, sử dụng Application Password (username:app-password)',
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));

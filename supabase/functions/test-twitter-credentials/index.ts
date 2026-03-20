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
  consumerKey?: string;
  consumerSecret?: string;
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

    let consumerKey = rawKey;
    let consumerSecret = rawSecret;

    // If using stored credentials, fetch and decrypt them
    if (useStoredCredentials || (!consumerKey && !consumerSecret)) {
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
        throw new Error('Consumer Key/Secret chưa được cấu hình');
      }

      const encryptionKey = Deno.env.get('AI_ENCRYPTION_KEY') || 'default-key';
      consumerKey = decrypt(settings.consumer_key, encryptionKey);
      consumerSecret = decrypt(settings.consumer_secret, encryptionKey);

      if (!consumerKey || !consumerSecret) {
        throw new Error('Không thể giải mã credentials - kiểm tra encryption key');
      }
    }

    if (!consumerKey || !consumerSecret) {
      throw new Error('consumerKey và consumerSecret là bắt buộc');
    }

    console.log('Testing Twitter credentials...');

    // Use OAuth 2.0 App-Only authentication to verify credentials
    const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    const tokenResponse = await fetch('https://api.x.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const tokenText = await tokenResponse.text();
    console.log('Twitter OAuth2 Response:', tokenResponse.status);

    if (!tokenResponse.ok) {
      try {
        const errorData = JSON.parse(tokenText);
        if (errorData.errors?.[0]?.message) {
          throw new Error(`Twitter API: ${errorData.errors[0].message}`);
        }
        if (errorData.error_description) {
          throw new Error(`Twitter API: ${errorData.error_description}`);
        }
      } catch (e) {
        if (e instanceof Error && e.message.startsWith('Twitter API:')) throw e;
      }
      throw new Error(`Twitter credentials không hợp lệ (HTTP ${tokenResponse.status})`);
    }

    const tokenData = JSON.parse(tokenText);
    
    if (tokenData.token_type !== 'bearer') {
      throw new Error('Unexpected token type from Twitter API');
    }

    console.log('Twitter credentials verified successfully!');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Twitter API credentials hợp lệ! ✓',
        details: {
          tokenType: tokenData.token_type,
          platform,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Test Twitter credentials error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        hint: 'Kiểm tra lại Consumer Key và Consumer Secret từ Twitter Developer Portal',
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

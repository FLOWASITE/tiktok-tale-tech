import { createDecipheriv } from "node:crypto";
import { Buffer } from "node:buffer";
import { decrypt as decryptModern } from "../_shared/crypto.ts";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { buildOAuth1Header } from "../_shared/oauth1a.ts";

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

function sanitizeCredential(value?: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function decryptLegacyCBC(encryptedText: string, key: string): string {
  const [ivHex, encryptedHex] = encryptedText.split(':');
  if (!ivHex || !encryptedHex) {
    throw new Error('Invalid legacy encrypted format');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const encryptedData = Buffer.from(encryptedHex, 'hex');
  const keyBuffer = Buffer.from(key.padEnd(32).slice(0, 32));

  const decipher = createDecipheriv('aes-256-cbc', keyBuffer, iv);
  let decrypted = decipher.update(encryptedData);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

async function decryptCredential(encryptedValue: string | null, key: string): Promise<string | null> {
  if (!encryptedValue) return null;

  try {
    return await decryptModern(encryptedValue);
  } catch (primaryError) {
    if (!encryptedValue.includes(':')) {
      throw primaryError;
    }

    const keyCandidates = [...new Set([
      key,
      'default-encryption-key-change-me',
      'default-key',
    ].filter(Boolean))];

    for (const candidate of keyCandidates) {
      try {
        return decryptLegacyCBC(encryptedValue, candidate);
      } catch {
        // Try next candidate key
      }
    }

    throw primaryError;
  }
}

Deno.serve(withPerf({ functionName: 'test-twitter-credentials' }, async (req) => {
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

    let consumerKey = sanitizeCredential(rawKey);
    let consumerSecret = sanitizeCredential(rawSecret);

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

      const encryptionKey = Deno.env.get('AI_ENCRYPTION_KEY') || 'default-encryption-key-change-me';
      const [decryptedKey, decryptedSecret] = await Promise.all([
        decryptCredential(settings.consumer_key, encryptionKey),
        decryptCredential(settings.consumer_secret, encryptionKey),
      ]);

      consumerKey = sanitizeCredential(decryptedKey);
      consumerSecret = sanitizeCredential(decryptedSecret);

      if (!consumerKey || !consumerSecret) {
        throw new Error('Không thể giải mã credentials - kiểm tra encryption key');
      }
    }

    if (!consumerKey || !consumerSecret) {
      throw new Error('consumerKey và consumerSecret là bắt buộc');
    }

    if (consumerKey.includes('*') || consumerSecret.includes('*')) {
      throw new Error('Credentials đang ở dạng masked (****). Vui lòng nhập lại Consumer Key/Secret thật trong phần Admin settings');
    }

    console.log('Testing Twitter credentials via OAuth 1.0a request_token...');

    const requestTokenUrl = 'https://api.x.com/oauth/request_token';
    const oauthCallback = 'oob';
    const oauthHeader = buildOAuth1Header(
      'POST',
      requestTokenUrl,
      consumerKey,
      consumerSecret,
      undefined,
      undefined,
      { oauth_callback: oauthCallback }
    );

    const testResponse = await fetch(requestTokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': oauthHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `oauth_callback=${encodeURIComponent(oauthCallback)}`,
    });

    const responseText = await testResponse.text();
    console.log('Twitter OAuth 1.0a request_token response:', testResponse.status);

    if (!testResponse.ok) {
      if (responseText.includes('Could not authenticate you')) {
        throw new Error('Twitter API: Consumer Key/Secret không hợp lệ hoặc đã bị revoke');
      }

      try {
        const errorData = JSON.parse(responseText);
        if (errorData.errors?.[0]?.message) {
          throw new Error(`Twitter API: ${errorData.errors[0].message}`);
        }
      } catch (e) {
        if (e instanceof Error && e.message.startsWith('Twitter API:')) throw e;
      }

      if (testResponse.status === 401) {
        throw new Error('Twitter API: Consumer Key/Secret không hợp lệ hoặc app chưa bật OAuth 1.0a');
      }

      throw new Error(`Twitter credentials không hợp lệ (HTTP ${testResponse.status})`);
    }

    const tokenResponse = new URLSearchParams(responseText);
    const hasOauthToken = tokenResponse.has('oauth_token');
    const hasOauthTokenSecret = tokenResponse.has('oauth_token_secret');

    if (!hasOauthToken || !hasOauthTokenSecret) {
      throw new Error('Twitter API trả về phản hồi không hợp lệ khi kiểm tra credentials');
    }

    const callbackConfirmed = tokenResponse.get('oauth_callback_confirmed') === 'true';

    console.log('Twitter credentials verified successfully via OAuth 1.0a request_token!');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Twitter API credentials hợp lệ! ✓',
        details: { method: 'OAuth 1.0a request_token', platform, callbackConfirmed },
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
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));

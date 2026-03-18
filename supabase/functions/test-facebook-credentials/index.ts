import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createDecipheriv } from "node:crypto";
import { Buffer } from "node:buffer";
import { decrypt } from "../_shared/crypto.ts";

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

async function decryptCredential(ciphertext: string, key: string): Promise<string> {
  try {
    return await decrypt(ciphertext);
  } catch (primaryError) {
    if (!ciphertext.includes(':')) {
      throw primaryError;
    }

    try {
      return decryptLegacyCBC(ciphertext, key);
    } catch {
      throw primaryError;
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const encryptionKey = Deno.env.get('AI_ENCRYPTION_KEY') || 'default-encryption-key-change-me';
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
    const { platform, useStoredCredentials, appId: rawAppId, appSecret: rawAppSecret } = body;

    if (platform !== 'facebook') {
      throw new Error('This endpoint is for Facebook only');
    }

    let appId = rawAppId;
    let appSecret = rawAppSecret;

    // If using stored credentials, fetch and decrypt them
    if (useStoredCredentials || (!appId && !appSecret)) {
      console.log('Fetching stored credentials for Facebook...');
      
      const { data: settings, error: settingsError } = await supabase
        .from('social_platform_settings')
        .select('consumer_key, consumer_secret')
        .eq('platform', 'facebook')
        .eq('is_active', true)
        .single();

      if (settingsError || !settings) {
        throw new Error('Không tìm thấy cấu hình cho Facebook');
      }

      if (!settings.consumer_key || !settings.consumer_secret) {
        throw new Error('App ID/Secret chưa được cấu hình');
      }

      try {
        [appId, appSecret] = await Promise.all([
          decryptCredential(settings.consumer_key, encryptionKey),
          decryptCredential(settings.consumer_secret, encryptionKey),
        ]);
      } catch (decryptErr) {
        console.error('Decryption error:', decryptErr);
        throw new Error('Không thể giải mã credentials - kiểm tra encryption key');
      }

      if (!appId || !appSecret) {
        throw new Error('Không thể giải mã credentials - kiểm tra encryption key');
      }
    }

    if (!appId || !appSecret) {
      throw new Error('App ID và App Secret là bắt buộc');
    }

    console.log('Testing Facebook credentials...');

    const appAccessToken = `${appId}|${appSecret}`;
    
    const testResponse = await fetch(
      `https://graph.facebook.com/v24.0/${appId}?access_token=${appAccessToken}&fields=id,name`,
      { method: 'GET' }
    );

    const responseText = await testResponse.text();
    console.log('Facebook API Response:', testResponse.status);

    if (!testResponse.ok) {
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.error?.message) {
          throw new Error(`Facebook API: ${errorData.error.message}`);
        }
      } catch (e) {
        if (e instanceof Error && e.message.startsWith('Facebook API:')) throw e;
      }
      throw new Error(`Facebook credentials không hợp lệ (HTTP ${testResponse.status})`);
    }

    const appData = JSON.parse(responseText);
    
    if (!appData.id) {
      throw new Error('Unexpected response from Facebook API');
    }

    console.log('Facebook credentials verified successfully!', appData.name);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Facebook API credentials hợp lệ! ✓',
        details: {
          appId: appData.id,
          appName: appData.name,
          platform: 'facebook',
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Test Facebook credentials error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        hint: 'Kiểm tra lại App ID và App Secret từ Meta Developer Console',
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

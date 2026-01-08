import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { Buffer } from "node:buffer";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Encryption helpers
function encrypt(text: string, key: string): string {
  const iv = randomBytes(16);
  const keyBuffer = Buffer.alloc(32);
  Buffer.from(key).copy(keyBuffer);
  const cipher = createCipheriv('aes-256-cbc', keyBuffer, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

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
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const oaId = url.searchParams.get('oa_id'); // Zalo returns selected OA ID

    console.log('Zalo OAuth callback received:', { code: !!code, state: !!state, oaId });

    if (!code || !state) {
      throw new Error('Missing code or state parameter');
    }

    // Decode state
    let stateData: { brandTemplateId: string | null; organizationId: string | null; userId: string };
    try {
      stateData = JSON.parse(atob(state));
    } catch (e) {
      throw new Error('Invalid state parameter');
    }

    const { brandTemplateId, organizationId, userId } = stateData;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const encryptionKey = Deno.env.get('AI_ENCRYPTION_KEY') || 'default-key';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Zalo credentials from social_platform_settings
    const { data: settings, error: settingsError } = await supabase
      .from('social_platform_settings')
      .select('consumer_key, consumer_secret')
      .eq('platform', 'zalo_oa')
      .eq('is_active', true)
      .single();

    if (settingsError || !settings) {
      throw new Error('Zalo OA chưa được cấu hình. Liên hệ Admin.');
    }

    const appId = decrypt(settings.consumer_key, encryptionKey);
    const secretKey = decrypt(settings.consumer_secret, encryptionKey);

    if (!appId || !secretKey) {
      throw new Error('Invalid Zalo credentials');
    }

    // Exchange code for access token
    // Zalo OA uses different endpoint than Zalo Login
    const redirectUri = `${supabaseUrl}/functions/v1/zalo-oauth-callback`;
    
    const tokenResponse = await fetch('https://oauth.zaloapp.com/v4/oa/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'secret_key': secretKey,
      },
      body: new URLSearchParams({
        code: code,
        app_id: appId,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const tokenData = await tokenResponse.json();
    console.log('Zalo token response:', { 
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      expiresIn: tokenData.expires_in 
    });

    if (!tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.message || 'Failed to get access token');
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 3600; // Default 1 hour

    // Get OA info using the access token
    const oaInfoResponse = await fetch('https://openapi.zalo.me/v2.0/oa/getoa', {
      headers: {
        'access_token': accessToken,
      },
    });

    const oaInfo = await oaInfoResponse.json();
    console.log('Zalo OA info:', oaInfo);

    let oaName = 'Zalo OA';
    let oaIdFinal = oaId || '';
    
    if (oaInfo.data) {
      oaName = oaInfo.data.name || oaName;
      oaIdFinal = oaInfo.data.oa_id || oaIdFinal;
    }

    // Calculate token expiry
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Check for existing connection
    let query = supabase
      .from('social_connections')
      .select('id')
      .eq('platform', 'zalo_oa');

    if (brandTemplateId) {
      query = query.eq('brand_template_id', brandTemplateId);
    } else if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data: existingConnection } = await query.maybeSingle();

    // Encrypt tokens before storing
    const encryptedAccessToken = encrypt(accessToken, encryptionKey);
    const encryptedRefreshToken = refreshToken ? encrypt(refreshToken, encryptionKey) : null;

    const connectionData = {
      organization_id: organizationId || null,
      brand_template_id: brandTemplateId || null,
      user_id: userId,
      platform: 'zalo_oa',
      platform_user_id: oaIdFinal,
      platform_username: oaName,
      access_token: encryptedAccessToken,
      refresh_token: encryptedRefreshToken,
      token_expires_at: tokenExpiresAt,
      is_active: true,
      connected_at: new Date().toISOString(),
      scopes: ['send_message', 'manage_oa'],
      metadata: {
        oa_id: oaIdFinal,
        oa_name: oaName,
        oa_avatar: oaInfo.data?.avatar || null,
        uses_global_credentials: true,
      },
    };

    let connection;
    if (existingConnection) {
      const { data, error } = await supabase
        .from('social_connections')
        .update(connectionData)
        .eq('id', existingConnection.id)
        .select()
        .single();
      
      if (error) throw error;
      connection = data;
    } else {
      const { data, error } = await supabase
        .from('social_connections')
        .insert(connectionData)
        .select()
        .single();
      
      if (error) throw error;
      connection = data;
    }

    console.log('Zalo OA connection saved:', connection.id);

    // Redirect to frontend with success
    const frontendUrl = Deno.env.get('FRONTEND_URL') || supabaseUrl.replace('.supabase.co', '.lovableproject.com');
    const redirectUrl = `${frontendUrl}/auth/zalo/callback?success=true&platform=zalo_oa&username=${encodeURIComponent(oaName)}`;

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl,
      },
    });

  } catch (error: any) {
    console.error('Zalo OAuth callback error:', error);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const frontendUrl = Deno.env.get('FRONTEND_URL') || supabaseUrl.replace('.supabase.co', '.lovableproject.com');
    const redirectUrl = `${frontendUrl}/auth/zalo/callback?success=false&error=${encodeURIComponent(error.message)}`;

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl,
      },
    });
  }
});

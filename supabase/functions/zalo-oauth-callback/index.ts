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

const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/.*\.lovable\.app$/,
  /^https:\/\/.*\.lovableproject\.com$/,
  /^http:\/\/localhost(:\d+)?$/,
  /^https:\/\/.*\.supabase\.co$/,
];

function isAllowedOrigin(origin: string): boolean {
  return ALLOWED_ORIGIN_PATTERNS.some(p => p.test(origin));
}

function getFrontendUrl(frontendOrigin: string | null): string {
  if (frontendOrigin && isAllowedOrigin(frontendOrigin)) {
    return frontendOrigin;
  }
  return 'https://tiktok-tale-tech.lovable.app';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Determine if this is a POST (from proxy page) or GET (direct redirect)
  const isPostFromProxy = req.method === 'POST';

  // Try to parse state early for error redirects
  let frontendOrigin: string | null = null;

  try {
    let code: string | null;
    let state: string | null;
    let oaId: string | null = null;

    if (isPostFromProxy) {
      const body = await req.json();
      code = body.code || null;
      state = body.state || null;
    } else {
      const url = new URL(req.url);
      code = url.searchParams.get('code');
      state = url.searchParams.get('state');
      oaId = url.searchParams.get('oa_id');
    }

    console.log('Zalo OAuth callback received:', { code: !!code, state: !!state, oaId, isPostFromProxy });

    if (!code || !state) {
      throw new Error('Missing code or state parameter');
    }

    let stateData: { brandTemplateId: string | null; organizationId: string | null; userId: string; frontendOrigin?: string | null };
    try {
      stateData = JSON.parse(atob(state));
      frontendOrigin = stateData.frontendOrigin || null;
    } catch (e) {
      throw new Error('Invalid state parameter');
    }

    const { brandTemplateId, organizationId, userId } = stateData;
    const frontendUrl = getFrontendUrl(frontendOrigin);

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

    // Build redirect URI matching what was used in connect-social
    const isProductionOrigin = frontendOrigin && (frontendOrigin.includes('flowa.one') || frontendOrigin.includes('flowa.vn'));
    const redirectUri = isProductionOrigin
      ? 'https://app.flowa.one/api/zalo/callback'
      : `${supabaseUrl}/functions/v1/zalo-oauth-callback`;

    // Exchange code for access token
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
    const expiresIn = tokenData.expires_in || 3600;

    // Get OA info
    const oaInfoResponse = await fetch('https://openapi.zalo.me/v2.0/oa/getoa', {
      headers: { 'access_token': accessToken },
    });

    const oaInfo = await oaInfoResponse.json();
    console.log('Zalo OA info:', oaInfo);

    let oaName = 'Zalo OA';
    let oaIdFinal = oaId || '';
    
    if (oaInfo.data) {
      oaName = oaInfo.data.name || oaName;
      oaIdFinal = oaInfo.data.oa_id || oaIdFinal;
    }

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

    // POST from proxy → return JSON
    if (isPostFromProxy) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Kết nối Zalo OA thành công!',
          username: oaName,
          brand_template_id: brandTemplateId,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET direct redirect → 302
    const redirectParams = new URLSearchParams({
      success: 'true',
      platform: 'zalo_oa',
      username: oaName,
      ...(brandTemplateId ? { brand_template_id: brandTemplateId } : {}),
    });

    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, 'Location': `${frontendUrl}/auth/zalo/callback?${redirectParams}` },
    });

  } catch (error: any) {
    console.error('Zalo OAuth callback error:', error);

    // POST from proxy → return JSON error
    if (isPostFromProxy) {
      return new Response(
        JSON.stringify({ success: false, error: error.message || 'Zalo OAuth failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const frontendUrl = getFrontendUrl(frontendOrigin);
    const redirectParams = new URLSearchParams({
      success: 'false',
      error: error.message || 'Zalo OAuth failed',
    });

    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, 'Location': `${frontendUrl}/auth/zalo/callback?${redirectParams}` },
    });
  }
});
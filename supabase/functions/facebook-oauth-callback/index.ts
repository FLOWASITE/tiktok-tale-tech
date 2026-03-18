import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decrypt as decryptGCM, encrypt as encryptGCM } from "../_shared/crypto.ts";
import { createDecipheriv, createCipheriv, randomBytes } from "node:crypto";
import { Buffer } from "node:buffer";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Legacy CBC decrypt for backward compatibility
function decryptLegacyCBC(encryptedText: string, key: string): string {
  const textParts = encryptedText.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedData = Buffer.from(textParts.join(':'), 'hex');
  const keyBuffer = Buffer.alloc(32);
  Buffer.from(key).copy(keyBuffer);
  const decipher = createDecipheriv('aes-256-cbc', keyBuffer, iv);
  let decrypted = decipher.update(encryptedData);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// Try GCM first, fallback to legacy CBC
async function decryptCredential(ciphertext: string): Promise<string> {
  // 1. Try modern GCM
  try {
    const result = await decryptGCM(ciphertext);
    if (result) return result;
  } catch { /* fallback */ }

  // 2. Try legacy CBC with key candidates
  const encryptionKey = Deno.env.get('AI_ENCRYPTION_KEY') || 'default-key';
  const keyCandidates = [encryptionKey, 'default-encryption-key-change-me', 'default-key'];
  for (const candidate of keyCandidates) {
    try {
      const result = decryptLegacyCBC(ciphertext, candidate);
      if (result) return result;
    } catch { /* try next */ }
  }

  throw new Error('Failed to decrypt credential with any method');
}

// Build frontend URL dynamically
function getFrontendUrl(): string {
  const configured = Deno.env.get('FRONTEND_URL');
  if (configured) return configured;
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  return supabaseUrl.replace('.supabase.co', '.lovableproject.com');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    console.log('Facebook OAuth callback received:', { hasCode: !!code, hasState: !!state, error });

    if (error) {
      console.error('Facebook OAuth error:', error, errorDescription);
      return Response.redirect(
        `${getFrontendUrl()}/auth/facebook/callback?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || '')}`,
        302
      );
    }

    if (!code || !state) {
      throw new Error('Missing code or state parameter');
    }

    let stateData;
    try {
      stateData = JSON.parse(atob(state));
    } catch (e) {
      throw new Error('Invalid state parameter');
    }

    const { brandTemplateId, organizationId, userId } = stateData;
    console.log('State decoded:', { brandTemplateId, organizationId, userId });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Facebook App credentials from social_platform_settings
    const { data: settings, error: settingsError } = await supabase
      .from('social_platform_settings')
      .select('consumer_key, consumer_secret')
      .eq('platform', 'facebook')
      .eq('is_active', true)
      .single();

    if (settingsError || !settings) {
      throw new Error('Facebook credentials not configured in Admin Settings');
    }

    const appId = await decryptCredential(settings.consumer_key);
    const appSecret = await decryptCredential(settings.consumer_secret);

    if (!appId || !appSecret) {
      throw new Error('Failed to decrypt Facebook credentials');
    }

    // Exchange code for short-lived user access token
    const redirectUri = `${supabaseUrl}/functions/v1/facebook-oauth-callback`;

    console.log('Exchanging code for access token...');
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?` + new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: redirectUri,
        code: code,
      })
    );

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text();
      console.error('Token exchange failed:', tokenError);
      throw new Error(`Failed to exchange code: ${tokenError}`);
    }

    const tokenData = await tokenResponse.json();
    console.log('Short-lived token obtained');

    // Exchange for long-lived token (60 days)
    console.log('Exchanging for long-lived token...');
    const longLivedResponse = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?` + new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: tokenData.access_token,
      })
    );

    if (!longLivedResponse.ok) {
      const llError = await longLivedResponse.text();
      console.error('Long-lived token exchange failed:', llError);
      throw new Error(`Failed to get long-lived token: ${llError}`);
    }

    const longLivedData = await longLivedResponse.json();
    const userAccessToken = longLivedData.access_token;
    const expiresIn = longLivedData.expires_in || 5184000;
    console.log('Long-lived user token obtained, expires in:', expiresIn);

    // Get user's Facebook Pages
    console.log('Fetching user Pages...');
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?` + new URLSearchParams({
        access_token: userAccessToken,
        fields: 'id,name,access_token,category,picture',
      })
    );

    if (!pagesResponse.ok) {
      const pagesError = await pagesResponse.text();
      console.error('Failed to fetch Pages:', pagesError);
      throw new Error(`Failed to fetch Pages: ${pagesError}`);
    }

    const pagesData = await pagesResponse.json();
    const pages = pagesData.data || [];
    console.log(`Found ${pages.length} Pages`);

    if (pages.length === 0) {
      return Response.redirect(
        `${getFrontendUrl()}/auth/facebook/callback?error=no_pages&error_description=${encodeURIComponent('Không tìm thấy Facebook Page nào. Bạn cần có quyền quản lý ít nhất một Page.')}`,
        302
      );
    }

    const selectedPage = pages[0];
    const pageAccessToken = selectedPage.access_token;
    const pageId = selectedPage.id;
    const pageName = selectedPage.name;
    console.log('Selected Page:', { pageId, pageName });

    const tokenExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

    // Encrypt page access token using modern GCM
    const encryptedToken = await encryptGCM(pageAccessToken);

    // Check for existing connection
    let query = supabase
      .from('social_connections')
      .select('id')
      .eq('platform', 'facebook');

    if (brandTemplateId) {
      query = query.eq('brand_template_id', brandTemplateId);
    } else if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data: existingConnection } = await query.maybeSingle();

    const connectionData = {
      organization_id: organizationId || null,
      brand_template_id: brandTemplateId || null,
      user_id: userId,
      platform: 'facebook',
      platform_username: pageName,
      platform_user_id: pageId,
      access_token: encryptedToken,
      refresh_token: null,
      token_expires_at: tokenExpiresAt,
      is_active: true,
      connected_at: new Date().toISOString(),
      scopes: ['pages_manage_posts', 'pages_read_engagement', 'pages_show_list'],
      metadata: {
        page_id: pageId,
        page_name: pageName,
        page_category: selectedPage.category,
        page_picture: selectedPage.picture?.data?.url,
        token_type: 'page_access_token',
        available_pages: pages.map((p: any) => ({ id: p.id, name: p.name })),
        uses_global_credentials: true,
      },
    };

    let connection;
    if (existingConnection) {
      const { data, error: updateError } = await supabase
        .from('social_connections')
        .update(connectionData)
        .eq('id', existingConnection.id)
        .select()
        .single();
      if (updateError) throw updateError;
      connection = data;
      console.log('Updated existing Facebook connection:', connection.id);
    } else {
      const { data, error: insertError } = await supabase
        .from('social_connections')
        .insert(connectionData)
        .select()
        .single();
      if (insertError) throw insertError;
      connection = data;
      console.log('Created new Facebook connection:', connection.id);
    }

    const successUrl = `${getFrontendUrl()}/auth/facebook/callback?` + new URLSearchParams({
      success: 'true',
      platform: 'facebook',
      page_name: pageName,
      connection_id: connection.id,
    }).toString();

    console.log('Redirecting to:', successUrl);
    return Response.redirect(successUrl, 302);

  } catch (error) {
    console.error('Facebook OAuth callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return Response.redirect(
      `${getFrontendUrl()}/auth/facebook/callback?error=callback_failed&error_description=${encodeURIComponent(errorMessage)}`,
      302
    );
  }
});

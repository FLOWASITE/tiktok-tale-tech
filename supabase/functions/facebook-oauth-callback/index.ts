import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createDecipheriv, createCipheriv, randomBytes } from "node:crypto";
import { Buffer } from "node:buffer";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Decrypt encrypted credentials from social_platform_settings
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

// Encrypt token for storage
function encrypt(text: string, key: string): string {
  try {
    const keyBuffer = Buffer.alloc(32);
    Buffer.from(key).copy(keyBuffer);
    
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', keyBuffer, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (error) {
    console.error('Encryption error:', error);
    return '';
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    console.log('Facebook OAuth callback received:', { 
      hasCode: !!code, 
      hasState: !!state, 
      error 
    });

    // Handle OAuth errors
    if (error) {
      console.error('Facebook OAuth error:', error, errorDescription);
      const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://preview--flowa-one.lovable.app';
      return Response.redirect(
        `${frontendUrl}/auth/facebook/callback?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || '')}`,
        302
      );
    }

    if (!code || !state) {
      throw new Error('Missing code or state parameter');
    }

    // Decode state to get brandTemplateId, organizationId, userId
    let stateData;
    try {
      stateData = JSON.parse(atob(state));
    } catch (e) {
      throw new Error('Invalid state parameter');
    }

    const { brandTemplateId, organizationId, userId } = stateData;
    console.log('State decoded:', { brandTemplateId, organizationId, userId });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Facebook App credentials from social_platform_settings
    const encryptionKey = Deno.env.get('AI_ENCRYPTION_KEY') || 'default-key';
    
    const { data: settings, error: settingsError } = await supabase
      .from('social_platform_settings')
      .select('consumer_key, consumer_secret')
      .eq('platform', 'facebook')
      .eq('is_active', true)
      .single();

    if (settingsError || !settings) {
      throw new Error('Facebook credentials not configured in Admin Settings');
    }

    const appId = decrypt(settings.consumer_key, encryptionKey);
    const appSecret = decrypt(settings.consumer_secret, encryptionKey);

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

    // Exchange short-lived token for long-lived token (60 days)
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
    const expiresIn = longLivedData.expires_in || 5184000; // Default 60 days
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
      // Redirect with error - no pages found
      const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://preview--flowa-one.lovable.app';
      return Response.redirect(
        `${frontendUrl}/auth/facebook/callback?error=no_pages&error_description=${encodeURIComponent('Không tìm thấy Facebook Page nào. Bạn cần có quyền quản lý ít nhất một Page.')}`,
        302
      );
    }

    // For now, use the first page (in future, could let user select)
    const selectedPage = pages[0];
    const pageAccessToken = selectedPage.access_token;
    const pageId = selectedPage.id;
    const pageName = selectedPage.name;

    console.log('Selected Page:', { pageId, pageName });

    // Calculate token expiry (Page access tokens from long-lived user tokens don't expire)
    // But we'll set a 60-day reminder anyway
    const tokenExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

    // Encrypt the page access token for storage
    const encryptedToken = encrypt(pageAccessToken, encryptionKey);

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

    // Prepare connection data
    const connectionData = {
      organization_id: organizationId || null,
      brand_template_id: brandTemplateId || null,
      user_id: userId,
      platform: 'facebook',
      platform_username: pageName,
      platform_user_id: pageId,
      access_token: encryptedToken,
      refresh_token: null, // Page tokens don't need refresh if derived from long-lived user token
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

    // Redirect to frontend callback page with success
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://preview--flowa-one.lovable.app';
    const successUrl = `${frontendUrl}/auth/facebook/callback?` + new URLSearchParams({
      success: 'true',
      platform: 'facebook',
      page_name: pageName,
      connection_id: connection.id,
    }).toString();

    console.log('Redirecting to:', successUrl);
    return Response.redirect(successUrl, 302);

  } catch (error) {
    console.error('Facebook OAuth callback error:', error);
    
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://preview--flowa-one.lovable.app';
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return Response.redirect(
      `${frontendUrl}/auth/facebook/callback?error=callback_failed&error_description=${encodeURIComponent(errorMessage)}`,
      302
    );
  }
});

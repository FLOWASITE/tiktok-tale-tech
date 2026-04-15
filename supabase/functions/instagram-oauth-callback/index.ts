import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

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

Deno.serve(withPerf({ functionName: 'instagram-oauth-callback' }, async (req) => {
  // Handle OPTIONS for CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    console.log('Instagram OAuth callback received');

    // Handle OAuth errors
    if (error) {
      console.error('Instagram OAuth error:', error, errorDescription);
      const redirectUrl = new URL('/auth/instagram/callback', Deno.env.get('SITE_URL') || 'https://app.flowa.one');
      redirectUrl.searchParams.set('error', errorDescription || error);
      return Response.redirect(redirectUrl.toString(), 302);
    }

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

    console.log('State data:', { brandTemplateId: stateData.brandTemplateId, organizationId: stateData.organizationId });

    const encryptionKey = Deno.env.get('AI_ENCRYPTION_KEY') || 'default-key';
    const supabase = getServiceClient();

    // Get Instagram App credentials from admin settings
    const { data: platformSettings, error: settingsError } = await supabase
      .from('social_platform_settings')
      .select('consumer_key, consumer_secret')
      .eq('platform', 'instagram')
      .eq('is_active', true)
      .single();

    if (settingsError || !platformSettings) {
      throw new Error('Instagram credentials not configured');
    }

    const appId = decrypt(platformSettings.consumer_key, encryptionKey);
    const appSecret = decrypt(platformSettings.consumer_secret, encryptionKey);

    if (!appId || !appSecret) {
      throw new Error('Failed to decrypt Instagram credentials');
    }

    const redirectUri = `${supabaseUrl}/functions/v1/instagram-oauth-callback`;

    // Step 1: Exchange code for short-lived access token
    console.log('Exchanging code for short-lived token...');
    const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();
    console.log('Token response status:', tokenResponse.status);

    if (tokenData.error_message || !tokenData.access_token) {
      console.error('Token exchange failed:', tokenData);
      throw new Error(tokenData.error_message || 'Failed to exchange code for token');
    }

    const shortLivedToken = tokenData.access_token;
    const instagramUserId = tokenData.user_id;
    console.log('Got short-lived token for user:', instagramUserId);

    // Step 2: Exchange short-lived token for long-lived token (60 days)
    console.log('Exchanging for long-lived token...');
    const longLivedResponse = await fetch(
      `https://graph.instagram.com/access_token?` + new URLSearchParams({
        grant_type: 'ig_exchange_token',
        client_secret: appSecret,
        access_token: shortLivedToken,
      })
    );

    const longLivedData = await longLivedResponse.json();
    console.log('Long-lived token response status:', longLivedResponse.status);

    if (longLivedData.error || !longLivedData.access_token) {
      console.error('Long-lived token exchange failed:', longLivedData);
      throw new Error(longLivedData.error?.message || 'Failed to get long-lived token');
    }

    const longLivedToken = longLivedData.access_token;
    const expiresIn = longLivedData.expires_in; // in seconds
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    console.log('Got long-lived token, expires at:', tokenExpiresAt);

    // Step 3: Get user info
    console.log('Fetching user info...');
    const userInfoResponse = await fetch(
      `https://graph.instagram.com/me?` + new URLSearchParams({
        fields: 'id,username,account_type,name',
        access_token: longLivedToken,
      })
    );

    const userInfo = await userInfoResponse.json();
    console.log('User info:', { username: userInfo.username, account_type: userInfo.account_type });

    if (userInfo.error) {
      console.error('Failed to get user info:', userInfo.error);
      throw new Error(userInfo.error.message || 'Failed to get Instagram user info');
    }

    // Step 4: Save connection to database
    let query = supabase
      .from('social_connections')
      .select('id')
      .eq('platform', 'instagram');

    if (stateData.brandTemplateId) {
      query = query.eq('brand_template_id', stateData.brandTemplateId);
    } else {
      query = query.eq('organization_id', stateData.organizationId);
    }

    const { data: existingConnection } = await query.maybeSingle();

    const connectionData = {
      organization_id: stateData.organizationId || null,
      brand_template_id: stateData.brandTemplateId || null,
      user_id: stateData.userId,
      platform: 'instagram',
      platform_username: userInfo.username,
      access_token: longLivedToken,
      refresh_token: null,
      token_expires_at: tokenExpiresAt,
      is_active: true,
      connected_at: new Date().toISOString(),
      scopes: ['instagram_business_basic', 'instagram_business_content_publish'],
      metadata: { 
        instagram_user_id: instagramUserId,
        account_type: userInfo.account_type,
        name: userInfo.name,
        token_type: 'long_lived',
        uses_global_credentials: true
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
    } else {
      const { data, error: insertError } = await supabase
        .from('social_connections')
        .insert(connectionData)
        .select()
        .single();
      
      if (insertError) throw insertError;
      connection = data;
    }

    console.log('Instagram connection saved:', connection.id);

    // Redirect to frontend callback page with success
    const siteUrl = Deno.env.get('SITE_URL') || 'https://app.flowa.one';
    const redirectUrl = new URL('/auth/instagram/callback', siteUrl);
    redirectUrl.searchParams.set('success', 'true');
    redirectUrl.searchParams.set('username', userInfo.username);
    if (stateData.brandTemplateId) {
      redirectUrl.searchParams.set('brandTemplateId', stateData.brandTemplateId);
    }
    if (stateData.organizationId) {
      redirectUrl.searchParams.set('organizationId', stateData.organizationId);
    }

    return Response.redirect(redirectUrl.toString(), 302);

  } catch (error: any) {
    console.error('Instagram OAuth callback error:', error);
    
    const siteUrl = Deno.env.get('SITE_URL') || 'https://app.flowa.one';
    const redirectUrl = new URL('/auth/instagram/callback', siteUrl);
    redirectUrl.searchParams.set('error', error.message || 'OAuth failed');
    
    return Response.redirect(redirectUrl.toString(), 302);
  }
}));

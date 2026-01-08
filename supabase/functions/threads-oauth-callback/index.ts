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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    console.log('Threads OAuth callback received:', { hasCode: !!code, hasState: !!state, error });

    // Handle OAuth errors
    if (error) {
      console.error('Threads OAuth error:', error, errorDescription);
      const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://preview--flowa-one.lovable.app';
      return Response.redirect(
        `${frontendUrl}/auth/threads/callback?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || '')}`,
        302
      );
    }

    if (!code || !state) {
      throw new Error('Missing code or state parameter');
    }

    // Decode state
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

    // Get Threads App credentials from social_platform_settings
    const encryptionKey = Deno.env.get('AI_ENCRYPTION_KEY') || 'default-key';
    
    const { data: settings, error: settingsError } = await supabase
      .from('social_platform_settings')
      .select('consumer_key, consumer_secret')
      .eq('platform', 'threads')
      .eq('is_active', true)
      .single();

    if (settingsError || !settings) {
      throw new Error('Threads credentials not configured in Admin Settings');
    }

    const appId = decrypt(settings.consumer_key, encryptionKey);
    const appSecret = decrypt(settings.consumer_secret, encryptionKey);

    if (!appId || !appSecret) {
      throw new Error('Failed to decrypt Threads credentials');
    }

    // Exchange code for short-lived access token
    const redirectUri = `${supabaseUrl}/functions/v1/threads-oauth-callback`;
    
    console.log('Exchanging code for access token...');
    const tokenResponse = await fetch('https://graph.threads.net/oauth/access_token', {
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

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text();
      console.error('Token exchange failed:', tokenError);
      throw new Error(`Failed to exchange code: ${tokenError}`);
    }

    const tokenData = await tokenResponse.json();
    const shortLivedToken = tokenData.access_token;
    const threadsUserId = tokenData.user_id;
    console.log('Short-lived token obtained, user_id:', threadsUserId);

    // Exchange for long-lived token (60 days)
    console.log('Exchanging for long-lived token...');
    const longLivedResponse = await fetch(
      `https://graph.threads.net/access_token?` + new URLSearchParams({
        grant_type: 'th_exchange_token',
        client_secret: appSecret,
        access_token: shortLivedToken,
      })
    );

    if (!longLivedResponse.ok) {
      const llError = await longLivedResponse.text();
      console.error('Long-lived token exchange failed:', llError);
      throw new Error(`Failed to get long-lived token: ${llError}`);
    }

    const longLivedData = await longLivedResponse.json();
    const accessToken = longLivedData.access_token;
    const expiresIn = longLivedData.expires_in || 5184000; // Default 60 days
    console.log('Long-lived token obtained, expires in:', expiresIn);

    // Get user profile
    console.log('Fetching user profile...');
    const profileResponse = await fetch(
      `https://graph.threads.net/v1.0/me?` + new URLSearchParams({
        access_token: accessToken,
        fields: 'id,username,threads_profile_picture_url,threads_biography',
      })
    );

    if (!profileResponse.ok) {
      const profileError = await profileResponse.text();
      console.error('Failed to fetch profile:', profileError);
      throw new Error(`Failed to fetch profile: ${profileError}`);
    }

    const profileData = await profileResponse.json();
    const username = profileData.username;
    console.log('Profile fetched:', username);

    // Calculate token expiry
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Encrypt the access token for storage
    const encryptedToken = encrypt(accessToken, encryptionKey);

    // Check for existing connection
    let query = supabase
      .from('social_connections')
      .select('id')
      .eq('platform', 'threads');

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
      platform: 'threads',
      platform_username: username,
      platform_user_id: threadsUserId?.toString(),
      access_token: encryptedToken,
      refresh_token: null,
      token_expires_at: tokenExpiresAt,
      is_active: true,
      connected_at: new Date().toISOString(),
      scopes: ['threads_basic', 'threads_content_publish'],
      metadata: {
        threads_user_id: threadsUserId,
        profile_picture: profileData.threads_profile_picture_url,
        biography: profileData.threads_biography,
        token_type: 'long_lived',
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
      console.log('Updated existing Threads connection:', connection.id);
    } else {
      const { data, error: insertError } = await supabase
        .from('social_connections')
        .insert(connectionData)
        .select()
        .single();

      if (insertError) throw insertError;
      connection = data;
      console.log('Created new Threads connection:', connection.id);
    }

    // Redirect to frontend callback page with success
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://preview--flowa-one.lovable.app';
    const successUrl = `${frontendUrl}/auth/threads/callback?` + new URLSearchParams({
      success: 'true',
      platform: 'threads',
      username: username,
      connection_id: connection.id,
    }).toString();

    console.log('Redirecting to:', successUrl);
    return Response.redirect(successUrl, 302);

  } catch (error) {
    console.error('Threads OAuth callback error:', error);
    
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://preview--flowa-one.lovable.app';
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return Response.redirect(
      `${frontendUrl}/auth/threads/callback?error=callback_failed&error_description=${encodeURIComponent(errorMessage)}`,
      302
    );
  }
});

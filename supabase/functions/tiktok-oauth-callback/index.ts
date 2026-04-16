import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { encrypt, decryptCredential } from "../_shared/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getFrontendUrl(stateData: any): string {
  if (stateData.frontendOrigin) return stateData.frontendOrigin;
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  if (supabaseUrl.includes('supabase.co')) {
    return supabaseUrl.replace('.supabase.co', '.lovable.app').replace('/functions/v1', '');
  }
  return 'http://localhost:5173';
}

Deno.serve(withPerf({ functionName: 'tiktok-oauth-callback' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let frontendUrl = 'http://localhost:5173';

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    const supabase = getServiceClient();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

    // Parse state early to get frontendUrl
    let stateData: { brandTemplateId?: string; organizationId?: string; userId?: string; frontendOrigin?: string } = {};
    if (state) {
      try {
        stateData = JSON.parse(atob(state));
        frontendUrl = getFrontendUrl(stateData);
      } catch { /* use default */ }
    }

    // Handle OAuth errors
    if (error) {
      console.error('TikTok OAuth error:', error, errorDescription);
      const redirectUrl = new URL('/auth/tiktok/callback', frontendUrl);
      redirectUrl.searchParams.set('error', errorDescription || error);
      return Response.redirect(redirectUrl.toString(), 302);
    }

    if (!code || !state) {
      const redirectUrl = new URL('/auth/tiktok/callback', frontendUrl);
      redirectUrl.searchParams.set('error', 'Missing authorization code or state');
      return Response.redirect(redirectUrl.toString(), 302);
    }

    console.log('TikTok OAuth callback - state:', stateData);

    // Get TikTok credentials from settings
    const { data: settings, error: settingsError } = await supabase
      .from('social_platform_settings')
      .select('consumer_key, consumer_secret')
      .eq('platform', 'tiktok')
      .eq('is_active', true)
      .single();

    if (settingsError || !settings) {
      const redirectUrl = new URL('/auth/tiktok/callback', frontendUrl);
      redirectUrl.searchParams.set('error', 'TikTok not configured');
      return Response.redirect(redirectUrl.toString(), 302);
    }

    const clientKey = await decryptCredential(settings.consumer_key);
    const clientSecret = await decryptCredential(settings.consumer_secret);

    if (!clientKey || !clientSecret) {
      const redirectUrl = new URL('/auth/tiktok/callback', frontendUrl);
      redirectUrl.searchParams.set('error', 'Failed to decrypt TikTok credentials');
      return Response.redirect(redirectUrl.toString(), 302);
    }

    const redirectUri = `${supabaseUrl}/functions/v1/tiktok-oauth-callback`;

    // Exchange code for access token
    console.log('Exchanging code for TikTok access token...');
    const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('TikTok token exchange failed:', tokenResponse.status, errorText);
      const redirectUrl = new URL('/auth/tiktok/callback', frontendUrl);
      redirectUrl.searchParams.set('error', `Token exchange failed: ${tokenResponse.status}`);
      return Response.redirect(redirectUrl.toString(), 302);
    }

    const tokenData = await tokenResponse.json();
    console.log('TikTok token exchange result:', { 
      has_access_token: !!tokenData.access_token,
      expires_in: tokenData.expires_in,
      open_id: tokenData.open_id,
    });

    if (tokenData.error || !tokenData.access_token) {
      const errMsg = tokenData.error_description || tokenData.error || 'Unknown token error';
      console.error('TikTok token error:', errMsg);
      const redirectUrl = new URL('/auth/tiktok/callback', frontendUrl);
      redirectUrl.searchParams.set('error', errMsg);
      return Response.redirect(redirectUrl.toString(), 302);
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 86400; // Default 24h
    const openId = tokenData.open_id;

    // Get user info from TikTok
    let displayName = 'TikTok User';
    let avatarUrl: string | null = null;
    try {
      console.log('Fetching TikTok user info...');
      const userInfoResponse = await fetch(
        'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (userInfoResponse.ok) {
        const userInfoData = await userInfoResponse.json();
        const userData = userInfoData.data?.user;
        if (userData) {
          displayName = userData.display_name || displayName;
          avatarUrl = userData.avatar_url || null;
        }
        console.log('TikTok user info:', { displayName, openId });
      } else {
        console.warn('Failed to fetch TikTok user info:', userInfoResponse.status);
      }
    } catch (e) {
      console.warn('Error fetching TikTok user info:', e);
    }

    // Calculate token expiry
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Encrypt tokens before storing
    const encryptedAccessToken = await encrypt(accessToken);
    const encryptedRefreshToken = refreshToken ? await encrypt(refreshToken) : null;

    // Check for existing connection
    let query = supabase
      .from('social_connections')
      .select('id')
      .eq('platform', 'tiktok');

    if (stateData.brandTemplateId) {
      query = query.eq('brand_template_id', stateData.brandTemplateId);
    } else if (stateData.organizationId) {
      query = query.eq('organization_id', stateData.organizationId);
    }

    const { data: existingConnection } = await query.maybeSingle();

    // Save or update connection
    const connectionData = {
      organization_id: stateData.organizationId || null,
      brand_template_id: stateData.brandTemplateId || null,
      user_id: stateData.userId || null,
      platform: 'tiktok',
      platform_user_id: openId,
      platform_username: displayName,
      access_token: encryptedAccessToken,
      refresh_token: encryptedRefreshToken,
      token_expires_at: tokenExpiresAt,
      is_active: true,
      connected_at: new Date().toISOString(),
      scopes: ['user.info.basic', 'video.publish', 'video.upload'],
      metadata: {
        open_id: openId,
        avatar_url: avatarUrl,
        token_type: 'access_token',
        refresh_expires_in: tokenData.refresh_expires_in || null,
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

      if (updateError) {
        console.error('Connection update error:', updateError);
        const redirectUrl = new URL('/auth/tiktok/callback', frontendUrl);
        redirectUrl.searchParams.set('error', 'Failed to update connection');
        return Response.redirect(redirectUrl.toString(), 302);
      }
      connection = data;
    } else {
      const { data, error: insertError } = await supabase
        .from('social_connections')
        .insert(connectionData)
        .select()
        .single();

      if (insertError) {
        console.error('Connection insert error:', insertError);
        const redirectUrl = new URL('/auth/tiktok/callback', frontendUrl);
        redirectUrl.searchParams.set('error', 'Failed to save connection');
        return Response.redirect(redirectUrl.toString(), 302);
      }
      connection = data;
    }

    console.log('TikTok connection saved:', connection.id);

    // Redirect to frontend with success
    const redirectUrl = new URL('/auth/tiktok/callback', frontendUrl);
    redirectUrl.searchParams.set('success', 'true');
    redirectUrl.searchParams.set('username', displayName);
    if (stateData.brandTemplateId) {
      redirectUrl.searchParams.set('brandTemplateId', stateData.brandTemplateId);
    }

    return Response.redirect(redirectUrl.toString(), 302);

  } catch (error: unknown) {
    console.error('TikTok OAuth callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    const redirectUrl = new URL('/auth/tiktok/callback', frontendUrl);
    redirectUrl.searchParams.set('error', errorMessage);
    return Response.redirect(redirectUrl.toString(), 302);
  }
}));

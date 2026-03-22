import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Encrypt token using AES-GCM
async function encryptToken(token: string, encryptionKey: string): Promise<string> {
  const keyData = new TextEncoder().encode(encryptionKey.slice(0, 32).padEnd(32, '0'));
  const key = await crypto.subtle.importKey(
    'raw', keyData, { name: 'AES-GCM' }, false, ['encrypt']
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedToken = new TextEncoder().encode(token);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, encodedToken
  );
  
  // Return as iv:encrypted in base64
  const ivBase64 = btoa(String.fromCharCode(...iv));
  const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  return `${ivBase64}:${encryptedBase64}`;
}

// Decrypt encrypted credentials from social_platform_settings
async function decryptCredential(encryptedText: string, encryptionKey: string): Promise<string> {
  try {
    const keyData = new TextEncoder().encode(encryptionKey.slice(0, 32).padEnd(32, '0'));
    const key = await crypto.subtle.importKey(
      'raw', keyData, { name: 'AES-GCM' }, false, ['decrypt']
    );
    
    const parts = encryptedText.split(':');
    if (parts.length === 2) {
      const iv = Uint8Array.from(atob(parts[0]), c => c.charCodeAt(0));
      const encrypted = Uint8Array.from(atob(parts[1]), c => c.charCodeAt(0));
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv }, key, encrypted
      );
      return new TextDecoder().decode(decrypted);
    }
    return encryptedText;
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
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const encryptionKey = Deno.env.get('AI_ENCRYPTION_KEY') || 'default-key';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get frontend URL for redirect
    const frontendUrl = supabaseUrl.includes('supabase.co') 
      ? supabaseUrl.replace('.supabase.co', '.lovable.app').replace('/functions/v1', '')
      : 'http://localhost:5173';

    // Handle OAuth errors
    if (error) {
      console.error('LinkedIn OAuth error:', error, errorDescription);
      const redirectUrl = new URL('/auth/linkedin/callback', frontendUrl);
      redirectUrl.searchParams.set('error', errorDescription || error);
      return Response.redirect(redirectUrl.toString(), 302);
    }

    if (!code || !state) {
      const redirectUrl = new URL('/auth/linkedin/callback', frontendUrl);
      redirectUrl.searchParams.set('error', 'Missing authorization code or state');
      return Response.redirect(redirectUrl.toString(), 302);
    }

    // Parse state
    let stateData: { brandTemplateId?: string; organizationId?: string; userId?: string };
    try {
      stateData = JSON.parse(atob(state));
    } catch (e) {
      const redirectUrl = new URL('/auth/linkedin/callback', frontendUrl);
      redirectUrl.searchParams.set('error', 'Invalid state parameter');
      return Response.redirect(redirectUrl.toString(), 302);
    }

    console.log('LinkedIn OAuth callback - state:', stateData);

    // Get LinkedIn credentials from settings
    const { data: settings, error: settingsError } = await supabase
      .from('social_platform_settings')
      .select('consumer_key, consumer_secret')
      .eq('platform', 'linkedin')
      .eq('is_active', true)
      .single();

    if (settingsError || !settings) {
      const redirectUrl = new URL('/auth/linkedin/callback', frontendUrl);
      redirectUrl.searchParams.set('error', 'LinkedIn not configured');
      return Response.redirect(redirectUrl.toString(), 302);
    }

    const clientId = await decryptCredential(settings.consumer_key, encryptionKey);
    const clientSecret = await decryptCredential(settings.consumer_secret, encryptionKey);

    if (!clientId || !clientSecret) {
      const redirectUrl = new URL('/auth/linkedin/callback', frontendUrl);
      redirectUrl.searchParams.set('error', 'Failed to decrypt LinkedIn credentials');
      return Response.redirect(redirectUrl.toString(), 302);
    }

    const redirectUri = `${supabaseUrl}/functions/v1/linkedin-oauth-callback`;

    // Exchange code for access token
    console.log('Exchanging code for access token...');
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', tokenResponse.status, errorText);
      const redirectUrl = new URL('/auth/linkedin/callback', frontendUrl);
      redirectUrl.searchParams.set('error', `Token exchange failed: ${tokenResponse.status}`);
      return Response.redirect(redirectUrl.toString(), 302);
    }

    const tokenData = await tokenResponse.json();
    console.log('Token exchange successful, expires_in:', tokenData.expires_in);

    const accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in || 5184000; // Default 60 days

    // Get user info from LinkedIn
    console.log('Fetching LinkedIn user info...');
    const userInfoResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!userInfoResponse.ok) {
      const errorText = await userInfoResponse.text();
      console.error('User info fetch failed:', userInfoResponse.status, errorText);
      const redirectUrl = new URL('/auth/linkedin/callback', frontendUrl);
      redirectUrl.searchParams.set('error', `Failed to get user info: ${userInfoResponse.status}`);
      return Response.redirect(redirectUrl.toString(), 302);
    }

    const userInfo = await userInfoResponse.json();
    console.log('LinkedIn user info:', { sub: userInfo.sub, name: userInfo.name });

    const personId = userInfo.sub;
    const personUrn = `urn:li:person:${personId}`;
    const displayName = userInfo.name || userInfo.given_name || 'LinkedIn User';

    // Calculate token expiry
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Encrypt access token before storing
    const encryptedAccessToken = await encryptToken(accessToken, encryptionKey);

    // Check for existing connection
    let query = supabase
      .from('social_connections')
      .select('id')
      .eq('platform', 'linkedin');

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
      platform: 'linkedin',
      platform_user_id: personId,
      platform_username: displayName,
      access_token: encryptedAccessToken,
      refresh_token: tokenData.refresh_token ? await encryptToken(tokenData.refresh_token, encryptionKey) : null,
      token_expires_at: tokenExpiresAt,
      is_active: true,
      connected_at: new Date().toISOString(),
      scopes: ['openid', 'profile', 'w_member_social'],
      metadata: {
        person_urn: personUrn,
        picture: userInfo.picture || null,
        email: userInfo.email || null,
        token_type: 'access_token',
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
        const redirectUrl = new URL('/auth/linkedin/callback', frontendUrl);
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
        const redirectUrl = new URL('/auth/linkedin/callback', frontendUrl);
        redirectUrl.searchParams.set('error', 'Failed to save connection');
        return Response.redirect(redirectUrl.toString(), 302);
      }
      connection = data;
    }

    console.log('LinkedIn connection saved:', connection.id);

    // Redirect to frontend with success
    const redirectUrl = new URL('/auth/linkedin/callback', frontendUrl);
    redirectUrl.searchParams.set('success', 'true');
    redirectUrl.searchParams.set('username', displayName);
    if (stateData.brandTemplateId) {
      redirectUrl.searchParams.set('brandTemplateId', stateData.brandTemplateId);
    }

    return Response.redirect(redirectUrl.toString(), 302);

  } catch (error: unknown) {
    console.error('LinkedIn OAuth callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const frontendUrl = supabaseUrl.includes('supabase.co') 
      ? supabaseUrl.replace('.supabase.co', '.lovable.app').replace('/functions/v1', '')
      : 'http://localhost:5173';

    const redirectUrl = new URL('/auth/linkedin/callback', frontendUrl);
    redirectUrl.searchParams.set('error', errorMessage);
    return Response.redirect(redirectUrl.toString(), 302);
  }
});

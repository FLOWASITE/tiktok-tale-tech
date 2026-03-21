import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origin patterns for open-redirect prevention
const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/,
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/,
  /^https:\/\/(app\.)?flowa\.(one|vn)$/,
  /^http:\/\/localhost(:\d+)?$/,
  /^https:\/\/id-preview--[a-z0-9-]+\.lovable\.app$/,
];

function isAllowedOrigin(origin: string): boolean {
  return ALLOWED_ORIGIN_PATTERNS.some(p => p.test(origin));
}

function getFrontendUrl(stateOrigin?: string | null): string {
  if (stateOrigin && isAllowedOrigin(stateOrigin)) return stateOrigin;
  const configured = Deno.env.get('FRONTEND_URL');
  if (configured) return configured;
  return 'https://tiktok-tale-tech.lovable.app';
}

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    console.log('X OAuth callback received:', { hasCode: !!code, hasState: !!state, error });

    if (error) {
      console.error('X OAuth error:', error, errorDescription);
      let errorOrigin: string | null = null;
      try { if (state) errorOrigin = JSON.parse(atob(state)).frontendOrigin; } catch { /* ignore */ }
      return Response.redirect(
        `${getFrontendUrl(errorOrigin)}/auth/x/callback?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || '')}`,
        302
      );
    }

    if (!code || !state) {
      throw new Error('Missing code or state parameter');
    }

    let stateData;
    try {
      stateData = JSON.parse(atob(state));
    } catch {
      throw new Error('Invalid state parameter');
    }

    const { brandTemplateId, organizationId, userId, frontendOrigin, codeVerifier } = stateData;
    console.log('State decoded:', { brandTemplateId, organizationId, userId, hasFrontendOrigin: !!frontendOrigin, hasCodeVerifier: !!codeVerifier });

    if (!codeVerifier) {
      throw new Error('Missing code_verifier in state');
    }

    const clientId = Deno.env.get('X_CLIENT_ID')!;
    const clientSecret = Deno.env.get('X_CLIENT_SECRET')!;
    const callbackUrl = Deno.env.get('X_CALLBACK_URL')!;

    // Exchange authorization code for tokens
    console.log('Exchanging code for tokens...');
    const tokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: callbackUrl,
      client_id: clientId,
      code_verifier: codeVerifier,
    });

    const tokenResponse = await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`),
      },
      body: tokenBody.toString(),
    });

    const tokenText = await tokenResponse.text();
    console.log('Token response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokenText);
      throw new Error(`Token exchange failed: ${tokenText}`);
    }

    const tokenData = JSON.parse(tokenText);
    const { access_token, refresh_token, expires_in } = tokenData;
    console.log('Tokens obtained, expires_in:', expires_in);

    // Fetch user profile
    console.log('Fetching X user profile...');
    const userResponse = await fetch('https://api.x.com/2/users/me?user.fields=profile_image_url,name,username', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    const userText = await userResponse.text();
    if (!userResponse.ok) {
      console.error('User fetch failed:', userText);
      throw new Error(`Failed to fetch user: ${userText}`);
    }

    const userData = JSON.parse(userText);
    const xUser = userData.data;
    console.log('X user:', { id: xUser.id, username: xUser.username, name: xUser.name });

    // Calculate token expiry
    const tokenExpiresAt = new Date(Date.now() + (expires_in || 7200) * 1000).toISOString();

    // Save to database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for existing connection
    let query = supabase
      .from('social_connections')
      .select('id')
      .eq('platform', 'twitter');

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
      platform: 'twitter',
      platform_user_id: xUser.id,
      platform_username: xUser.username,
      platform_display_name: xUser.name,
      platform_avatar_url: xUser.profile_image_url?.replace('_normal', '_400x400') || null,
      access_token,
      refresh_token: refresh_token || null,
      token_expires_at: tokenExpiresAt,
      is_active: true,
      connected_at: new Date().toISOString(),
      last_verified_at: new Date().toISOString(),
      scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
      metadata: {
        oauth2_pkce: true,
        token_type: 'bearer',
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
      console.log('Updated existing X connection:', connection.id);
    } else {
      const { data, error: insertError } = await supabase
        .from('social_connections')
        .insert(connectionData)
        .select()
        .single();
      if (insertError) throw insertError;
      connection = data;
      console.log('Created new X connection:', connection.id);
    }

    // Redirect to frontend callback page
    const redirectParams: Record<string, string> = {
      success: 'true',
      username: xUser.username,
      display_name: xUser.name,
      connection_id: connection.id,
    };
    if (brandTemplateId) redirectParams.brand_template_id = brandTemplateId;

    const successUrl = `${getFrontendUrl(frontendOrigin)}/auth/x/callback?` + new URLSearchParams(redirectParams).toString();
    console.log('Redirecting to:', successUrl);
    return Response.redirect(successUrl, 302);

  } catch (error) {
    console.error('X OAuth callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // Try to extract frontendOrigin from state for proper redirect
    let errorOrigin: string | null = null;
    try {
      const url = new URL(req.url);
      const state = url.searchParams.get('state');
      if (state) errorOrigin = JSON.parse(atob(state)).frontendOrigin;
    } catch { /* ignore */ }
    return Response.redirect(
      `${getFrontendUrl(errorOrigin)}/auth/x/callback?error=callback_failed&error_description=${encodeURIComponent(errorMessage)}`,
      302
    );
  }
});

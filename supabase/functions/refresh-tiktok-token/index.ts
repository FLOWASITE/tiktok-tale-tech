import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { decryptCredential, encrypt } from "../_shared/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(withPerf({ functionName: 'refresh-tiktok-token' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getServiceClient();
    const { connectionId } = await req.json();

    if (!connectionId) {
      throw new Error('connectionId is required');
    }

    const { data: connection, error: connError } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('platform', 'tiktok')
      .single();

    if (connError || !connection) {
      throw new Error('TikTok connection not found');
    }

    if (!connection.refresh_token) {
      await supabase
        .from('social_connections')
        .update({
          is_active: false,
          metadata: { ...connection.metadata, needs_reauth: true, refresh_error: 'No refresh token' },
        })
        .eq('id', connectionId);

      return new Response(
        JSON.stringify({ success: false, error: 'No refresh token available', needs_reauth: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get TikTok credentials
    const { data: settings, error: settingsError } = await supabase
      .from('social_platform_settings')
      .select('consumer_key, consumer_secret')
      .eq('platform', 'tiktok')
      .eq('is_active', true)
      .single();

    if (settingsError || !settings) {
      throw new Error('TikTok platform settings not found');
    }

    const clientKey = await decryptCredential(settings.consumer_key);
    const clientSecret = await decryptCredential(settings.consumer_secret);
    const refreshToken = await decryptCredential(connection.refresh_token);

    if (!clientKey || !clientSecret || !refreshToken) {
      throw new Error('Invalid credentials');
    }

    console.log(`Refreshing TikTok token for connection: ${connectionId}`);

    const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      const errorMsg = tokenData.error_description || tokenData.message || 'Failed to refresh token';

      await supabase
        .from('social_connections')
        .update({
          is_active: false,
          metadata: {
            ...connection.metadata,
            needs_reauth: true,
            refresh_error: errorMsg,
          },
        })
        .eq('id', connectionId);

      return new Response(
        JSON.stringify({ success: false, error: errorMsg, needs_reauth: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const expiresIn = tokenData.expires_in || 86400; // TikTok default 24h
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const encryptedAccessToken = await encrypt(tokenData.access_token);
    const encryptedRefreshToken = tokenData.refresh_token
      ? await encrypt(tokenData.refresh_token)
      : connection.refresh_token;

    await supabase
      .from('social_connections')
      .update({
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        token_expires_at: tokenExpiresAt,
        is_active: true,
        metadata: {
          ...connection.metadata,
          last_refreshed: new Date().toISOString(),
          needs_reauth: false,
        },
      })
      .eq('id', connectionId);

    console.log('TikTok token refreshed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Token refreshed successfully',
        expiresAt: tokenExpiresAt,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Refresh TikTok token error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));

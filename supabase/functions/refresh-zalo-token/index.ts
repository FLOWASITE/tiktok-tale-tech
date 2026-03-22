import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { decryptCredential, encrypt } from "../_shared/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(withPerf({ functionName: 'refresh-zalo-token' }, async (req) => {
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
      .eq('platform', 'zalo_oa')
      .single();

    if (connError || !connection) {
      throw new Error('Connection not found');
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

    // Get Zalo credentials
    const { data: settings, error: settingsError } = await supabase
      .from('social_platform_settings')
      .select('consumer_key, consumer_secret')
      .eq('platform', 'zalo_oa')
      .eq('is_active', true)
      .single();

    if (settingsError || !settings) {
      throw new Error('Zalo OA settings not found');
    }

    // Use shared crypto helper
    const appId = await decryptCredential(settings.consumer_key);
    const secretKey = await decryptCredential(settings.consumer_secret);
    const refreshToken = await decryptCredential(connection.refresh_token);

    if (!appId || !secretKey || !refreshToken) {
      throw new Error('Invalid credentials');
    }

    console.log(`Refreshing Zalo token for connection: ${connectionId}`);

    const tokenResponse = await fetch('https://oauth.zaloapp.com/v4/oa/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'secret_key': secretKey,
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        app_id: appId,
        grant_type: 'refresh_token',
      }).toString(),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      await supabase
        .from('social_connections')
        .update({
          is_active: false,
          metadata: { 
            ...connection.metadata, 
            needs_reauth: true, 
            refresh_error: tokenData.error_description || 'Failed to refresh token' 
          },
        })
        .eq('id', connectionId);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: tokenData.error_description || 'Failed to refresh token', 
          needs_reauth: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const expiresIn = tokenData.expires_in || 3600;
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Encrypt tokens using shared GCM helper
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
        metadata: { ...connection.metadata, last_refreshed: new Date().toISOString(), needs_reauth: false },
      })
      .eq('id', connectionId);

    console.log('Zalo token refreshed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Token refreshed successfully',
        expiresAt: tokenExpiresAt,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Refresh Zalo token error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));

import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { encrypt as encryptGCM, decryptCredential } from "../_shared/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Crypto handled via shared helpers

Deno.serve(withPerf({ functionName: 'refresh-google-business-token' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getServiceClient();

    const { connectionId } = await req.json();

    if (!connectionId) {
      throw new Error('connectionId is required');
    }

    // Get connection
    const { data: connection, error: connError } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('platform', 'google_business')
      .single();

    if (connError || !connection) {
      throw new Error('Connection not found');
    }

    if (!connection.refresh_token) {
      // No refresh token - mark as needs_reauth
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

    // Get Google credentials
    const { data: settings, error: settingsError } = await supabase
      .from('social_platform_settings')
      .select('consumer_key, consumer_secret')
      .eq('platform', 'google_business')
      .eq('is_active', true)
      .single();

    if (settingsError || !settings) {
      throw new Error('Google Business settings not found');
    }

    let clientId = '';
    let clientSecret = '';
    let refreshToken = '';
    try {
      clientId = await decryptCredential(settings.consumer_key);
      clientSecret = await decryptCredential(settings.consumer_secret);
      refreshToken = await decryptCredential(connection.refresh_token);
    } catch (e) {
      console.error('decryptCredential failed:', e);
      throw new Error('Invalid credentials');
    }
    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('Invalid credentials');
    }

    console.log(`Refreshing Google Business token for connection: ${connectionId}`);

    // Refresh the token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
      }).toString(),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      // Failed to refresh - mark as needs_reauth
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

    // Calculate new expiry
    const expiresIn = tokenData.expires_in || 3600;
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Encrypt and update tokens (AES-GCM)
    const encryptedAccessToken = await encryptGCM(tokenData.access_token);

    await supabase
      .from('social_connections')
      .update({
        access_token: encryptedAccessToken,
        token_expires_at: tokenExpiresAt,
        is_active: true,
        metadata: { ...connection.metadata, last_refreshed: new Date().toISOString(), needs_reauth: false },
      })
      .eq('id', connectionId);

    console.log('Google Business token refreshed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Token refreshed successfully',
        expiresAt: tokenExpiresAt,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Refresh Google Business token error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));

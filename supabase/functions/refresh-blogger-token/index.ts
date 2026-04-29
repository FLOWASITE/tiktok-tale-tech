import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { encrypt as encryptGCM, decryptCredential } from "../_shared/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(withPerf({ functionName: 'refresh-blogger-token' }, async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = getServiceClient();
    const { connectionId } = await req.json();
    if (!connectionId) throw new Error('connectionId is required');

    const { data: connection, error: connError } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('platform', 'blogger')
      .single();

    if (connError || !connection) throw new Error('Blogger connection not found');

    if (!connection.refresh_token) {
      await supabase.from('social_connections').update({
        is_active: false,
        metadata: { ...connection.metadata, needs_reauth: true, refresh_error: 'No refresh token' },
      }).eq('id', connectionId);
      return new Response(JSON.stringify({ success: false, error: 'No refresh token', needs_reauth: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get credentials (blogger or fallback google_business)
    let { data: settings } = await supabase
      .from('social_platform_settings')
      .select('consumer_key, consumer_secret')
      .eq('platform', 'blogger')
      .eq('is_active', true)
      .maybeSingle();
    if (!settings) {
      const { data: gb } = await supabase
        .from('social_platform_settings')
        .select('consumer_key, consumer_secret')
        .eq('platform', 'google_business')
        .eq('is_active', true)
        .maybeSingle();
      settings = gb;
    }
    if (!settings) throw new Error('Google credentials not configured');

    const clientId = await decryptCredential(settings.consumer_key);
    const clientSecret = await decryptCredential(settings.consumer_secret);
    const refreshToken = await decryptCredential(connection.refresh_token);
    if (!clientId || !clientSecret || !refreshToken) throw new Error('Invalid credentials');

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
      }).toString(),
    });
    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      await supabase.from('social_connections').update({
        is_active: false,
        metadata: { ...connection.metadata, needs_reauth: true, refresh_error: tokenData.error_description || 'Failed' },
      }).eq('id', connectionId);
      return new Response(JSON.stringify({ success: false, error: tokenData.error_description || 'Failed', needs_reauth: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const expiresIn = tokenData.expires_in || 3600;
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    const encryptedAccessToken = await encryptGCM(tokenData.access_token);

    await supabase.from('social_connections').update({
      access_token: encryptedAccessToken,
      token_expires_at: tokenExpiresAt,
      is_active: true,
      metadata: { ...connection.metadata, last_refreshed: new Date().toISOString(), needs_reauth: false },
    }).eq('id', connectionId);

    return new Response(JSON.stringify({ success: true, expiresAt: tokenExpiresAt }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('[refresh-blogger-token] error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}));

import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(withPerf({ functionName: 'refresh-x-token' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { connectionId } = await req.json();
    if (!connectionId) throw new Error('connectionId is required');

    const supabase = getServiceClient();

    // Get connection
    const { data: connection, error: connError } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (connError || !connection) throw new Error('Connection not found');
    if (connection.platform !== 'twitter') throw new Error('Not a Twitter connection');
    if (!connection.refresh_token) throw new Error('No refresh token available');

    const clientId = Deno.env.get('X_CLIENT_ID')!;
    const clientSecret = Deno.env.get('X_CLIENT_SECRET')!;

    console.log('Refreshing X token for connection:', connectionId);

    const tokenBody = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: connection.refresh_token,
      client_id: clientId,
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
    if (!tokenResponse.ok) {
      console.error('Refresh failed:', tokenText);
      throw new Error(`Token refresh failed: ${tokenText}`);
    }

    const tokenData = JSON.parse(tokenText);
    const tokenExpiresAt = new Date(Date.now() + (tokenData.expires_in || 7200) * 1000).toISOString();

    // Update connection
    const { error: updateError } = await supabase
      .from('social_connections')
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || connection.refresh_token,
        token_expires_at: tokenExpiresAt,
        last_error: null,
      })
      .eq('id', connectionId);

    if (updateError) throw updateError;

    console.log('X token refreshed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        access_token: tokenData.access_token,
        expires_at: tokenExpiresAt,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Refresh X token error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));

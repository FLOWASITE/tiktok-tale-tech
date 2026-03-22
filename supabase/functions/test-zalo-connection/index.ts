import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { decryptCredential } from "../_shared/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // Decrypt access token using shared helper
    const accessToken = await decryptCredential(connection.access_token);
    if (!accessToken) {
      throw new Error('Failed to decrypt access token');
    }

    const isExpired = connection.token_expires_at && new Date(connection.token_expires_at) < new Date();

    if (isExpired) {
      await supabase
        .from('social_connections')
        .update({
          is_active: false,
          metadata: { ...connection.metadata, needs_reauth: true, test_error: 'Token expired' },
        })
        .eq('id', connectionId);

      return new Response(
        JSON.stringify({ success: false, valid: false, error: 'Token expired', needs_reauth: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Testing Zalo connection: ${connectionId}`);

    const oaInfoResponse = await fetch('https://openapi.zalo.me/v2.0/oa/getoa', {
      headers: { 'access_token': accessToken },
    });

    const oaInfo = await oaInfoResponse.json();
    console.log('Zalo OA info:', oaInfo);

    if (oaInfo.error && oaInfo.error !== 0) {
      await supabase
        .from('social_connections')
        .update({
          is_active: false,
          metadata: { ...connection.metadata, needs_reauth: true, test_error: oaInfo.message || 'Invalid token' },
        })
        .eq('id', connectionId);

      return new Response(
        JSON.stringify({ success: false, valid: false, error: oaInfo.message || 'Invalid token', needs_reauth: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const updatedMetadata = {
      ...connection.metadata,
      oa_name: oaInfo.data?.name || connection.metadata?.oa_name,
      oa_avatar: oaInfo.data?.avatar || connection.metadata?.oa_avatar,
      oa_followers: oaInfo.data?.num_follower || null,
      last_tested: new Date().toISOString(),
      needs_reauth: false,
    };

    await supabase
      .from('social_connections')
      .update({
        is_active: true,
        platform_username: oaInfo.data?.name || connection.platform_username,
        metadata: updatedMetadata,
      })
      .eq('id', connectionId);

    return new Response(
      JSON.stringify({
        success: true,
        valid: true,
        oaInfo: {
          name: oaInfo.data?.name,
          oaId: oaInfo.data?.oa_id,
          avatar: oaInfo.data?.avatar,
          followers: oaInfo.data?.num_follower,
        },
        expiresAt: connection.token_expires_at,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Test Zalo connection error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

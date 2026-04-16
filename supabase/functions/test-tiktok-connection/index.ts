import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { decryptCredential } from "../_shared/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(withPerf({ functionName: 'test-tiktok-connection' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getServiceClient();

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { connectionId } = await req.json();

    if (!connectionId) {
      throw new Error('connectionId is required');
    }

    console.log('Testing TikTok connection:', connectionId);

    const { data: connection, error: connectionError } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('platform', 'tiktok')
      .single();

    if (connectionError || !connection) {
      throw new Error('TikTok connection not found');
    }

    let accessToken: string;
    try {
      accessToken = await decryptCredential(connection.access_token);
    } catch {
      throw new Error('Failed to decrypt access token');
    }

    // Check token expiry
    const tokenExpiresAt = connection.token_expires_at ? new Date(connection.token_expires_at) : null;
    const now = new Date();

    if (tokenExpiresAt && tokenExpiresAt < now) {
      await supabase
        .from('social_connections')
        .update({
          is_active: false,
          metadata: {
            ...connection.metadata,
            needs_reauth: true,
            reauth_reason: 'token_expired',
            tested_at: now.toISOString(),
          },
        })
        .eq('id', connectionId);

      return new Response(
        JSON.stringify({
          success: false,
          valid: false,
          error: 'Token đã hết hạn',
          needsReauth: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Test by fetching user info
    const userResponse = await fetch(
      'https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name',
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const userData = await userResponse.json();

    if (userData.error?.code !== 'ok' && userResponse.status !== 200) {
      const isAuthError = userData.error?.code === 'access_token_invalid' ||
                          userResponse.status === 401;

      if (isAuthError) {
        await supabase
          .from('social_connections')
          .update({
            is_active: false,
            metadata: {
              ...connection.metadata,
              needs_reauth: true,
              reauth_reason: 'auth_error',
              last_error: userData.error?.message,
              tested_at: now.toISOString(),
            },
          })
          .eq('id', connectionId);

        return new Response(
          JSON.stringify({
            success: false,
            valid: false,
            error: userData.error?.message || 'Token không hợp lệ',
            needsReauth: true,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(userData.error?.message || 'Failed to verify TikTok connection');
    }

    const userInfo = userData.data?.user;
    let daysUntilExpiry = null;
    let expiryWarning = false;
    if (tokenExpiresAt) {
      daysUntilExpiry = Math.ceil((tokenExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expiryWarning = daysUntilExpiry <= 1; // TikTok tokens expire in 24h
    }

    await supabase
      .from('social_connections')
      .update({
        is_active: true,
        last_verified_at: now.toISOString(),
        platform_username: userInfo?.display_name || connection.platform_username,
        metadata: {
          ...connection.metadata,
          needs_reauth: false,
          avatar_url: userInfo?.avatar_url,
          last_test_success: true,
          tested_at: now.toISOString(),
        },
      })
      .eq('id', connectionId);

    return new Response(
      JSON.stringify({
        success: true,
        valid: true,
        user: {
          openId: userInfo?.open_id,
          displayName: userInfo?.display_name,
          avatarUrl: userInfo?.avatar_url,
        },
        token: {
          expiresAt: tokenExpiresAt?.toISOString(),
          daysUntilExpiry,
          expiryWarning,
        },
        message: 'Kết nối TikTok hoạt động bình thường',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('TikTok connection test error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to test TikTok connection';
    return new Response(
      JSON.stringify({ success: false, valid: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));

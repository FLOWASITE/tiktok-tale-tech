import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { decryptCredential } from "../_shared/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestConnectionRequest {
  connectionId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const body: TestConnectionRequest = await req.json();
    const { connectionId } = body;

    if (!connectionId) {
      throw new Error('connectionId is required');
    }

    console.log('Testing Threads connection:', connectionId);

    // Get connection details
    const { data: connection, error: connectionError } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('platform', 'threads')
      .single();

    if (connectionError || !connection) {
      throw new Error('Threads connection not found');
    }

    // Decrypt access token
    const accessToken = await decryptCredential(connection.access_token);

    // Check token expiry
    const tokenExpiresAt = connection.token_expires_at ? new Date(connection.token_expires_at) : null;
    const now = new Date();
    
    if (tokenExpiresAt && tokenExpiresAt < now) {
      console.log('Token has expired');
      
      // Mark connection as needing reauth
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

    // Test connection by fetching user profile
    console.log('Fetching user profile...');
    const profileResponse = await fetch(
      `https://graph.threads.net/v1.0/me?` + new URLSearchParams({
        access_token: accessToken,
        fields: 'id,username,threads_profile_picture_url,threads_biography',
      })
    );

    if (!profileResponse.ok) {
      const errorData = await profileResponse.json();
      console.error('Threads API error:', errorData);

      // Check if it's an auth error
      const isAuthError = errorData.error?.code === 190 || 
                          errorData.error?.type === 'OAuthException';

      if (isAuthError) {
        // Mark connection as inactive
        await supabase
          .from('social_connections')
          .update({
            is_active: false,
            metadata: {
              ...connection.metadata,
              needs_reauth: true,
              reauth_reason: 'auth_error',
              last_error: errorData.error?.message,
              tested_at: now.toISOString(),
            },
          })
          .eq('id', connectionId);

        return new Response(
          JSON.stringify({
            success: false,
            valid: false,
            error: errorData.error?.message || 'Token không hợp lệ',
            needsReauth: true,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(errorData.error?.message || 'Failed to verify profile');
    }

    const profileData = await profileResponse.json();
    console.log('Profile verified:', profileData.username);

    // Calculate days until expiry
    let daysUntilExpiry = null;
    let expiryWarning = false;
    if (tokenExpiresAt) {
      daysUntilExpiry = Math.ceil((tokenExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expiryWarning = daysUntilExpiry <= 7;
    }

    // Update connection metadata with test results
    await supabase
      .from('social_connections')
      .update({
        is_active: true,
        platform_username: profileData.username,
        metadata: {
          ...connection.metadata,
          needs_reauth: false,
          profile_picture: profileData.threads_profile_picture_url,
          biography: profileData.threads_biography,
          last_test_success: true,
          tested_at: now.toISOString(),
        },
      })
      .eq('id', connectionId);

    return new Response(
      JSON.stringify({
        success: true,
        valid: true,
        profile: {
          id: profileData.id,
          username: profileData.username,
          profilePicture: profileData.threads_profile_picture_url,
          biography: profileData.threads_biography,
        },
        token: {
          expiresAt: tokenExpiresAt?.toISOString(),
          daysUntilExpiry,
          expiryWarning,
        },
        message: 'Kết nối Threads hoạt động bình thường',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Threads connection test error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to test Threads connection';
    return new Response(
      JSON.stringify({
        success: false,
        valid: false,
        error: errorMessage,
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

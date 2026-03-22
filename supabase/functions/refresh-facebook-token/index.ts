import { decryptCredential, encrypt as encryptGCM } from "../_shared/crypto.ts";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { decryptCredential, encrypt as encryptGCM } from "../_shared/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RefreshRequest {
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

    const body: RefreshRequest = await req.json();
    const { connectionId } = body;

    if (!connectionId) {
      throw new Error('connectionId is required');
    }

    console.log('Refreshing Facebook token for connection:', connectionId);

    // Get connection details
    const { data: connection, error: connectionError } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('platform', 'facebook')
      .single();

    if (connectionError || !connection) {
      throw new Error('Facebook connection not found');
    }

    const currentToken = await decryptCredential(connection.access_token);

    // Check if token is still valid by making a simple API call
    console.log('Checking current token validity...');
    const debugResponse = await fetch(
      `https://graph.facebook.com/v21.0/debug_token?` + new URLSearchParams({
        input_token: currentToken,
        access_token: currentToken, // Page tokens can debug themselves
      })
    );

    if (!debugResponse.ok) {
      console.log('Token debug check failed, marking as needs reauth');
      
      await supabase
        .from('social_connections')
        .update({
          is_active: false,
          metadata: {
            ...connection.metadata,
            needs_reauth: true,
            reauth_reason: 'token_invalid',
            checked_at: new Date().toISOString(),
          },
        })
        .eq('id', connectionId);

      return new Response(
        JSON.stringify({
          success: false,
          needsReauth: true,
          message: 'Token không hợp lệ. Vui lòng kết nối lại Facebook.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const debugData = await debugResponse.json();
    const tokenData = debugData.data;

    console.log('Token debug info:', {
      isValid: tokenData.is_valid,
      expiresAt: tokenData.expires_at,
      type: tokenData.type,
    });

    // Page access tokens derived from long-lived user tokens don't expire
    // But if it's a user token, we may need to refresh
    if (!tokenData.is_valid) {
      console.log('Token is not valid, marking as needs reauth');
      
      await supabase
        .from('social_connections')
        .update({
          is_active: false,
          metadata: {
            ...connection.metadata,
            needs_reauth: true,
            reauth_reason: 'token_expired',
            checked_at: new Date().toISOString(),
          },
        })
        .eq('id', connectionId);

      return new Response(
        JSON.stringify({
          success: false,
          needsReauth: true,
          message: 'Token đã hết hạn. Vui lòng kết nối lại Facebook.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Token is still valid
    // For page tokens, they don't expire if derived from a never-expiring page token
    // But we can update metadata to track last check
    
    let newExpiresAt = connection.token_expires_at;
    if (tokenData.expires_at && tokenData.expires_at > 0) {
      newExpiresAt = new Date(tokenData.expires_at * 1000).toISOString();
    }

    await supabase
      .from('social_connections')
      .update({
        is_active: true,
        token_expires_at: newExpiresAt,
        metadata: {
          ...connection.metadata,
          needs_reauth: false,
          last_refresh_check: new Date().toISOString(),
          token_type: tokenData.type,
          token_scopes: tokenData.scopes,
        },
      })
      .eq('id', connectionId);

    console.log('Token refresh check complete, token is valid');

    return new Response(
      JSON.stringify({
        success: true,
        needsReauth: false,
        tokenValid: true,
        expiresAt: newExpiresAt,
        message: 'Token vẫn còn hiệu lực',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Facebook token refresh error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to refresh Facebook token';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

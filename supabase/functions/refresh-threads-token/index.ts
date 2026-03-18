import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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

    console.log('Refreshing Threads token for connection:', connectionId);

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

    const currentToken = await decryptCredential(connection.access_token);

    // Check if token needs refresh (within 7 days of expiry)
    const tokenExpiresAt = connection.token_expires_at ? new Date(connection.token_expires_at) : null;
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (tokenExpiresAt && tokenExpiresAt > sevenDaysFromNow) {
      console.log('Token does not need refresh yet');
      return new Response(
        JSON.stringify({
          success: true,
          refreshed: false,
          expiresAt: tokenExpiresAt.toISOString(),
          message: 'Token vẫn còn hiệu lực',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Refresh the long-lived token
    console.log('Refreshing long-lived token...');
    const refreshResponse = await fetch(
      `https://graph.threads.net/refresh_access_token?` + new URLSearchParams({
        grant_type: 'th_refresh_token',
        access_token: currentToken,
      })
    );

    if (!refreshResponse.ok) {
      const refreshError = await refreshResponse.text();
      console.error('Token refresh failed:', refreshError);
      
      // Mark connection as needing reauth
      await supabase
        .from('social_connections')
        .update({
          is_active: false,
          metadata: {
            ...connection.metadata,
            needs_reauth: true,
            reauth_reason: 'refresh_failed',
            last_error: refreshError,
            checked_at: now.toISOString(),
          },
        })
        .eq('id', connectionId);

      return new Response(
        JSON.stringify({
          success: false,
          needsReauth: true,
          message: 'Không thể làm mới token. Vui lòng kết nối lại Threads.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const refreshData = await refreshResponse.json();
    const newToken = refreshData.access_token;
    const expiresIn = refreshData.expires_in || 5184000; // Default 60 days
    const newExpiresAt = new Date(now.getTime() + expiresIn * 1000).toISOString();

    console.log('Token refreshed, new expiry:', newExpiresAt);

    // Encrypt and save new token using GCM
    const encryptedToken = await encryptGCM(newToken);

    await supabase
      .from('social_connections')
      .update({
        access_token: encryptedToken,
        token_expires_at: newExpiresAt,
        is_active: true,
        metadata: {
          ...connection.metadata,
          needs_reauth: false,
          last_refresh: now.toISOString(),
          token_type: 'long_lived',
        },
      })
      .eq('id', connectionId);

    return new Response(
      JSON.stringify({
        success: true,
        refreshed: true,
        expiresAt: newExpiresAt,
        message: 'Token đã được làm mới thành công',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Threads token refresh error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to refresh Threads token';
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

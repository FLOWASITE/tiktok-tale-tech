import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function decryptToken(encryptedText: string, encryptionKey: string): Promise<string> {
  try {
    const combined = Uint8Array.from(atob(encryptedText), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    
    let keyBytes = Uint8Array.from(atob(encryptionKey), c => c.charCodeAt(0));
    if (keyBytes.length !== 32) {
      const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(encryptionKey));
      keyBytes = new Uint8Array(hashBuffer);
    }
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']
    );
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv }, cryptoKey, ciphertext
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt token');
  }
}

async function encryptToken(plainText: string, encryptionKey: string): Promise<string> {
  try {
    let keyBytes = Uint8Array.from(atob(encryptionKey), c => c.charCodeAt(0));
    if (keyBytes.length !== 32) {
      const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(encryptionKey));
      keyBytes = new Uint8Array(hashBuffer);
    }
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt']
    );
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plainText);
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv }, cryptoKey, encoded
    );
    
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt token');
  }
}

Deno.serve(withPerf({ functionName: 'refresh-linkedin-token' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { connectionId } = await req.json();

    if (!connectionId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Connection ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const encryptionKey = Deno.env.get('AI_ENCRYPTION_KEY')!;
    const supabase = getServiceClient();

    // Get connection details
    const { data: connection, error: connError } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('platform', 'linkedin')
      .single();

    if (connError || !connection) {
      console.error('Connection fetch error:', connError);
      return new Response(
        JSON.stringify({ success: false, error: 'LinkedIn connection not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if refresh token exists
    if (!connection.refresh_token) {
      console.log('No refresh token available for LinkedIn connection');
      
      // Mark connection as needing reauth
      await supabase
        .from('social_connections')
        .update({
          is_active: false,
          metadata: {
            ...connection.metadata,
            needs_reauth: true,
            reauth_reason: 'No refresh token available'
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', connectionId);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No refresh token available. User needs to reconnect.',
          needs_reauth: true 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decrypt refresh token
    let refreshToken: string;
    try {
      refreshToken = await decryptToken(connection.refresh_token, encryptionKey);
    } catch (error) {
      console.error('Failed to decrypt refresh token:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to decrypt refresh token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get LinkedIn client credentials from admin settings
    const { data: linkedinSettings } = await supabase
      .from('social_platform_settings')
      .select('encrypted_credentials')
      .eq('platform', 'linkedin')
      .eq('is_active', true)
      .single();

    if (!linkedinSettings?.encrypted_credentials) {
      return new Response(
        JSON.stringify({ success: false, error: 'LinkedIn credentials not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decrypt LinkedIn credentials
    let credentials: { client_id: string; client_secret: string };
    try {
      const decryptedCreds = await decryptToken(linkedinSettings.encrypted_credentials, encryptionKey);
      credentials = JSON.parse(decryptedCreds);
    } catch (error) {
      console.error('Failed to decrypt LinkedIn credentials:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to decrypt LinkedIn credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Refresh the access token
    console.log('Refreshing LinkedIn access token...');
    
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('LinkedIn token refresh failed:', tokenResponse.status, errorText);

      // Mark connection as needing reauth
      await supabase
        .from('social_connections')
        .update({
          is_active: false,
          metadata: {
            ...connection.metadata,
            needs_reauth: true,
            reauth_reason: `Token refresh failed: ${tokenResponse.status}`,
            last_refresh_error: errorText
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', connectionId);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to refresh token. User needs to reconnect.',
          needs_reauth: true 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenData = await tokenResponse.json();
    console.log('LinkedIn token refreshed successfully');

    // Encrypt new tokens
    const encryptedAccessToken = await encryptToken(tokenData.access_token, encryptionKey);
    const encryptedRefreshToken = tokenData.refresh_token 
      ? await encryptToken(tokenData.refresh_token, encryptionKey)
      : connection.refresh_token;

    // Calculate new expiry
    const expiresIn = tokenData.expires_in || 5184000; // Default 60 days
    const newExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Update connection with new tokens
    const { error: updateError } = await supabase
      .from('social_connections')
      .update({
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        token_expires_at: newExpiresAt,
        is_active: true,
        metadata: {
          ...connection.metadata,
          needs_reauth: false,
          last_refreshed_at: new Date().toISOString(),
          refresh_count: (connection.metadata?.refresh_count || 0) + 1
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId);

    if (updateError) {
      console.error('Failed to update connection:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save new tokens' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'LinkedIn token refreshed successfully',
        expires_at: newExpiresAt
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Refresh LinkedIn token error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));

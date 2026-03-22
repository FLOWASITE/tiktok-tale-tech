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

Deno.serve(withPerf({ functionName: 'test-linkedin-connection' }, async (req) => {
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

    // Check token expiry
    if (connection.token_expires_at) {
      const expiresAt = new Date(connection.token_expires_at);
      const now = new Date();
      const daysUntilExpiry = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (expiresAt <= now) {
        // Token expired
        await supabase
          .from('social_connections')
          .update({
            is_active: false,
            metadata: {
              ...connection.metadata,
              needs_reauth: true,
              reauth_reason: 'Token expired'
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', connectionId);

        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Token expired. Please reconnect your LinkedIn account.',
            expired: true,
            needs_reauth: true
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Warn if token expires soon (within 7 days)
      if (daysUntilExpiry <= 7) {
        console.log(`LinkedIn token expires in ${daysUntilExpiry} days`);
      }
    }

    // Decrypt access token
    let accessToken: string;
    try {
      accessToken = await decryptToken(connection.access_token, encryptionKey);
    } catch (error) {
      console.error('Failed to decrypt access token:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to decrypt access token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Test connection by fetching user info
    console.log('Testing LinkedIn connection...');
    
    const userResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error('LinkedIn API error:', userResponse.status, errorText);

      // If 401, mark as needing reauth
      if (userResponse.status === 401) {
        await supabase
          .from('social_connections')
          .update({
            is_active: false,
            metadata: {
              ...connection.metadata,
              needs_reauth: true,
              reauth_reason: 'Token invalid or revoked'
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', connectionId);

        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Token invalid or revoked. Please reconnect your LinkedIn account.',
            needs_reauth: true
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `LinkedIn API error: ${userResponse.status}` 
        }),
        { status: userResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userData = await userResponse.json();
    console.log('LinkedIn connection verified:', userData.sub);

    // Calculate days until expiry
    let daysUntilExpiry = null;
    if (connection.token_expires_at) {
      const expiresAt = new Date(connection.token_expires_at);
      daysUntilExpiry = Math.floor((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    }

    // Update last verified timestamp
    await supabase
      .from('social_connections')
      .update({
        is_active: true,
        metadata: {
          ...connection.metadata,
          last_verified_at: new Date().toISOString(),
          needs_reauth: false
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'LinkedIn connection is valid',
        profile: {
          id: userData.sub,
          name: userData.name,
          email: userData.email,
          picture: userData.picture
        },
        token_status: {
          expires_at: connection.token_expires_at,
          days_until_expiry: daysUntilExpiry,
          has_refresh_token: !!connection.refresh_token
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Test LinkedIn connection error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));

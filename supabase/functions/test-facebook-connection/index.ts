import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { decrypt as decryptGCM } from "../_shared/crypto.ts";
import { createDecipheriv } from "node:crypto";
import { Buffer } from "node:buffer";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestConnectionRequest {
  connectionId: string;
}

// Legacy CBC decrypt for backward compatibility
function decryptLegacyCBC(encryptedText: string, key: string): string {
  const textParts = encryptedText.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedData = Buffer.from(textParts.join(':'), 'hex');
  const keyBuffer = Buffer.alloc(32);
  Buffer.from(key).copy(keyBuffer);
  const decipher = createDecipheriv('aes-256-cbc', keyBuffer, iv);
  let decrypted = decipher.update(encryptedData);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// Try GCM first, fallback to legacy CBC
async function decryptCredential(ciphertext: string): Promise<string> {
  try {
    const result = await decryptGCM(ciphertext);
    if (result) return result;
  } catch { /* fallback */ }

  const encryptionKey = Deno.env.get('AI_ENCRYPTION_KEY') || 'default-key';
  const keyCandidates = [encryptionKey, 'default-encryption-key-change-me', 'default-key'];
  for (const candidate of keyCandidates) {
    try {
      const result = decryptLegacyCBC(ciphertext, candidate);
      if (result) return result;
    } catch { /* try next */ }
  }

  throw new Error('Failed to decrypt credential with any method');
}

Deno.serve(withPerf({ functionName: 'test-facebook-connection' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getServiceClient();

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

    console.log('Testing Facebook connection:', connectionId);

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

    // Decrypt access token (GCM first, fallback CBC)
    let accessToken: string;
    try {
      accessToken = await decryptCredential(connection.access_token);
    } catch (e) {
      console.error('Decryption failed:', e);
      throw new Error('Failed to decrypt access token');
    }

    const pageId = connection.platform_user_id || connection.metadata?.page_id;
    if (!pageId) {
      throw new Error('Page ID not found in connection');
    }

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

    // Test connection by fetching Page info
    console.log('Fetching Page info...');
    const pageResponse = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}?` + new URLSearchParams({
        access_token: accessToken,
        fields: 'id,name,category,followers_count,fan_count,picture',
      })
    );

    if (!pageResponse.ok) {
      const errorData = await pageResponse.json();
      console.error('Facebook API error:', errorData);

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

      throw new Error(errorData.error?.message || 'Failed to verify Page');
    }

    const pageData = await pageResponse.json();
    console.log('Page verified:', pageData.name);

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
        last_verified_at: now.toISOString(),
        platform_username: pageData.name,
        metadata: {
          ...connection.metadata,
          needs_reauth: false,
          page_category: pageData.category,
          followers_count: pageData.followers_count,
          fan_count: pageData.fan_count,
          page_picture: pageData.picture?.data?.url,
          last_test_success: true,
          tested_at: now.toISOString(),
        },
      })
      .eq('id', connectionId);

    return new Response(
      JSON.stringify({
        success: true,
        valid: true,
        page: {
          id: pageData.id,
          name: pageData.name,
          category: pageData.category,
          followers: pageData.followers_count || pageData.fan_count,
          picture: pageData.picture?.data?.url,
        },
        token: {
          expiresAt: tokenExpiresAt?.toISOString(),
          daysUntilExpiry,
          expiryWarning,
        },
        message: 'Kết nối Facebook Page hoạt động bình thường',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Facebook connection test error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to test Facebook connection';
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
}));

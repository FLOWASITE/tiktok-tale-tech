import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { createDecipheriv, createCipheriv, randomBytes } from "node:crypto";
import { Buffer } from "node:buffer";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Decrypt encrypted credentials
function decrypt(encryptedText: string, key: string): string {
  try {
    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedData = Buffer.from(textParts.join(':'), 'hex');
    
    const keyBuffer = Buffer.alloc(32);
    Buffer.from(key).copy(keyBuffer);
    
    const decipher = createDecipheriv('aes-256-cbc', keyBuffer, iv);
    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error('Decryption error:', error);
    return '';
  }
}

// Encrypt credentials
function encrypt(text: string, key: string): string {
  try {
    const iv = randomBytes(16);
    const keyBuffer = Buffer.alloc(32);
    Buffer.from(key).copy(keyBuffer);
    
    const cipher = createCipheriv('aes-256-cbc', keyBuffer, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (error) {
    console.error('Encryption error:', error);
    return '';
  }
}

interface RefreshRequest {
  connectionId?: string;
  refreshAll?: boolean;
  daysBeforeExpiry?: number;
}

Deno.serve(withPerf({ functionName: 'refresh-instagram-token' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const encryptionKey = Deno.env.get('AI_ENCRYPTION_KEY') || 'default-key';
    const supabase = getServiceClient();

    const body: RefreshRequest = await req.json().catch(() => ({}));
    const { connectionId, refreshAll = false, daysBeforeExpiry = 7 } = body;

    console.log('Refresh request:', { connectionId, refreshAll, daysBeforeExpiry });

    let connections;

    if (connectionId) {
      // Refresh specific connection
      const { data, error } = await supabase
        .from('social_connections')
        .select('*')
        .eq('id', connectionId)
        .eq('platform', 'instagram')
        .single();

      if (error || !data) {
        throw new Error('Instagram connection not found');
      }
      connections = [data];
    } else if (refreshAll) {
      // Refresh all expiring tokens
      const expiryThreshold = new Date();
      expiryThreshold.setDate(expiryThreshold.getDate() + daysBeforeExpiry);

      const { data, error } = await supabase
        .from('social_connections')
        .select('*')
        .eq('platform', 'instagram')
        .eq('is_active', true)
        .not('access_token', 'is', null)
        .or(`token_expires_at.is.null,token_expires_at.lte.${expiryThreshold.toISOString()}`);

      if (error) {
        throw new Error(`Failed to fetch connections: ${error.message}`);
      }
      connections = data || [];
    } else {
      throw new Error('Either connectionId or refreshAll must be provided');
    }

    console.log(`Found ${connections.length} connection(s) to refresh`);

    const results: Array<{
      connectionId: string;
      success: boolean;
      message: string;
      newExpiresAt?: string;
    }> = [];

    for (const connection of connections) {
      try {
        // Decrypt access token
        const accessToken = decrypt(connection.access_token, encryptionKey);
        if (!accessToken) {
          results.push({
            connectionId: connection.id,
            success: false,
            message: 'Failed to decrypt access token',
          });
          continue;
        }

        console.log(`Refreshing token for connection ${connection.id}...`);

        // Call Instagram API to refresh token
        // Long-lived tokens can be refreshed using the refresh endpoint
        const refreshResponse = await fetch(
          `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${accessToken}`,
          { method: 'GET' }
        );

        const refreshText = await refreshResponse.text();
        console.log('Refresh response status:', refreshResponse.status);

        if (!refreshResponse.ok) {
          let errorMessage = `HTTP ${refreshResponse.status}`;
          try {
            const errorData = JSON.parse(refreshText);
            if (errorData.error?.message) {
              errorMessage = errorData.error.message;
            }
          } catch (e) {
            // Use default error message
          }

          // Mark connection as inactive if token is invalid
          if (refreshResponse.status === 400 || refreshResponse.status === 401) {
            await supabase
              .from('social_connections')
              .update({ 
                is_active: false,
                metadata: {
                  ...connection.metadata,
                  refresh_error: errorMessage,
                  refresh_failed_at: new Date().toISOString(),
                }
              })
              .eq('id', connection.id);
          }

          results.push({
            connectionId: connection.id,
            success: false,
            message: `Token refresh failed: ${errorMessage}`,
          });
          continue;
        }

        const refreshData = JSON.parse(refreshText);
        const newAccessToken = refreshData.access_token;
        const expiresIn = refreshData.expires_in || 5184000; // Default 60 days

        // Calculate new expiry date
        const newExpiresAt = new Date();
        newExpiresAt.setSeconds(newExpiresAt.getSeconds() + expiresIn);

        // Encrypt new token
        const encryptedToken = encrypt(newAccessToken, encryptionKey);
        if (!encryptedToken) {
          results.push({
            connectionId: connection.id,
            success: false,
            message: 'Failed to encrypt new access token',
          });
          continue;
        }

        // Update connection with new token
        const { error: updateError } = await supabase
          .from('social_connections')
          .update({
            access_token: encryptedToken,
            token_expires_at: newExpiresAt.toISOString(),
            is_active: true,
            metadata: {
              ...connection.metadata,
              last_token_refresh: new Date().toISOString(),
              refresh_error: null,
            }
          })
          .eq('id', connection.id);

        if (updateError) {
          results.push({
            connectionId: connection.id,
            success: false,
            message: `Failed to update connection: ${updateError.message}`,
          });
          continue;
        }

        console.log(`Successfully refreshed token for connection ${connection.id}`);
        results.push({
          connectionId: connection.id,
          success: true,
          message: 'Token refreshed successfully',
          newExpiresAt: newExpiresAt.toISOString(),
        });

      } catch (error: any) {
        console.error(`Error refreshing connection ${connection.id}:`, error);
        results.push({
          connectionId: connection.id,
          success: false,
          message: error.message || 'Unknown error',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({
        success: failureCount === 0,
        message: `Refreshed ${successCount} token(s), ${failureCount} failed`,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Refresh Instagram token error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));

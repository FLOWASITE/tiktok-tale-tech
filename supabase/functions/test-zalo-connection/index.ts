import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createDecipheriv } from "node:crypto";
import { Buffer } from "node:buffer";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const encryptionKey = Deno.env.get('AI_ENCRYPTION_KEY') || 'default-key';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { connectionId } = await req.json();

    if (!connectionId) {
      throw new Error('connectionId is required');
    }

    // Get connection
    const { data: connection, error: connError } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('platform', 'zalo_oa')
      .single();

    if (connError || !connection) {
      throw new Error('Connection not found');
    }

    // Decrypt access token
    const accessToken = decrypt(connection.access_token, encryptionKey);
    if (!accessToken) {
      throw new Error('Failed to decrypt access token');
    }

    // Check if token is expired
    const isExpired = connection.token_expires_at && new Date(connection.token_expires_at) < new Date();

    if (isExpired) {
      // Mark as needs_reauth
      await supabase
        .from('social_connections')
        .update({
          is_active: false,
          metadata: { ...connection.metadata, needs_reauth: true, test_error: 'Token expired' },
        })
        .eq('id', connectionId);

      return new Response(
        JSON.stringify({
          success: false,
          valid: false,
          error: 'Token expired',
          needs_reauth: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Testing Zalo connection: ${connectionId}`);

    // Test the token by fetching OA info
    const oaInfoResponse = await fetch('https://openapi.zalo.me/v2.0/oa/getoa', {
      headers: {
        'access_token': accessToken,
      },
    });

    const oaInfo = await oaInfoResponse.json();
    console.log('Zalo OA info:', oaInfo);

    if (oaInfo.error && oaInfo.error !== 0) {
      // Token is invalid
      await supabase
        .from('social_connections')
        .update({
          is_active: false,
          metadata: { 
            ...connection.metadata, 
            needs_reauth: true, 
            test_error: oaInfo.message || 'Invalid token' 
          },
        })
        .eq('id', connectionId);

      return new Response(
        JSON.stringify({
          success: false,
          valid: false,
          error: oaInfo.message || 'Invalid token',
          needs_reauth: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Token is valid - update metadata
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createDecipheriv } from "node:crypto";
import { Buffer } from "node:buffer";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConnectRequest {
  platform: 'twitter' | 'facebook' | 'instagram' | 'linkedin' | 'tiktok' | 'threads' | 'youtube';
  organizationId?: string;
  brandTemplateId?: string;
  accessToken?: string;
  accessTokenSecret?: string;
  consumerKey?: string;
  consumerSecret?: string;
  username?: string;
}

// Decrypt encrypted credentials from social_platform_settings
function decrypt(encryptedText: string, key: string): string {
  try {
    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedData = Buffer.from(textParts.join(':'), 'hex');
    
    // Create key from string (must be 32 bytes for aes-256-cbc)
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

// Get global platform credentials from social_platform_settings
async function getGlobalPlatformCredentials(
  supabase: any,
  platform: string,
  encryptionKey: string
): Promise<{ consumerKey: string | null; consumerSecret: string | null }> {
  try {
    const { data, error } = await supabase
      .from('social_platform_settings')
      .select('consumer_key, consumer_secret')
      .eq('platform', platform)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      console.log(`No global settings found for ${platform}`);
      return { consumerKey: null, consumerSecret: null };
    }

    return {
      consumerKey: data.consumer_key ? decrypt(data.consumer_key, encryptionKey) : null,
      consumerSecret: data.consumer_secret ? decrypt(data.consumer_secret, encryptionKey) : null,
    };
  } catch (error) {
    console.error('Error fetching global credentials:', error);
    return { consumerKey: null, consumerSecret: null };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const body: ConnectRequest = await req.json();
    const { platform, organizationId, brandTemplateId, accessToken, accessTokenSecret, consumerKey, consumerSecret, username } = body;

    if (!platform) {
      throw new Error('platform is required');
    }

    if (!brandTemplateId && !organizationId) {
      throw new Error('brandTemplateId or organizationId is required');
    }

    console.log(`Connecting ${platform} for brand ${brandTemplateId || 'N/A'}, org ${organizationId || 'N/A'}`);

    // If brandTemplateId provided, verify user has access to the brand
    if (brandTemplateId) {
      const { data: brand, error: brandError } = await supabase
        .from('brand_templates')
        .select('id, organization_id, user_id')
        .eq('id', brandTemplateId)
        .single();

      if (brandError || !brand) {
        throw new Error('Brand not found');
      }

      // Check if user owns the brand or is member of the org
      if (brand.user_id !== user.id) {
        if (brand.organization_id) {
          const { data: membership, error: memberError } = await supabase
            .from('organization_members')
            .select('role')
            .eq('organization_id', brand.organization_id)
            .eq('user_id', user.id)
            .single();

          if (memberError || !membership) {
            throw new Error('Not authorized to access this brand');
          }
        } else {
          throw new Error('Not authorized to access this brand');
        }
      }
    } else if (organizationId) {
      // Verify user is member of organization
      const { data: membership, error: memberError } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', user.id)
        .single();

      if (memberError || !membership) {
        throw new Error('Not a member of this organization');
      }
    }

    // For Twitter - using global credentials + user tokens
    if (platform === 'twitter') {
      // Only require access tokens from user (consumer keys come from Admin settings)
      if (!accessToken || !accessTokenSecret) {
        return new Response(
          JSON.stringify({
            success: true,
            requiresManualSetup: true,
            instructions: {
              steps: [
                '1. Truy cập developer.twitter.com và tạo/sử dụng App của bạn',
                '2. Trong App Settings, đảm bảo có "Read and Write" permissions',
                '3. Trong Keys and Tokens, tạo Access Token and Secret',
                '4. Copy Access Token và Access Token Secret',
              ],
              fields: [
                { key: 'accessToken', label: 'Access Token', required: true },
                { key: 'accessTokenSecret', label: 'Access Token Secret', required: true },
              ],
              note: 'Consumer Key/Secret đã được Admin cấu hình sẵn. Bạn chỉ cần cung cấp Access Token của tài khoản Twitter.',
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get effective consumer keys (user-provided > global > ENV)
      const encryptionKey = Deno.env.get('AI_ENCRYPTION_KEY') || 'default-key';
      const globalCreds = await getGlobalPlatformCredentials(supabase, 'twitter', encryptionKey);
      
      const effectiveConsumerKey = consumerKey || globalCreds.consumerKey || Deno.env.get('TWITTER_CONSUMER_KEY');
      const effectiveConsumerSecret = consumerSecret || globalCreds.consumerSecret || Deno.env.get('TWITTER_CONSUMER_SECRET');

      if (!effectiveConsumerKey || !effectiveConsumerSecret) {
        throw new Error('Twitter chưa được cấu hình. Liên hệ Admin để thiết lập Consumer Key/Secret trong Admin Settings.');
      }

      console.log(`Using ${consumerKey ? 'user-provided' : globalCreds.consumerKey ? 'global-admin' : 'environment'} consumer keys`);

      // Check for existing connection
      let query = supabase
        .from('social_connections')
        .select('id')
        .eq('platform', 'twitter');

      if (brandTemplateId) {
        query = query.eq('brand_template_id', brandTemplateId);
      } else {
        query = query.eq('organization_id', organizationId);
      }

      const { data: existingConnection } = await query.maybeSingle();

      // Only save user-provided consumer keys (if any), not global ones
      const connectionData = {
        organization_id: organizationId || null,
        brand_template_id: brandTemplateId || null,
        user_id: user.id,
        platform: 'twitter',
        platform_username: username || null,
        access_token: accessToken,
        refresh_token: accessTokenSecret,
        consumer_key: consumerKey || null, // Only save if user explicitly provided
        consumer_secret: consumerSecret || null, // Only save if user explicitly provided
        is_active: true,
        connected_at: new Date().toISOString(),
        scopes: ['tweet.read', 'tweet.write', 'users.read'],
        metadata: { 
          manual_setup: true,
          uses_global_credentials: !consumerKey && !consumerSecret
        },
      };

      let connection;
      if (existingConnection) {
        const { data, error } = await supabase
          .from('social_connections')
          .update(connectionData)
          .eq('id', existingConnection.id)
          .select()
          .single();
        
        if (error) throw error;
        connection = data;
      } else {
        const { data, error } = await supabase
          .from('social_connections')
          .insert(connectionData)
          .select()
          .single();
        
        if (error) throw error;
        connection = data;
      }

      console.log('Twitter connection saved:', connection.id);

      return new Response(
        JSON.stringify({
          success: true,
          connection: {
            id: connection.id,
            platform: connection.platform,
            username: connection.platform_username,
            isActive: connection.is_active,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For Instagram - using OAuth 2.0 flow
    if (platform === 'instagram') {
      const encryptionKey = Deno.env.get('AI_ENCRYPTION_KEY') || 'default-key';
      const globalCreds = await getGlobalPlatformCredentials(supabase, 'instagram', encryptionKey);
      
      if (!globalCreds.consumerKey || !globalCreds.consumerSecret) {
        throw new Error('Instagram chưa được cấu hình. Liên hệ Admin để thiết lập App ID/Secret trong Admin Settings.');
      }

      // If accessToken is provided, we're completing the OAuth flow (callback handling)
      if (accessToken) {
        // Check for existing connection
        let query = supabase
          .from('social_connections')
          .select('id')
          .eq('platform', 'instagram');

        if (brandTemplateId) {
          query = query.eq('brand_template_id', brandTemplateId);
        } else {
          query = query.eq('organization_id', organizationId);
        }

        const { data: existingConnection } = await query.maybeSingle();

        // Parse metadata from accessTokenSecret (used to pass extra data)
        let tokenExpiresAt = null;
        let instagramUserId = null;
        try {
          const metadata = accessTokenSecret ? JSON.parse(accessTokenSecret) : {};
          tokenExpiresAt = metadata.expires_at || null;
          instagramUserId = metadata.instagram_user_id || null;
        } catch (e) {
          console.log('No metadata in accessTokenSecret');
        }

        const connectionData = {
          organization_id: organizationId || null,
          brand_template_id: brandTemplateId || null,
          user_id: user.id,
          platform: 'instagram',
          platform_username: username || null,
          access_token: accessToken,
          refresh_token: null, // Instagram doesn't have refresh tokens, we refresh long-lived token
          token_expires_at: tokenExpiresAt,
          is_active: true,
          connected_at: new Date().toISOString(),
          scopes: ['instagram_business_basic', 'instagram_business_content_publish'],
          metadata: { 
            instagram_user_id: instagramUserId,
            token_type: 'long_lived',
            uses_global_credentials: true
          },
        };

        let connection;
        if (existingConnection) {
          const { data, error } = await supabase
            .from('social_connections')
            .update(connectionData)
            .eq('id', existingConnection.id)
            .select()
            .single();
          
          if (error) throw error;
          connection = data;
        } else {
          const { data, error } = await supabase
            .from('social_connections')
            .insert(connectionData)
            .select()
            .single();
          
          if (error) throw error;
          connection = data;
        }

        console.log('Instagram connection saved:', connection.id);

        return new Response(
          JSON.stringify({
            success: true,
            connection: {
              id: connection.id,
              platform: connection.platform,
              username: connection.platform_username,
              isActive: connection.is_active,
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // No accessToken - return OAuth URL for user to authorize
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const redirectUri = `${supabaseUrl}/functions/v1/instagram-oauth-callback`;
      
      // Create state with brandTemplateId/organizationId for callback
      const state = btoa(JSON.stringify({
        brandTemplateId: brandTemplateId || null,
        organizationId: organizationId || null,
        userId: user.id,
      }));

      const oauthUrl = `https://www.instagram.com/oauth/authorize?` + new URLSearchParams({
        client_id: globalCreds.consumerKey,
        redirect_uri: redirectUri,
        scope: 'instagram_business_basic,instagram_business_content_publish',
        response_type: 'code',
        state: state,
      }).toString();

      return new Response(
        JSON.stringify({
          success: true,
          requiresOAuth: true,
          oauthUrl: oauthUrl,
          instructions: {
            steps: [
              '1. Đảm bảo tài khoản Instagram là Professional (Business hoặc Creator)',
              '2. Click nút bên dưới để đăng nhập Instagram',
              '3. Cho phép ứng dụng truy cập tài khoản của bạn',
              '4. Bạn sẽ được redirect về sau khi hoàn tất',
            ],
            note: 'Chỉ hỗ trợ tài khoản Instagram Professional (Business/Creator). Tài khoản cá nhân sẽ không hoạt động.',
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For other platforms - not yet supported
    return new Response(
      JSON.stringify({
        success: false,
        error: `Platform ${platform} is not yet supported. Coming soon!`,
        supportedPlatforms: ['twitter', 'instagram'],
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Connect Social error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

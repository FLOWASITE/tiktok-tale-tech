import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildOAuth1Header } from "../_shared/oauth1a.ts";
import { createDecipheriv } from "node:crypto";
import { Buffer } from "node:buffer";
import { decrypt as decryptGCM } from "../_shared/crypto.ts";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConnectRequest {
  platform: 'twitter' | 'facebook' | 'instagram' | 'linkedin' | 'tiktok' | 'threads' | 'youtube' | 'zalo_oa' | 'google_business' | 'website';
  organizationId?: string;
  brandTemplateId?: string;
  accessToken?: string;
  accessTokenSecret?: string;
  consumerKey?: string;
  consumerSecret?: string;
  username?: string;
}

// Legacy CBC decrypt for backward compatibility
function decryptLegacyCBC(encryptedText: string, key: string): string {
  const [ivHex, encryptedHex] = encryptedText.split(':');
  if (!ivHex || !encryptedHex) {
    throw new Error('Invalid legacy encrypted format');
  }
  const iv = Buffer.from(ivHex, 'hex');
  const encryptedData = Buffer.from(encryptedHex, 'hex');
  const keyBuffer = Buffer.from(key.padEnd(32).slice(0, 32));
  const decipher = createDecipheriv('aes-256-cbc', keyBuffer, iv);
  let decrypted = decipher.update(encryptedData);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// Decrypt with GCM first, fallback to legacy CBC
async function decryptCredential(ciphertext: string, legacyKey: string): Promise<string | null> {
  if (!ciphertext) return null;
  try {
    return await decryptGCM(ciphertext);
  } catch (primaryError) {
    if (!ciphertext.includes(':')) throw primaryError;
    const keyCandidates = [...new Set([
      legacyKey,
      'default-encryption-key-change-me',
      'default-key',
    ].filter(Boolean))];
    for (const candidate of keyCandidates) {
      try {
        return decryptLegacyCBC(ciphertext, candidate);
      } catch { /* try next */ }
    }
    throw primaryError;
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

    const [consumerKey, consumerSecret] = await Promise.all([
      decryptCredential(data.consumer_key, encryptionKey),
      decryptCredential(data.consumer_secret, encryptionKey),
    ]);

    return { consumerKey, consumerSecret };
  } catch (error) {
    console.error('Error fetching global credentials:', error);
    return { consumerKey: null, consumerSecret: null };
  }
}

Deno.serve(withPerf({ functionName: 'connect-social' }, async (req) => {
  // Capture frontend origin from request headers for OAuth redirect
  const requestOrigin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/+$/, '').split('/').slice(0, 3).join('/') || '';
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header using getClaims for session resilience
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Unauthorized');
    }

    const token = authHeader.replace('Bearer ', '');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims?.sub) {
      console.error('Auth claims error:', claimsError);
      throw new Error('Unauthorized');
    }

    const user = { id: claimsData.claims.sub, email: claimsData.claims.email };

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

    // For Twitter/X - OAuth 2.0 PKCE flow (preferred) or legacy manual token
    if (platform === 'twitter') {
      // If accessToken provided, use legacy manual flow (backward compatible)
      if (accessToken && accessTokenSecret) {
        const encryptionKey = Deno.env.get('AI_ENCRYPTION_KEY') || 'default-key';
        const globalCreds = await getGlobalPlatformCredentials(supabase, 'twitter', encryptionKey);
        
        const effectiveConsumerKey = consumerKey || globalCreds.consumerKey || Deno.env.get('TWITTER_CONSUMER_KEY');
        const effectiveConsumerSecret = consumerSecret || globalCreds.consumerSecret || Deno.env.get('TWITTER_CONSUMER_SECRET');

        if (!effectiveConsumerKey || !effectiveConsumerSecret) {
          throw new Error('Twitter chưa được cấu hình. Liên hệ Admin để thiết lập Consumer Key/Secret trong Admin Settings.');
        }

        // Check for existing connection
        let query = supabase.from('social_connections').select('id').eq('platform', 'twitter');
        if (brandTemplateId) query = query.eq('brand_template_id', brandTemplateId);
        else query = query.eq('organization_id', organizationId);
        const { data: existingConnection } = await query.maybeSingle();

        const connectionData = {
          organization_id: organizationId || null,
          brand_template_id: brandTemplateId || null,
          user_id: user.id,
          platform: 'twitter',
          platform_username: username || null,
          access_token: accessToken,
          refresh_token: accessTokenSecret,
          consumer_key: consumerKey || null,
          consumer_secret: consumerSecret || null,
          is_active: true,
          connected_at: new Date().toISOString(),
          scopes: ['tweet.read', 'tweet.write', 'users.read'],
          metadata: { manual_setup: true, uses_global_credentials: !consumerKey && !consumerSecret },
        };

        let connection;
        if (existingConnection) {
          const { data, error } = await supabase.from('social_connections').update(connectionData).eq('id', existingConnection.id).select().single();
          if (error) throw error;
          connection = data;
        } else {
          const { data, error } = await supabase.from('social_connections').insert(connectionData).select().single();
          if (error) throw error;
          connection = data;
        }

        return new Response(
          JSON.stringify({ success: true, connection: { id: connection.id, platform: connection.platform, username: connection.platform_username, isActive: connection.is_active } }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // OAuth 1.0a 3-legged flow
      const configuredCallback = Deno.env.get('X_CALLBACK_URL')?.trim().replace(/^['"]|['"]$/g, '');
      const derivedCallback = `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/x-oauth-callback`;
      const callbackCandidates = [...new Set([configuredCallback, derivedCallback].filter(Boolean))] as string[];

      if (callbackCandidates.length === 0) {
        throw new Error('X OAuth chưa được cấu hình callback URL. Liên hệ Admin.');
      }

      // Get consumer credentials - prefer environment, fallback to stored
      const envConsumerKey = Deno.env.get('TWITTER_CONSUMER_KEY')?.trim();
      const envConsumerSecret = Deno.env.get('TWITTER_CONSUMER_SECRET')?.trim();
      let effectiveConsumerKey = envConsumerKey;
      let effectiveConsumerSecret = envConsumerSecret;

      if (!effectiveConsumerKey || !effectiveConsumerSecret) {
        const encryptionKey = Deno.env.get('AI_ENCRYPTION_KEY') || 'default-key';
        const globalCreds = await getGlobalPlatformCredentials(supabase, 'twitter', encryptionKey);
        effectiveConsumerKey = globalCreds.consumerKey || envConsumerKey;
        effectiveConsumerSecret = globalCreds.consumerSecret || envConsumerSecret;
      }

      console.log(`[connect-social] Using consumer key source: ${envConsumerKey ? 'environment' : 'stored'}`);

      if (!effectiveConsumerKey || !effectiveConsumerSecret) {
        throw new Error('Twitter Consumer Key/Secret chưa được cấu hình. Liên hệ Admin.');
      }

      // Step 1: Get request token (retry with callback fallbacks)
      const requestTokenUrl = 'https://api.x.com/oauth/request_token';
      let oauthToken: string | null = null;
      let oauthTokenSecret: string | null = null;
      let callbackUrlUsed: string | null = null;
      let lastStatus: number | null = null;
      let sawDesktopModeError = false;
      let sawAuthError32 = false;

      for (const candidateCallback of callbackCandidates) {
        const callbackLabel = (() => {
          try {
            return new URL(candidateCallback).origin;
          } catch {
            return candidateCallback;
          }
        })();

        const oauthHeader = buildOAuth1Header(
          'POST',
          requestTokenUrl,
          effectiveConsumerKey,
          effectiveConsumerSecret,
          undefined,
          undefined,
          { oauth_callback: candidateCallback }
        );

        for (const includeBody of [true, false]) {
          const rtResponse = await fetch(requestTokenUrl, {
            method: 'POST',
            headers: includeBody
              ? {
                  'Authorization': oauthHeader,
                  'Content-Type': 'application/x-www-form-urlencoded',
                }
              : {
                  'Authorization': oauthHeader,
                },
            body: includeBody ? `oauth_callback=${encodeURIComponent(candidateCallback)}` : undefined,
          });

          const rtText = await rtResponse.text();
          lastStatus = rtResponse.status;
          console.log(`[connect-social] Request token attempt callback=${callbackLabel}, includeBody=${includeBody}, status=${rtResponse.status}`);

          if (!rtResponse.ok) {
            if (rtResponse.status === 401 && (rtText.includes('Could not authenticate you') || rtText.includes('"code":32'))) {
              sawAuthError32 = true;
            }
            if (rtText.includes("Desktop applications only support the oauth_callback value 'oob'")) {
              sawDesktopModeError = true;
            }
            console.error('Request token failed:', rtText);
            continue;
          }

          const rtParams = new URLSearchParams(rtText);
          oauthToken = rtParams.get('oauth_token');
          oauthTokenSecret = rtParams.get('oauth_token_secret');

          if (oauthToken && oauthTokenSecret) {
            callbackUrlUsed = candidateCallback;
            break;
          }
        }

        if (oauthToken && oauthTokenSecret) break;
      }

      if (!oauthToken || !oauthTokenSecret) {
        if (sawDesktopModeError) {
          throw new Error("App X đang ở chế độ Desktop/Native. Hãy đổi sang 'Web App, Automated App or Bot' và cấu hình Callback URL.");
        }
        if (sawAuthError32) {
          throw new Error(`Không thể lấy request token từ X (${lastStatus || 401}). Consumer Key/Secret có thể đúng nhưng Callback URL chưa khớp trong App settings.`);
        }
        throw new Error(`Không thể lấy request token từ X (${lastStatus || 'unknown'}). Vui lòng kiểm tra cấu hình App trên developer.x.com.`);
      }

      // Persist temporary request token secret for callback exchange
      let pendingQuery = supabase
        .from('social_connections')
        .select('id')
        .eq('platform', 'twitter')
        .eq('user_id', user.id)
        .eq('connection_type', 'oauth1_request_token')
        .eq('is_active', false);

      if (brandTemplateId) pendingQuery = pendingQuery.eq('brand_template_id', brandTemplateId);
      else pendingQuery = pendingQuery.eq('organization_id', organizationId);

      const { data: existingPendingConnection } = await pendingQuery.maybeSingle();

      const pendingConnectionData = {
        organization_id: organizationId || null,
        brand_template_id: brandTemplateId || null,
        user_id: user.id,
        platform: 'twitter',
        connection_type: 'oauth1_request_token',
        access_token: oauthToken,
        refresh_token: oauthTokenSecret,
        is_active: false,
        connected_at: new Date().toISOString(),
        token_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        metadata: {
          oauth_stage: 'request_token',
          frontendOrigin: requestOrigin || null,
          oauth_callback_used: callbackUrlUsed,
        },
      };

      if (existingPendingConnection?.id) {
        const { error: pendingUpdateError } = await supabase
          .from('social_connections')
          .update(pendingConnectionData)
          .eq('id', existingPendingConnection.id);

        if (pendingUpdateError) {
          console.warn('Failed to update pending X OAuth connection:', pendingUpdateError.message);
        }
      } else {
        const { error: pendingInsertError } = await supabase
          .from('social_connections')
          .insert(pendingConnectionData);

        if (pendingInsertError) {
          console.warn('Failed to insert pending X OAuth connection:', pendingInsertError.message);
        }
      }

      // Step 2: Redirect user to authorize
      const oauthUrl = `https://api.x.com/oauth/authorize?oauth_token=${oauthToken}`;

      return new Response(
        JSON.stringify({
          success: true,
          requiresOAuth: true,
          oauthUrl,
          instructions: {
            steps: [
              '1. Click nút bên dưới để đăng nhập X',
              '2. Cho phép ứng dụng truy cập tài khoản của bạn',
              '3. Bạn sẽ được redirect về sau khi hoàn tất',
            ],
            note: 'Đăng nhập bằng tài khoản X mà bạn muốn sử dụng để đăng bài.',
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
      
      // Create state with brandTemplateId/organizationId and frontendOrigin for callback
      const state = btoa(JSON.stringify({
        brandTemplateId: brandTemplateId || null,
        organizationId: organizationId || null,
        userId: user.id,
        frontendOrigin: requestOrigin || null,
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

    // For LinkedIn - using OAuth 2.0 flow
    if (platform === 'linkedin') {
      const encryptionKey = Deno.env.get('AI_ENCRYPTION_KEY') || 'default-key';
      const globalCreds = await getGlobalPlatformCredentials(supabase, 'linkedin', encryptionKey);
      
      if (!globalCreds.consumerKey || !globalCreds.consumerSecret) {
        throw new Error('LinkedIn chưa được cấu hình. Liên hệ Admin để thiết lập Client ID/Secret trong Admin Settings.');
      }

      // If accessToken is provided, we're completing the OAuth flow (callback handling)
      if (accessToken) {
        // Check for existing connection
        let query = supabase
          .from('social_connections')
          .select('id')
          .eq('platform', 'linkedin');

        if (brandTemplateId) {
          query = query.eq('brand_template_id', brandTemplateId);
        } else {
          query = query.eq('organization_id', organizationId);
        }

        const { data: existingConnection } = await query.maybeSingle();

        // Parse metadata from accessTokenSecret (used to pass extra data)
        let tokenExpiresAt = null;
        let personId = null;
        let personUrn = null;
        try {
          const metadata = accessTokenSecret ? JSON.parse(accessTokenSecret) : {};
          tokenExpiresAt = metadata.expires_at || null;
          personId = metadata.person_id || null;
          personUrn = metadata.person_urn || null;
        } catch (e) {
          console.log('No metadata in accessTokenSecret');
        }

        const connectionData = {
          organization_id: organizationId || null,
          brand_template_id: brandTemplateId || null,
          user_id: user.id,
          platform: 'linkedin',
          platform_username: username || null,
          platform_user_id: personId,
          access_token: accessToken,
          refresh_token: null,
          token_expires_at: tokenExpiresAt,
          is_active: true,
          connected_at: new Date().toISOString(),
          scopes: ['openid', 'profile', 'w_member_social'],
          metadata: { 
            person_urn: personUrn,
            token_type: 'access_token',
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

        console.log('LinkedIn connection saved:', connection.id);

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
      const redirectUri = `${supabaseUrl}/functions/v1/linkedin-oauth-callback`;
      
      // Create state with brandTemplateId/organizationId for callback
      const state = btoa(JSON.stringify({
        brandTemplateId: brandTemplateId || null,
        organizationId: organizationId || null,
        userId: user.id,
      }));

      const oauthUrl = `https://www.linkedin.com/oauth/v2/authorization?` + new URLSearchParams({
        response_type: 'code',
        client_id: globalCreds.consumerKey,
        redirect_uri: redirectUri,
        scope: 'openid profile w_member_social',
        state: state,
      }).toString();

      return new Response(
        JSON.stringify({
          success: true,
          requiresOAuth: true,
          oauthUrl: oauthUrl,
          instructions: {
            steps: [
              '1. Click nút bên dưới để đăng nhập LinkedIn',
              '2. Cho phép ứng dụng truy cập tài khoản của bạn',
              '3. Bạn sẽ được redirect về sau khi hoàn tất',
            ],
            note: 'Token LinkedIn có hiệu lực 60 ngày. Bạn sẽ cần kết nối lại sau khi hết hạn.',
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For Facebook - using OAuth 2.0 flow
    if (platform === 'facebook') {
      const encryptionKey = Deno.env.get('AI_ENCRYPTION_KEY') || 'default-key';
      const globalCreds = await getGlobalPlatformCredentials(supabase, 'facebook', encryptionKey);
      
      if (!globalCreds.consumerKey || !globalCreds.consumerSecret) {
        throw new Error('Facebook chưa được cấu hình. Liên hệ Admin để thiết lập App ID/Secret trong Admin Settings.');
      }

      // Return OAuth URL for user to authorize
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const redirectUri = `${supabaseUrl}/functions/v1/facebook-oauth-callback`;
      
      // Create state with brandTemplateId/organizationId for callback
      const state = btoa(JSON.stringify({
        brandTemplateId: brandTemplateId || null,
        organizationId: organizationId || null,
        userId: user.id,
        frontendOrigin: requestOrigin || null,
      }));

      const oauthUrl = `https://www.facebook.com/v21.0/dialog/oauth?` + new URLSearchParams({
        client_id: globalCreds.consumerKey,
        redirect_uri: redirectUri,
        scope: 'pages_manage_posts,pages_read_engagement,pages_show_list,pages_manage_metadata',
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
              '1. Click nút bên dưới để đăng nhập Facebook',
              '2. Chọn Facebook Page bạn muốn kết nối',
              '3. Cho phép ứng dụng quyền đăng bài lên Page',
              '4. Bạn sẽ được redirect về sau khi hoàn tất',
            ],
            note: 'Bạn cần có quyền quản trị (Admin) hoặc biên tập (Editor) của Facebook Page để sử dụng tính năng này.',
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For Threads - using OAuth 2.0 flow
    if (platform === 'threads') {
      const encryptionKey = Deno.env.get('AI_ENCRYPTION_KEY') || 'default-key';
      const globalCreds = await getGlobalPlatformCredentials(supabase, 'threads', encryptionKey);
      
      if (!globalCreds.consumerKey || !globalCreds.consumerSecret) {
        throw new Error('Threads chưa được cấu hình. Liên hệ Admin để thiết lập App ID/Secret trong Admin Settings.');
      }

      // Return OAuth URL for user to authorize
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const redirectUri = `${supabaseUrl}/functions/v1/threads-oauth-callback`;
      
      // Create state with brandTemplateId/organizationId for callback
      const state = btoa(JSON.stringify({
        brandTemplateId: brandTemplateId || null,
        organizationId: organizationId || null,
        userId: user.id,
        frontendOrigin: requestOrigin || null,
      }));

      const oauthUrl = `https://threads.net/oauth/authorize?` + new URLSearchParams({
        client_id: globalCreds.consumerKey,
        redirect_uri: redirectUri,
        scope: 'threads_basic,threads_content_publish',
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
              '1. Click nút bên dưới để đăng nhập Threads',
              '2. Cho phép ứng dụng quyền đăng bài',
              '3. Bạn sẽ được redirect về sau khi hoàn tất',
            ],
            note: 'Token Threads có hiệu lực 60 ngày. Hệ thống sẽ tự động làm mới token trước khi hết hạn.',
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For Zalo OA - using OAuth 2.0 flow
    if (platform === 'zalo_oa') {
      const encryptionKey = Deno.env.get('AI_ENCRYPTION_KEY') || 'default-key';
      const globalCreds = await getGlobalPlatformCredentials(supabase, 'zalo_oa', encryptionKey);
      
      if (!globalCreds.consumerKey) {
        throw new Error('Zalo OA chưa được cấu hình. Liên hệ Admin để thiết lập App ID/Secret.');
      }

      // Always use production domain for Zalo redirect URI (Zalo only whitelists app.flowa.one)
      const redirectUri = 'https://app.flowa.one/api/zalo/callback';
      const state = btoa(JSON.stringify({ brandTemplateId, organizationId, userId: user.id, frontendOrigin: requestOrigin || null }));

      const oauthUrl = `https://oauth.zaloapp.com/v4/oa/permission?` + new URLSearchParams({
        app_id: globalCreds.consumerKey,
        redirect_uri: redirectUri,
        state: state,
      }).toString();

      return new Response(
        JSON.stringify({
          success: true,
          requiresOAuth: true,
          oauthUrl,
          instructions: {
            steps: ['1. Click để đăng nhập Zalo OA', '2. Chọn OA muốn kết nối', '3. Cấp quyền cho ứng dụng'],
            note: 'Bạn cần có quyền Admin của Zalo Official Account.',
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For Google Business Profile - using OAuth 2.0 flow
    if (platform === 'google_business') {
      const encryptionKey = Deno.env.get('AI_ENCRYPTION_KEY') || 'default-key';
      const globalCreds = await getGlobalPlatformCredentials(supabase, 'google_business', encryptionKey);
      
      if (!globalCreds.consumerKey) {
        throw new Error('Google Business Profile chưa được cấu hình. Liên hệ Admin.');
      }

      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const redirectUri = `${supabaseUrl}/functions/v1/google-business-oauth-callback`;
      const state = btoa(JSON.stringify({ brandTemplateId, organizationId, userId: user.id }));

      const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
        client_id: globalCreds.consumerKey,
        redirect_uri: redirectUri,
        scope: 'https://www.googleapis.com/auth/business.manage',
        response_type: 'code',
        access_type: 'offline',
        prompt: 'consent',
        state,
      }).toString();

      return new Response(
        JSON.stringify({
          success: true,
          requiresOAuth: true,
          oauthUrl,
          instructions: {
            steps: ['1. Click để đăng nhập Google', '2. Chọn tài khoản Google Business', '3. Cấp quyền'],
            note: 'Bạn cần có Google Business Profile đã được xác minh.',
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For Website - redirect to separate connect-website function
    if (platform === 'website') {
      return new Response(
        JSON.stringify({
          success: true,
          requiresManualSetup: true,
          instructions: {
            steps: ['1. Nhập URL website', '2. Chọn loại kết nối (WordPress/API/Webhook)', '3. Cấu hình credentials'],
            fields: [
              { key: 'websiteUrl', label: 'Website URL', required: true },
              { key: 'integrationType', label: 'Loại kết nối', required: true },
            ],
            note: 'Hỗ trợ WordPress REST API, Custom API, Webhook hoặc copy thủ công.',
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For other platforms - not yet supported
    return new Response(
      JSON.stringify({
        success: false,
        error: `Platform ${platform} is not yet supported.`,
        supportedPlatforms: ['twitter', 'instagram', 'linkedin', 'facebook', 'threads', 'zalo_oa', 'google_business', 'website'],
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Connect Social error:', error);
    const isUnauthorized = error?.message === 'Unauthorized' || error?.message === 'Missing authorization header';
    return new Response(
      JSON.stringify({
        success: false,
        error: isUnauthorized ? 'Unauthorized' : error.message,
        hint: isUnauthorized ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại rồi thử kết nối lại.' : undefined,
      }),
      { status: isUnauthorized ? 401 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));

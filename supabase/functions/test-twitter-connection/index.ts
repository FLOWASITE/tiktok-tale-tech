import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { createHmac, createDecipheriv } from "node:crypto";
import { Buffer } from "node:buffer";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestRequest {
  connectionId: string;
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

// Generate OAuth signature for Twitter API
function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): string {
  const signatureBaseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(
    Object.entries(params)
      .sort()
      .map(([k, v]) => `${k}=${v}`)
      .join("&")
  )}`;
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  const hmacSha1 = createHmac("sha1", signingKey);
  const signature = hmacSha1.update(signatureBaseString).digest("base64");
  return signature;
}

// Generate OAuth header for Twitter API
function generateOAuthHeader(
  method: string,
  url: string,
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  accessTokenSecret: string
): string {
  const oauthParams = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: Math.random().toString(36).substring(2),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: "1.0",
  };

  const signature = generateOAuthSignature(
    method,
    url,
    oauthParams,
    consumerSecret,
    accessTokenSecret
  );

  const signedOAuthParams = {
    ...oauthParams,
    oauth_signature: signature,
  };

  const entries = Object.entries(signedOAuthParams).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  return (
    "OAuth " +
    entries
      .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
      .join(", ")
  );
}

// Get current user from Twitter API (OAuth 1.0a)
async function getTwitterUser(
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  accessTokenSecret: string
): Promise<{ id: string; name: string; username: string; profile_image_url?: string }> {
  const url = "https://api.x.com/2/users/me?user.fields=profile_image_url";
  const oauthHeader = generateOAuthHeader("GET", url.split('?')[0], consumerKey, consumerSecret, accessToken, accessTokenSecret);
  const response = await fetch(url, { headers: { Authorization: oauthHeader } });
  const responseText = await response.text();
  if (!response.ok) throw new Error(`Twitter API error: ${response.status} - ${responseText}`);
  return JSON.parse(responseText).data;
}

// Get current user from Twitter API (OAuth 2.0 Bearer)
async function getTwitterUserOAuth2(
  accessToken: string
): Promise<{ id: string; name: string; username: string; profile_image_url?: string }> {
  const url = "https://api.x.com/2/users/me?user.fields=profile_image_url";
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const responseText = await response.text();
  if (!response.ok) throw new Error(`Twitter API error: ${response.status} - ${responseText}`);
  return JSON.parse(responseText).data;
}

Deno.serve(withPerf({ functionName: 'test-twitter-connection' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getServiceClient();

    const body: TestRequest = await req.json();
    const { connectionId } = body;

    if (!connectionId) {
      throw new Error('connectionId is required');
    }

    console.log(`Testing Twitter connection ${connectionId}`);

    // Get connection details
    const { data: connection, error: connError } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (connError || !connection) {
      throw new Error('Connection not found');
    }

    if (connection.platform !== 'twitter') {
      throw new Error('Invalid platform for this endpoint');
    }

    const isOAuth2 = connection.metadata?.oauth2_pkce === true;
    let twitterUser;

    if (isOAuth2) {
      // OAuth 2.0 flow - use Bearer token
      let accessToken = connection.access_token;

      // Check token expiry and refresh if needed
      if (connection.token_expires_at && new Date(connection.token_expires_at) <= new Date()) {
        console.log('Token expired, attempting refresh...');
        if (!connection.refresh_token) throw new Error('Token expired and no refresh token');

        const clientId = Deno.env.get('X_CLIENT_ID')!;
        const clientSecret = Deno.env.get('X_CLIENT_SECRET')!;

        const tokenBody = new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: connection.refresh_token,
          client_id: clientId,
        });

        const tokenResponse = await fetch('https://api.x.com/2/oauth2/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`),
          },
          body: tokenBody.toString(),
        });

        const tokenText = await tokenResponse.text();
        if (!tokenResponse.ok) throw new Error(`Token refresh failed: ${tokenText}`);
        const tokenData = JSON.parse(tokenText);
        accessToken = tokenData.access_token;

        await supabase.from('social_connections').update({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || connection.refresh_token,
          token_expires_at: new Date(Date.now() + (tokenData.expires_in || 7200) * 1000).toISOString(),
        }).eq('id', connectionId);
      }

      console.log('Testing via OAuth 2.0 Bearer token');
      try {
        twitterUser = await getTwitterUserOAuth2(accessToken);
      } catch (e: any) {
        // If client-not-enrolled, return success with warning instead of failing
        if (e.message?.includes('client-not-enrolled') || e.message?.includes('Client Forbidden')) {
          console.warn('users/me blocked (client-not-enrolled), returning limited success');
          await supabase.from('social_connections').update({
            last_verified_at: new Date().toISOString(),
            last_error: 'client-not-enrolled: profile API blocked',
          }).eq('id', connectionId);

          return new Response(
            JSON.stringify({
              success: true,
              warning: 'client-not-enrolled',
              message: 'Token hợp lệ nhưng API profile bị chặn. Kiểm tra API access trên X Developer Portal.',
              data: {
                username: connection.platform_username || 'unknown',
                displayName: connection.platform_display_name || 'X Account',
              },
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw e;
      }
    } else {
      // Legacy OAuth 1.0a flow
      const accessToken = connection.access_token;
      const accessTokenSecret = connection.refresh_token;

      let consumerKey = connection.consumer_key;
      let consumerSecret = connection.consumer_secret;
      let credentialSource = 'brand-specific';

      if (!consumerKey || !consumerSecret) {
        const encryptionKey = Deno.env.get('AI_ENCRYPTION_KEY') || 'default-key';
        const globalCreds = await getGlobalPlatformCredentials(supabase, 'twitter', encryptionKey);
        if (globalCreds.consumerKey && globalCreds.consumerSecret) {
          consumerKey = globalCreds.consumerKey;
          consumerSecret = globalCreds.consumerSecret;
          credentialSource = 'global-admin';
        }
      }

      if (!consumerKey || !consumerSecret) {
        consumerKey = consumerKey || Deno.env.get('TWITTER_CONSUMER_KEY');
        consumerSecret = consumerSecret || Deno.env.get('TWITTER_CONSUMER_SECRET');
        if (consumerKey && consumerSecret) credentialSource = 'environment';
      }

      if (!consumerKey || !consumerSecret) throw new Error('Twitter app credentials not configured.');
      if (!accessToken || !accessTokenSecret) throw new Error('Twitter user credentials not found');

      console.log(`Testing via OAuth 1.0a (${credentialSource} consumer keys)`);
      twitterUser = await getTwitterUser(consumerKey, consumerSecret, accessToken, accessTokenSecret);
    }

    console.log('Twitter user verified:', twitterUser);

    const { error: updateError } = await supabase
      .from('social_connections')
      .update({
        platform_user_id: twitterUser.id,
        platform_username: twitterUser.username,
        platform_display_name: twitterUser.name,
        platform_avatar_url: twitterUser.profile_image_url?.replace('_normal', '_400x400'),
        last_verified_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('id', connectionId);

    if (updateError) console.error('Failed to update connection:', updateError);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: twitterUser.id,
          username: twitterUser.username,
          displayName: twitterUser.name,
          avatarUrl: twitterUser.profile_image_url?.replace('_normal', '_400x400'),
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Test Twitter connection error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));

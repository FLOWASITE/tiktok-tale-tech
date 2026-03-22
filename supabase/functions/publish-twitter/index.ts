import { decryptCredential } from "../_shared/crypto.ts";
import { createHmac } from "node:crypto";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PublishRequest {
  connectionId: string;
  contentId: string;
  content: string;
  mediaUrls?: string[];
  scheduleId?: string;
}

function extractTwitterStatusCode(message?: string): number | null {
  if (!message) return null;
  const match = message.match(/Twitter API error:\s*(\d{3})/);
  if (!match) return null;
  const code = Number(match[1]);
  return Number.isFinite(code) ? code : null;
}

function isTransientTwitterError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const statusCode = extractTwitterStatusCode(message);
  return statusCode !== null && statusCode >= 500 && statusCode < 600;
}

function buildTransientTwitterMessage(statusCode: number | null): string {
  if (statusCode === 503) {
    return 'X API đang tạm thời gián đoạn (503). Hệ thống đã thử lại tự động, vui lòng thử lại sau 1-2 phút.';
  }
  return 'X API đang tạm thời lỗi (5xx). Hệ thống đã thử lại tự động, vui lòng thử lại sau ít phút.';
}

// Get global platform credentials from social_platform_settings
async function getGlobalPlatformCredentials(
  supabase: any,
  platform: string,
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
      data.consumer_key ? decryptCredential(data.consumer_key) : null,
      data.consumer_secret ? decryptCredential(data.consumer_secret) : null,
    ]);
    return { consumerKey, consumerSecret };
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

// Post tweet using Twitter API v2
async function postTweet(
  tweetText: string,
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  accessTokenSecret: string
): Promise<{ id: string; text: string }> {
  const url = "https://api.x.com/2/tweets";
  const method = "POST";

  const oauthHeader = generateOAuthHeader(
    method,
    url,
    consumerKey,
    consumerSecret,
    accessToken,
    accessTokenSecret
  );

  console.log("Posting tweet to Twitter API...");

  const response = await fetch(url, {
    method: method,
    headers: {
      Authorization: oauthHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: tweetText }),
  });

  const responseText = await response.text();
  console.log("Twitter API Response:", response.status, responseText);

  if (!response.ok) {
    throw new Error(`Twitter API error: ${response.status} - ${responseText}`);
  }

  const result = JSON.parse(responseText);
  return result.data;
}

// Post tweet using OAuth 2.0 Bearer token (with retry for 5xx)
async function postTweetOAuth2(
  tweetText: string,
  accessToken: string,
  maxRetries = 3
): Promise<{ id: string; text: string }> {
  const url = "https://api.x.com/2/tweets";

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    console.log(`Posting tweet via OAuth 2.0 Bearer... (attempt ${attempt + 1})`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: tweetText }),
    });

    const responseText = await response.text();
    console.log("Twitter API Response:", response.status, responseText);

    if (response.ok) {
      const result = JSON.parse(responseText);
      return result.data;
    }

    // Retry on 5xx server errors
    if (response.status >= 500 && attempt < maxRetries) {
      const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
      console.log(`Server error ${response.status}, retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
      continue;
    }

    throw new Error(`Twitter API error: ${response.status} - ${responseText}`);
  }

  throw new Error('Max retries exceeded');
}

// Refresh OAuth 2.0 token
async function refreshOAuth2Token(
  supabase: any,
  connectionId: string,
  refreshToken: string
): Promise<string> {
  const clientId = Deno.env.get('X_CLIENT_ID')!;
  const clientSecret = Deno.env.get('X_CLIENT_SECRET')!;

  const tokenBody = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
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
  if (!tokenResponse.ok) {
    throw new Error(`Token refresh failed: ${tokenText}`);
  }

  const tokenData = JSON.parse(tokenText);
  const tokenExpiresAt = new Date(Date.now() + (tokenData.expires_in || 7200) * 1000).toISOString();

  await supabase
    .from('social_connections')
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || refreshToken,
      token_expires_at: tokenExpiresAt,
      last_error: null,
    })
    .eq('id', connectionId);

  return tokenData.access_token;
}

Deno.serve(withPerf({ functionName: 'publish-twitter' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getServiceClient();

    const body: PublishRequest = await req.json();
    const { connectionId, contentId, content, scheduleId } = body;

    if (!connectionId || !content) {
      throw new Error('connectionId and content are required');
    }

    console.log(`Publishing to Twitter for connection ${connectionId}`);

    // Get connection details
    const { data: connection, error: connError } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('is_active', true)
      .single();

    if (connError || !connection) {
      throw new Error('Connection not found or inactive');
    }

    if (connection.platform !== 'twitter') {
      throw new Error('Invalid platform for this endpoint');
    }

    const isOAuth2 = connection.metadata?.oauth2_pkce === true;

    // === DETAILED TOKEN DIAGNOSTICS ===
    const now = new Date();
    const tokenExpiresAt = connection.token_expires_at ? new Date(connection.token_expires_at) : null;
    const hasRefreshToken = !!connection.refresh_token;
    const tokenAge = tokenExpiresAt ? Math.round((now.getTime() - tokenExpiresAt.getTime()) / 1000) : null;
    
    console.log('[TOKEN DIAG]', JSON.stringify({
      connectionId,
      isOAuth2,
      hasAccessToken: !!connection.access_token,
      accessTokenPrefix: connection.access_token ? connection.access_token.substring(0, 20) + '...' : null,
      hasRefreshToken,
      tokenExpiresAt: connection.token_expires_at || 'NOT SET',
      tokenExpired: tokenExpiresAt ? tokenExpiresAt <= now : 'UNKNOWN',
      tokenAgeSeconds: tokenAge,
      tokenAgeHuman: tokenAge !== null
        ? (tokenAge > 0 ? `expired ${Math.abs(tokenAge)}s ago` : `valid for ${Math.abs(tokenAge)}s`)
        : 'unknown',
      lastVerifiedAt: connection.last_verified_at || 'NOT SET',
      connectedAt: connection.connected_at || 'NOT SET',
      metadata: connection.metadata,
    }));

    // Create publish attempt record
    const { data: attempt, error: attemptError } = await supabase
      .from('publish_attempts')
      .insert({
        schedule_id: scheduleId || null,
        content_id: contentId || null,
        connection_id: connectionId,
        organization_id: connection.organization_id,
        platform: 'twitter',
        channel: 'twitter',
        status: 'processing',
        request_payload: { text: content.substring(0, 100) + '...' },
      })
      .select()
      .single();

    if (attemptError) {
      console.error('Failed to create publish attempt:', attemptError);
    }

    try {
      if (content.length > 280) {
        throw new Error('Nội dung vượt quá 280 ký tự. Vui lòng rút gọn trước khi đăng.');
      }
      const tweetContent = content;
      let tweetResult;

      if (isOAuth2) {
        // OAuth 2.0 Bearer token flow
        let accessToken = connection.access_token;

        // Proactive refresh: if token expires within 5 minutes OR already expired
        const shouldRefresh = tokenExpiresAt 
          ? tokenExpiresAt.getTime() - now.getTime() < 5 * 60 * 1000 
          : false;

        if (shouldRefresh || (tokenExpiresAt && tokenExpiresAt <= now)) {
          const reason = tokenExpiresAt && tokenExpiresAt <= now ? 'EXPIRED' : 'EXPIRING_SOON';
          console.log(`[TOKEN REFRESH] Reason: ${reason}, expires_at: ${connection.token_expires_at}`);
          
          if (!connection.refresh_token) {
            throw new Error('Token expired and no refresh token available. Please reconnect X account.');
          }
          
          try {
            accessToken = await refreshOAuth2Token(supabase, connectionId, connection.refresh_token);
            console.log('[TOKEN REFRESH] SUCCESS - new token obtained');
          } catch (refreshErr: any) {
            console.error('[TOKEN REFRESH] FAILED:', refreshErr.message);
            throw new Error(`Token refresh failed: ${refreshErr.message}. Please reconnect X account.`);
          }
        } else {
          console.log('[TOKEN] Using existing token (still valid)');
        }

        tweetResult = await postTweetOAuth2(tweetContent, accessToken);
      } else {
        // Legacy OAuth 1.0a flow
        const accessToken = connection.access_token;
        const accessTokenSecret = connection.refresh_token;

        let consumerKey = connection.consumer_key;
        let consumerSecret = connection.consumer_secret;
        let credentialSource = 'brand-specific';

        if (!consumerKey || !consumerSecret) {
          const globalCreds = await getGlobalPlatformCredentials(supabase, 'twitter');
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
        if (!accessToken || !accessTokenSecret) throw new Error('Twitter user credentials not found.');

        console.log(`Using ${credentialSource} consumer keys (OAuth 1.0a)`);
        tweetResult = await postTweet(tweetContent, consumerKey, consumerSecret, accessToken, accessTokenSecret);
      }

      console.log('Tweet posted successfully:', tweetResult);

      if (attempt) {
        await supabase.from('publish_attempts').update({
          status: 'success',
          external_post_id: tweetResult.id,
          external_post_url: `https://twitter.com/i/web/status/${tweetResult.id}`,
          response_payload: tweetResult,
          completed_at: new Date().toISOString(),
        }).eq('id', attempt.id);
      }

      await supabase.from('social_connections').update({ last_used_at: new Date().toISOString() }).eq('id', connectionId);

      if (scheduleId) {
        await supabase.from('content_schedules').update({
          publish_status: 'published',
          published_at: new Date().toISOString(),
          external_post_id: tweetResult.id,
        }).eq('id', scheduleId);
      }

      await supabase.from('content_publishing_logs').insert({
        content_id: contentId || null,
        schedule_id: scheduleId || null,
        organization_id: connection.organization_id,
        channel: 'twitter',
        action: 'published',
        details: { tweet_id: tweetResult.id, tweet_url: `https://twitter.com/i/web/status/${tweetResult.id}` },
      });

      return new Response(
        JSON.stringify({
          success: true,
          data: { tweetId: tweetResult.id, tweetUrl: `https://twitter.com/i/web/status/${tweetResult.id}` },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (twitterError: any) {
      console.error('Twitter API error:', twitterError);

      if (attempt) {
        await supabase.from('publish_attempts').update({
          status: 'failed',
          error_message: twitterError.message,
          completed_at: new Date().toISOString(),
        }).eq('id', attempt.id);
      }

      await supabase.from('social_connections').update({
        last_error: twitterError.message,
      }).eq('id', connectionId);

      if (scheduleId) {
        await supabase.from('content_schedules').update({
          publish_status: 'failed',
          last_error: twitterError.message,
          last_attempt_at: new Date().toISOString(),
        }).eq('id', scheduleId);
      }

      const transient = isTransientTwitterError(twitterError);
      if (transient) {
        const statusCode = extractTwitterStatusCode(twitterError?.message);
        const friendlyMessage = buildTransientTwitterMessage(statusCode);

        return new Response(
          JSON.stringify({
            success: false,
            retryable: true,
            transient: true,
            error: friendlyMessage,
            details: { provider_status: statusCode, provider: 'x' },
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw twitterError;
    }
  } catch (error: any) {
    console.error('Publish Twitter error:', error);

    const transient = isTransientTwitterError(error);
    if (transient) {
      const statusCode = extractTwitterStatusCode(error?.message);
      const friendlyMessage = buildTransientTwitterMessage(statusCode);

      return new Response(
        JSON.stringify({
          success: false,
          retryable: true,
          transient: true,
          error: friendlyMessage,
          details: { provider_status: statusCode, provider: 'x' },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));

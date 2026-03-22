import { decryptCredential } from "../_shared/crypto.ts";

import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { buildOAuth1Header } from "../_shared/oauth1a.ts";

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
  const match =
    message.match(/(?:Twitter API error:|X API trả về)\s*(\d{3})/i) ||
    message.match(/\bstatus["'\s:=]+(\d{3})\b/i);
  if (!match) return null;
  const code = Number(match[1]);
  return Number.isFinite(code) ? code : null;
}

function classifyTwitterConfigError(error: unknown): { code: string; message: string } | null {
  const message = error instanceof Error ? error.message : String(error ?? '');

  if (
    message.includes('client-not-enrolled') ||
    message.includes('App chưa được gắn vào Project') ||
    message.includes('attached to a Project')
  ) {
    return {
      code: 'X_PROJECT_REQUIRED',
      message:
        'App X chưa được gắn vào Project trên developer.x.com nên chưa thể đăng bài. Vào Projects & Apps → gắn App vào một Project, rồi ngắt/kết nối lại X.',
    };
  }

  if (message.includes('"code":453') || message.includes('subset of X API V2 endpoints')) {
    return {
      code: 'X_ACCESS_LEVEL_LIMITED',
      message:
        'App X hiện bị giới hạn access level (code 453), chưa được phép dùng endpoint đăng bài này. Kiểm tra gói API access trong developer portal.',
    };
  }

  const statusCode = extractTwitterStatusCode(message);
  if (statusCode === 403) {
    return {
      code: 'X_FORBIDDEN',
      message:
        'X API từ chối quyền truy cập (403). Kiểm tra App Permissions = Read and Write và authorize lại tài khoản X.',
    };
  }

  return null;
}

function isTransientTwitterError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const statusCode = extractTwitterStatusCode(message);
  return statusCode !== null && statusCode >= 500 && statusCode < 600;
}

function isTwitterAuthError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const statusCode = extractTwitterStatusCode(message);
  if (statusCode === 401) return true;
  return (
    message.includes('Could not authenticate you') ||
    message.includes('"code":32') ||
    message.includes('Unauthorized')
  );
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

// Post tweet using Twitter API v2 with OAuth 1.0a
async function postTweetV2(
  tweetText: string,
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  accessTokenSecret: string
): Promise<{ id: string; text: string }> {
  const url = "https://api.x.com/2/tweets";

  const oauthHeader = buildOAuth1Header(
    'POST',
    url,
    consumerKey,
    consumerSecret,
    accessToken,
    accessTokenSecret,
  );

  console.log("Posting tweet via OAuth 1.0a (v2)...");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: oauthHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: tweetText }),
  });

  const responseText = await response.text();
  console.log("Twitter API v2 Response:", response.status, responseText);

  if (!response.ok) {
    throw new Error(`Twitter API error: ${response.status} - ${responseText}`);
  }

  const result = JSON.parse(responseText);
  return result.data;
}

// Post tweet with retry for transient 503 errors (v2 only - Free tier doesn't support v1.1 statuses/update)
async function postTweet(
  tweetText: string,
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  accessTokenSecret: string
): Promise<{ id: string; text: string }> {
  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = attempt * 1500;
        console.log(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
      return await postTweetV2(tweetText, consumerKey, consumerSecret, accessToken, accessTokenSecret);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const statusCode = extractTwitterStatusCode(lastError.message);
      
      // Only retry on transient 503 errors
      if (statusCode !== 503 || attempt >= maxRetries) {
        // Provide helpful error for common issues
        if (statusCode === 503) {
          throw new Error(
            'Twitter API error: 503 - X API trả về 503. Nguyên nhân phổ biến: App chưa được gắn vào Project trên developer.x.com. ' +
            'Vào developer.x.com → Projects & Apps → đảm bảo App nằm trong một Project.'
          );
        }
        if (statusCode === 403) {
          throw new Error(
            'X API từ chối quyền truy cập (403). Kiểm tra: 1) App có quyền Read+Write, ' +
            '2) App nằm trong Project trên developer.x.com, 3) User đã authorize đúng quyền.'
          );
        }
        throw lastError;
      }
      console.warn(`v2 tweet got 503, will retry (attempt ${attempt + 1}/${maxRetries})`);
    }
  }
  throw lastError!;
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

    const isOAuth1 = !connection.metadata?.oauth2_pkce || connection.metadata?.oauth_version === '1.0a';

    // === DETAILED TOKEN DIAGNOSTICS ===
    const now = new Date();
    const tokenExpiresAt = connection.token_expires_at ? new Date(connection.token_expires_at) : null;
    
    console.log('[TOKEN DIAG]', JSON.stringify({
      connectionId,
      isOAuth1,
      hasAccessToken: !!connection.access_token,
      hasTokenSecret: !!connection.refresh_token,
      tokenExpiresAt: connection.token_expires_at || 'NOT SET (OAuth 1.0a - no expiry)',
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

      // Always use OAuth 1.0a
      const accessToken = connection.access_token;
      const accessTokenSecret = connection.refresh_token; // stored in refresh_token field

      // Prioritize environment secrets (must match keys used during OAuth flow)
      const envConsumerKey = Deno.env.get('TWITTER_CONSUMER_KEY')?.trim();
      const envConsumerSecret = Deno.env.get('TWITTER_CONSUMER_SECRET')?.trim();

      let consumerKey: string | undefined;
      let consumerSecret: string | undefined;
      let credentialSource = 'environment';

      if (envConsumerKey && envConsumerSecret) {
        consumerKey = envConsumerKey;
        consumerSecret = envConsumerSecret;
        credentialSource = 'environment';
      } else {
        // Fallback: brand-specific or global-admin
        consumerKey = connection.consumer_key;
        consumerSecret = connection.consumer_secret;
        credentialSource = 'brand-specific';

        if (!consumerKey || !consumerSecret) {
          const globalCreds = await getGlobalPlatformCredentials(supabase, 'twitter');
          if (globalCreds.consumerKey && globalCreds.consumerSecret) {
            consumerKey = globalCreds.consumerKey;
            consumerSecret = globalCreds.consumerSecret;
            credentialSource = 'global-admin';
          }
        }
      }

      if (!consumerKey || !consumerSecret) throw new Error('Twitter app credentials not configured.');
      if (!accessToken || !accessTokenSecret) throw new Error('Twitter user credentials not found. Please reconnect X account.');

      console.log(`Using ${credentialSource} consumer keys (OAuth 1.0a)`);

      let activeConsumerKey = consumerKey;
      let activeConsumerSecret = consumerSecret;

      try {
        tweetResult = await postTweet(tweetContent, activeConsumerKey, activeConsumerSecret, accessToken, accessTokenSecret);
      } catch (postError) {
        const canRetryWithEnvironment =
          credentialSource === 'global-admin' &&
          !!envConsumerKey &&
          !!envConsumerSecret &&
          (envConsumerKey !== activeConsumerKey || envConsumerSecret !== activeConsumerSecret) &&
          isTwitterAuthError(postError);

        if (!canRetryWithEnvironment) {
          throw postError;
        }

        console.warn('Global-admin Twitter credentials failed; retrying with environment credentials');
        credentialSource = 'environment-fallback';
        activeConsumerKey = envConsumerKey;
        activeConsumerSecret = envConsumerSecret;

        tweetResult = await postTweet(tweetContent, activeConsumerKey, activeConsumerSecret, accessToken, accessTokenSecret);
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

      const configIssue = classifyTwitterConfigError(twitterError);
      if (configIssue) {
        return new Response(
          JSON.stringify({
            success: false,
            retryable: false,
            transient: false,
            errorCode: configIssue.code,
            error: configIssue.message,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
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

    const configIssue = classifyTwitterConfigError(error);
    if (configIssue) {
      return new Response(
        JSON.stringify({
          success: false,
          retryable: false,
          transient: false,
          errorCode: configIssue.code,
          error: configIssue.message,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

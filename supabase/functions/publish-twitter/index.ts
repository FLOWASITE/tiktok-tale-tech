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
    message.match(/X API[^\n]*?\((\d{3})\)/i) ||
    message.match(/\bstatus["'\s:=]+(\d{3})\b/i) ||
    message.match(/\b(\d{3})\b(?=\s*-\s*\{)/i);

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
  if (statusCode === 403 || message.includes('You are not permitted to perform this action')) {
    return {
      code: 'X_FORBIDDEN',
      message:
        'X API từ chối quyền truy cập (403). Kiểm tra: 1) App có quyền Read+Write, 2) App nằm trong Project trên developer.x.com, 3) User đã authorize lại sau khi đổi key/quyền.',
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

// ==================== MEDIA UPLOAD ====================

/**
 * Chunk-safe base64 encoding for large binary data.
 * Avoids stack overflow from btoa(String.fromCharCode(...bigArray)).
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const chunk = bytes.subarray(i, i + CHUNK);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

/**
 * Upload a single image to Twitter via v1.1 media/upload (simple upload).
 * Max 5MB per image. Returns media_id_string.
 */
async function uploadMediaToTwitter(
  imageUrl: string,
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  accessTokenSecret: string,
): Promise<string> {
  console.log(`[media] Fetching image: ${imageUrl.substring(0, 80)}...`);

  const imgResp = await fetch(imageUrl);
  if (!imgResp.ok) {
    throw new Error(`Failed to fetch image: ${imgResp.status} ${imgResp.statusText}`);
  }

  const imgBuffer = await imgResp.arrayBuffer();
  const imgSizeMB = imgBuffer.byteLength / (1024 * 1024);
  console.log(`[media] Image size: ${imgSizeMB.toFixed(2)} MB`);

  if (imgSizeMB > 5) {
    throw new Error(`Image too large (${imgSizeMB.toFixed(1)} MB). X allows max 5 MB per image.`);
  }

  const base64Data = arrayBufferToBase64(imgBuffer);

  const uploadUrl = 'https://upload.twitter.com/1.1/media/upload.json';

  // For media upload, OAuth signature must NOT include body params (multipart)
  const oauthHeader = buildOAuth1Header(
    'POST',
    uploadUrl,
    consumerKey,
    consumerSecret,
    accessToken,
    accessTokenSecret,
    // No extra params — multipart body is excluded from signature
  );

  // Build form body
  const boundary = '----TwitterMediaBoundary' + crypto.randomUUID().replace(/-/g, '');
  const formBody = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="media_data"',
    '',
    base64Data,
    `--${boundary}--`,
  ].join('\r\n');

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: oauthHeader,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body: formBody,
  });

  const responseText = await response.text();
  console.log(`[media] Upload response: ${response.status}`);

  if (!response.ok) {
    throw new Error(`Media upload failed: ${response.status} - ${responseText}`);
  }

  const result = JSON.parse(responseText);
  const mediaId = result.media_id_string;
  console.log(`[media] Uploaded media_id: ${mediaId}`);
  return mediaId;
}

// ==================== THREAD SUPPORT ====================

const TWEET_MAX_CHARS = 280;
// Reserve room for " n/N" suffix (~6 chars) when we need to renumber
const TWEET_SAFE_CHARS = 274;

/**
 * Twitter weighted length per official spec:
 * https://developer.x.com/en/docs/counting-characters
 *
 * - URLs (http/https) count as 23 regardless of length.
 * - Code points in these ranges count as 1: 0-4351 (BMP Latin/CJK boundary segment),
 *   8192-8205, 8208-8223, 8242-8247.
 * - Everything else (most CJK, emoji, supplementary plane, Vietnamese tone marks
 *   when in NFC combined form usually fits 0-4351, but full-width punctuation,
 *   most emoji, and surrogate pairs) counts as 2.
 *
 * NOTE: We NFC-normalize first so Vietnamese diacritics like "ắ" become single
 * precomposed code points (which are <4352 → weight 1) instead of base+combining
 * sequences (combining marks U+0300-036F are <4352 too, but doubled the count).
 */
function isWeightOneCodePoint(cp: number): boolean {
  return (
    (cp >= 0 && cp <= 4351) ||
    (cp >= 8192 && cp <= 8205) ||
    (cp >= 8208 && cp <= 8223) ||
    (cp >= 8242 && cp <= 8247)
  );
}

function tweetWeightedLength(text: string): number {
  // Replace URLs with 23 weight-1 placeholder chars
  const urlRegex = /https?:\/\/\S+/g;
  const normalized = text.normalize('NFC').replace(urlRegex, 'x'.repeat(23));
  let weight = 0;
  for (const ch of normalized) {
    const cp = ch.codePointAt(0) ?? 0;
    weight += isWeightOneCodePoint(cp) ? 1 : 2;
  }
  return weight;
}

function sliceByGraphemes(text: string, max: number): string {
  const arr = Array.from(text);
  if (arr.length <= max) return text;
  return arr.slice(0, max).join('');
}

/**
 * Slice text so its tweetWeightedLength is ≤ max.
 * Uses grapheme-by-grapheme accumulation to handle weight-2 chars correctly.
 */
function sliceByWeightedLength(text: string, max: number): string {
  const normalized = text.normalize('NFC');
  let acc = '';
  let w = 0;
  for (const ch of normalized) {
    const cp = ch.codePointAt(0) ?? 0;
    const cw = isWeightOneCodePoint(cp) ? 1 : 2;
    if (w + cw > max) break;
    acc += ch;
    w += cw;
  }
  return acc;
}


/**
 * Hard-enforce a single tweet ≤ max chars by splitting at sentence/word boundary.
 * Returns array of chunks, each ≤ max chars (weighted length).
 */
function enforceTweetLimit(text: string, max: number = TWEET_MAX_CHARS): string[] {
  const trimmed = text.trim();
  if (tweetWeightedLength(trimmed) <= max) return [trimmed];

  const chunks: string[] = [];
  let remaining = trimmed;

  while (tweetWeightedLength(remaining) > max) {
    // Try to slice ~max graphemes then back off to last sentence/space boundary
    let slice = sliceByGraphemes(remaining, max);
    // Adjust if weighted length still > max (URLs counted as 23)
    while (tweetWeightedLength(slice) > max && slice.length > 1) {
      slice = sliceByGraphemes(slice, Array.from(slice).length - 1);
    }

    // Prefer breaking at sentence end (. ! ? \n) within last 80 chars
    const sentenceMatch = slice.match(/^([\s\S]*[\.!\?\n])\s+\S/);
    let cut = slice;
    if (sentenceMatch && sentenceMatch[1].length >= max * 0.5) {
      cut = sentenceMatch[1];
    } else {
      // Fall back to last whitespace
      const lastSpace = slice.lastIndexOf(' ');
      if (lastSpace > max * 0.5) {
        cut = slice.slice(0, lastSpace);
      }
    }

    chunks.push(cut.trim());
    remaining = remaining.slice(cut.length).trim();
  }
  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

/**
 * Split content into individual tweets for thread posting.
 * Detects patterns like "1/", "2/", "3/" at start of lines.
 * Always enforces 280-char limit per tweet (auto-splits oversized tweets).
 */
function splitThreadContent(content: string): string[] {
  const threadPattern = /(?:^|\n)\s*(\d+)\s*[/\.]\s*/;
  let rawTweets: string[];

  if (threadPattern.test(content)) {
    const parts = content.split(/(?:^|\n)\s*\d+\s*[/\.]\s*/).filter(p => p.trim().length > 0);
    rawTweets = parts.length >= 2 ? parts.map(p => p.trim()) : [content.trim()];
  } else {
    rawTweets = [content.trim()];
  }

  // Enforce 280-char limit per tweet — auto-split if any exceeds
  const isThread = rawTweets.length > 1;
  const limit = isThread ? TWEET_SAFE_CHARS : TWEET_MAX_CHARS;
  const expanded: string[] = [];
  for (const t of rawTweets) {
    expanded.push(...enforceTweetLimit(t, limit));
  }

  // Re-number if thread (more than 1 tweet after enforcement)
  if (expanded.length > 1) {
    const total = expanded.length;
    return expanded.map((part, i) => {
      const prefix = `${i + 1}/${total} `;
      // Strip any pre-existing "n/" prefix that might leak through
      const cleaned = part.replace(/^\d+\/\d*\s+/, '').trim();
      // Ensure final string still ≤ 280 (prefix is small, but be safe)
      const withPrefix = prefix + cleaned;
      if (tweetWeightedLength(withPrefix) <= TWEET_MAX_CHARS) return withPrefix;
      // Last-resort hard truncate
      return prefix + sliceByGraphemes(cleaned, TWEET_MAX_CHARS - prefix.length - 1) + '…';
    });
  }

  return expanded;
}

// ==================== POST TWEET V2 ====================

// Post tweet using Twitter API v2 with OAuth 1.0a
async function postTweetV2(
  tweetText: string,
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  accessTokenSecret: string,
  mediaIds?: string[],
  replyToTweetId?: string,
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

  const body: Record<string, unknown> = { text: tweetText };
  if (mediaIds && mediaIds.length > 0) {
    body.media = { media_ids: mediaIds };
  }
  if (replyToTweetId) {
    body.reply = { in_reply_to_tweet_id: replyToTweetId };
  }

  console.log("Posting tweet via OAuth 1.0a (v2)...", replyToTweetId ? `reply_to=${replyToTweetId}` : '');

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: oauthHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const responseText = await response.text();
  const requestId =
    response.headers.get('x-request-id') ||
    response.headers.get('x-transaction-id') ||
    response.headers.get('x-client-transaction-id');

  console.log(
    "Twitter API v2 Response:",
    response.status,
    responseText,
    requestId ? `request_id=${requestId}` : 'request_id=not_provided'
  );

  if (!response.ok) {
    const requestIdSuffix = requestId ? ` [request_id:${requestId}]` : '';
    throw new Error(`Twitter API error: ${response.status} - ${responseText}${requestIdSuffix}`);
  }

  const result = JSON.parse(responseText);
  return result.data;
}

// Post tweet with retry for transient 503 errors
async function postTweet(
  tweetText: string,
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  accessTokenSecret: string,
  mediaIds?: string[],
  replyToTweetId?: string,
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
      return await postTweetV2(tweetText, consumerKey, consumerSecret, accessToken, accessTokenSecret, mediaIds, replyToTweetId);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const statusCode = extractTwitterStatusCode(lastError.message);

      if (statusCode !== 503 || attempt >= maxRetries) {
        if (statusCode === 503) {
          throw new Error(
            'Twitter API error: 503 - X API trả về 503. Nguyên nhân phổ biến: App chưa được gắn vào Project trên developer.x.com. ' +
            'Vào developer.x.com → Projects & Apps → đảm bảo App nằm trong một Project.'
          );
        }
        if (statusCode === 403) {
          throw new Error(
            'Twitter API error: 403 - X API từ chối quyền truy cập. Kiểm tra: 1) App có quyền Read+Write, ' +
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

// ==================== MAIN HANDLER ====================

Deno.serve(withPerf({ functionName: 'publish-twitter' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getServiceClient();

    const body: PublishRequest = await req.json();
    const { connectionId, contentId, content, mediaUrls, scheduleId } = body;

    if (!connectionId || !content) {
      throw new Error('connectionId and content are required');
    }

    console.log(`Publishing to Twitter for connection ${connectionId}`);
    if (mediaUrls?.length) {
      console.log(`[media] ${mediaUrls.length} image(s) to upload`);
    }

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
        request_payload: { text: content.substring(0, 100) + '...', hasMedia: !!(mediaUrls?.length) },
      })
      .select()
      .single();

    if (attemptError) {
      console.error('Failed to create publish attempt:', attemptError);
    }

    try {
      // === RESOLVE CREDENTIALS ===
      const accessToken = connection.access_token;
      const accessTokenSecret = connection.refresh_token; // stored in refresh_token field

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

      // === UPLOAD MEDIA (if any) ===
      let uploadedMediaIds: string[] = [];
      if (mediaUrls && mediaUrls.length > 0) {
        const maxImages = Math.min(mediaUrls.length, 4); // X allows max 4 images per tweet
        console.log(`[media] Uploading ${maxImages} image(s)...`);

        for (let i = 0; i < maxImages; i++) {
          try {
            const mediaId = await uploadMediaToTwitter(
              mediaUrls[i],
              activeConsumerKey,
              activeConsumerSecret,
              accessToken,
              accessTokenSecret,
            );
            uploadedMediaIds.push(mediaId);
          } catch (mediaErr) {
            console.error(`[media] Failed to upload image ${i + 1}:`, mediaErr);
            // Continue with remaining images — don't fail the entire publish
          }
        }
        console.log(`[media] Successfully uploaded ${uploadedMediaIds.length}/${maxImages} image(s)`);
      }

      // === SPLIT INTO THREAD OR SINGLE TWEET ===
      const tweets = splitThreadContent(content);
      console.log(`[thread] Content split into ${tweets.length} tweet(s)`);

      let firstTweetResult: { id: string; text: string } | null = null;

      const publishWithCredentials = async (ck: string, cs: string) => {
        if (tweets.length === 1) {
          // Single tweet — attach all media
          firstTweetResult = await postTweet(
            tweets[0], ck, cs, accessToken, accessTokenSecret,
            uploadedMediaIds.length > 0 ? uploadedMediaIds : undefined,
          );
        } else {
          // Thread — attach media to first tweet only
          let previousTweetId: string | undefined;

          for (let i = 0; i < tweets.length; i++) {
            const isFirst = i === 0;
            const tweetMediaIds = isFirst && uploadedMediaIds.length > 0 ? uploadedMediaIds : undefined;

            const result = await postTweet(
              tweets[i], ck, cs, accessToken, accessTokenSecret,
              tweetMediaIds,
              previousTweetId,
            );

            if (isFirst) {
              firstTweetResult = result;
            }
            previousTweetId = result.id;

            // Small delay between thread tweets to avoid rate limiting
            if (i < tweets.length - 1) {
              await new Promise(r => setTimeout(r, 500));
            }
          }
        }
      };

      try {
        await publishWithCredentials(activeConsumerKey, activeConsumerSecret);
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

        await publishWithCredentials(activeConsumerKey, activeConsumerSecret);
      }

      const tweetResult = firstTweetResult!;
      console.log('Tweet posted successfully:', tweetResult, tweets.length > 1 ? `(thread: ${tweets.length} tweets)` : '');

      if (attempt) {
        await supabase.from('publish_attempts').update({
          status: 'success',
          external_post_id: tweetResult.id,
          external_post_url: `https://twitter.com/i/web/status/${tweetResult.id}`,
          response_payload: { ...tweetResult, thread_count: tweets.length },
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
        details: {
          tweet_id: tweetResult.id,
          tweet_url: `https://twitter.com/i/web/status/${tweetResult.id}`,
          thread_count: tweets.length,
          media_count: uploadedMediaIds.length,
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            tweetId: tweetResult.id,
            tweetUrl: `https://twitter.com/i/web/status/${tweetResult.id}`,
            threadCount: tweets.length,
            mediaCount: uploadedMediaIds.length,
          },
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

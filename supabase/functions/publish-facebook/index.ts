import { decrypt as decryptGCM } from "../_shared/crypto.ts";
import { createDecipheriv } from "node:crypto";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { Buffer } from "node:buffer";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PublishRequest {
  connectionId: string;
  contentId?: string;
  content: string;
  mediaUrls?: string[];
  linkUrl?: string;
  scheduleTime?: string;
  scheduleId?: string;
}

// Legacy CBC decrypt
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

// Format Facebook Graph API error with full diagnostics
function formatFbError(err: any, ctx: string): string {
  const e = err?.error || {};
  const code = e.code ?? '?';
  const sub = e.error_subcode ?? '?';
  const trace = e.fbtrace_id ?? '?';
  const msg = e.message || e.error_user_msg || 'unknown';
  console.error(`[FB ${ctx}] full error payload:`, JSON.stringify(err, null, 2));
  return `FB[${ctx}] code=${code}/${sub} trace=${trace}: ${msg}`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Transient FB error codes worth retrying
const TRANSIENT_CODES = new Set([1, 2, 4, 17, 341, 368, -1]);

async function uploadUnpublishedPhoto(
  pageId: string,
  accessToken: string,
  imageUrl: string,
): Promise<string> {
  const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/photos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      access_token: accessToken,
      url: imageUrl,
      published: 'false',
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(formatFbError(err, `upload-photo ${imageUrl.slice(0, 80)}`));
  }
  const data = await res.json();
  return data.id;
}

// Verify a single uploaded photo is "ready" (FB has processed it)
async function waitForPhotoReady(
  photoId: string,
  accessToken: string,
  maxAttempts = 3,
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${photoId}?fields=id,images&access_token=${encodeURIComponent(accessToken)}`,
      );
      if (res.ok) {
        const data = await res.json();
        if (data?.id && Array.isArray(data?.images) && data.images.length > 0) return true;
      }
    } catch { /* ignore */ }
    await sleep(2000);
  }
  return false;
}

async function publishToFacebook(
  pageId: string,
  accessToken: string,
  content: string,
  options: { mediaUrls?: string[]; linkUrl?: string; scheduleTime?: string }
): Promise<{ postId: string; postUrl: string }> {
  const { linkUrl, scheduleTime } = options;
  let { mediaUrls } = options;

  // Facebook KHÔNG hỗ trợ SVG → loại bỏ khỏi mediaUrls trước khi gọi Graph API
  if (mediaUrls && mediaUrls.length > 0) {
    const isSvg = (u: string) => /\.svg(\?|$)/i.test(u) || u.startsWith('data:image/svg');
    const filtered = mediaUrls.filter((u) => !isSvg(u));
    if (filtered.length !== mediaUrls.length) {
      console.warn(
        `[FB] Đã loại ${mediaUrls.length - filtered.length} ảnh SVG (Facebook không hỗ trợ SVG). Còn lại: ${filtered.length}`
      );
    }
    mediaUrls = filtered.length > 0 ? filtered : undefined;
  }

  if (mediaUrls && mediaUrls.length === 1) {
    // Single photo post — direct upload
    const photoParams: Record<string, string> = {
      access_token: accessToken,
      url: mediaUrls[0],
      caption: content,
    };
    if (scheduleTime) {
      photoParams.published = 'false';
      photoParams.scheduled_publish_time = Math.floor(new Date(scheduleTime).getTime() / 1000).toString();
    }
    const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(photoParams),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(formatFbError(err, 'single-photo'));
    }
    const data = await res.json();
    const postId = data.post_id || data.id;
    return { postId, postUrl: `https://www.facebook.com/${postId}` };
  }

  if (mediaUrls && mediaUrls.length > 1) {
    // Multi-photo post — upload unpublished then attach to feed post
    console.log(`Uploading ${mediaUrls.length} photos as unpublished...`);
    const photoIds = await Promise.all(
      mediaUrls.map(url => uploadUnpublishedPhoto(pageId, accessToken, url))
    );
    console.log('Unpublished photo IDs:', photoIds);

    // Wait for FB to process photos before attaching (race condition fix)
    console.log('Waiting 3s for FB to process photos...');
    await sleep(3000);

    // Verify each photo is ready
    const readyResults = await Promise.all(
      photoIds.map((id) => waitForPhotoReady(id, accessToken)),
    );
    const notReady = photoIds.filter((_, i) => !readyResults[i]);
    if (notReady.length > 0) {
      console.warn(`[FB multi-photo] ${notReady.length}/${photoIds.length} photos not confirmed ready, continuing anyway:`, notReady);
    } else {
      console.log('All photos confirmed ready.');
    }

    const params: Record<string, string> = {
      access_token: accessToken,
      message: content,
    };
    photoIds.forEach((id, i) => {
      params[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id });
    });
    if (scheduleTime) {
      params.published = 'false';
      params.scheduled_publish_time = Math.floor(new Date(scheduleTime).getTime() / 1000).toString();
    }

    // Retry /feed call on transient FB errors
    let lastErrPayload: any = null;
    let lastErrCode: number | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(params),
      });
      if (res.ok) {
        const data = await res.json();
        if (attempt > 1) console.log(`[FB multi-photo] succeeded on attempt ${attempt}`);
        return { postId: data.id, postUrl: `https://www.facebook.com/${data.id}` };
      }
      lastErrPayload = await res.json().catch(() => ({}));
      lastErrCode = lastErrPayload?.error?.code ?? null;
      console.warn(`[FB multi-photo] attempt ${attempt} failed: code=${lastErrCode}, msg=${lastErrPayload?.error?.message}`);
      if (lastErrCode !== null && !TRANSIENT_CODES.has(lastErrCode)) break;
      if (attempt < 3) await sleep(3000 * attempt);
    }
    throw new Error(formatFbError(lastErrPayload, 'multi-photo-feed'));
  }

  // Text or link post
  const params: Record<string, string> = {
    access_token: accessToken,
    message: content,
  };
  if (linkUrl) params.link = linkUrl;
  if (scheduleTime) {
    params.published = 'false';
    params.scheduled_publish_time = Math.floor(new Date(scheduleTime).getTime() / 1000).toString();
  }

  const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(formatFbError(err, 'text-or-link'));
  }
  const data = await res.json();
  return { postId: data.id, postUrl: `https://www.facebook.com/${data.id}` };
}

Deno.serve(withPerf({ functionName: 'publish-facebook' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getServiceClient();

    // Verify user authentication (allow internal service-role calls from scheduled worker)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const token = authHeader.replace('Bearer ', '');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const isInternalCall = !!serviceRoleKey && token === serviceRoleKey;

    if (!isInternalCall) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) throw new Error('Unauthorized');
    } else {
      console.log('publish-facebook: accepted internal service-role invocation');
    }

    const body: PublishRequest = await req.json();
    const { connectionId, contentId, content, mediaUrls, linkUrl, scheduleTime, scheduleId } = body;

    if (!connectionId || !content) {
      throw new Error('connectionId and content are required');
    }

    // Get connection details
    const { data: connection, error: connectionError } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('platform', 'facebook')
      .single();

    if (connectionError || !connection) throw new Error('Facebook connection not found');
    if (!connection.is_active) throw new Error('Facebook connection is not active');

    // Decrypt access token
    let accessToken: string;
    try {
      accessToken = await decryptCredential(connection.access_token);
    } catch (e) {
      console.error('Decryption failed:', e);
      throw new Error('Failed to decrypt access token');
    }

    const pageId = connection.platform_user_id || connection.metadata?.page_id;
    if (!pageId) throw new Error('Page ID not found in connection');

    // Create publish attempt record
    const { data: attempt } = await supabase
      .from('publish_attempts')
      .insert({
        schedule_id: scheduleId || null,
        content_id: contentId || null,
        connection_id: connectionId,
        organization_id: connection.organization_id,
        platform: 'facebook',
        channel: 'facebook',
        status: 'processing',
        request_payload: { text: content.substring(0, 100) + '...', hasMedia: !!mediaUrls?.length, hasLink: !!linkUrl },
      })
      .select()
      .single();

    try {
      const result = await publishToFacebook(pageId, accessToken, content, { mediaUrls, linkUrl, scheduleTime });

      console.log('Facebook post published:', result.postId);

      // Update publish attempt with success
      if (attempt) {
        await supabase
          .from('publish_attempts')
          .update({
            status: 'success',
            external_post_id: result.postId,
            external_post_url: result.postUrl,
            response_payload: result,
            completed_at: new Date().toISOString(),
          })
          .eq('id', attempt.id);
      }

      // Update connection last_used_at
      await supabase
        .from('social_connections')
        .update({
          last_used_at: new Date().toISOString(),
          last_error: null,
          metadata: {
            ...connection.metadata,
            last_post_at: new Date().toISOString(),
            last_post_id: result.postId,
          },
        })
        .eq('id', connectionId);

      // Update schedule if provided
      if (scheduleId) {
        await supabase
          .from('content_schedules')
          .update({
            publish_status: 'published',
            published_at: new Date().toISOString(),
            external_post_id: result.postId,
          })
          .eq('id', scheduleId);
      }

      // Log publishing action
      await supabase
        .from('content_publishing_logs')
        .insert({
          content_id: contentId || null,
          schedule_id: scheduleId || null,
          organization_id: connection.organization_id,
          channel: 'facebook',
          action: 'published',
          details: {
            post_id: result.postId,
            post_url: result.postUrl,
            scheduled: !!scheduleTime,
          },
        });

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            postId: result.postId,
            postUrl: result.postUrl,
          },
          scheduled: !!scheduleTime,
          message: scheduleTime ? 'Bài viết đã được lên lịch' : 'Đã đăng bài thành công lên Facebook Page',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (fbError: any) {
      console.error('Facebook API error:', fbError);

      // Update publish attempt with failure
      if (attempt) {
        await supabase
          .from('publish_attempts')
          .update({
            status: 'failed',
            error_message: fbError.message,
            completed_at: new Date().toISOString(),
          })
          .eq('id', attempt.id);
      }

      // Update connection with last error
      await supabase
        .from('social_connections')
        .update({ last_error: fbError.message })
        .eq('id', connectionId);

      throw fbError;
    }
  } catch (error) {
    console.error('Facebook publish error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to publish to Facebook';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));

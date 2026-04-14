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
    const err = await res.json();
    throw new Error(err.error?.message || 'Failed to upload photo');
  }
  const data = await res.json();
  return data.id;
}

async function publishToFacebook(
  pageId: string,
  accessToken: string,
  content: string,
  options: { mediaUrls?: string[]; linkUrl?: string; scheduleTime?: string }
): Promise<{ postId: string; postUrl: string }> {
  const { mediaUrls, linkUrl, scheduleTime } = options;

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
      const err = await res.json();
      throw new Error(err.error?.message || 'Failed to publish photo');
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

    const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || 'Failed to publish multi-photo post');
    }
    const data = await res.json();
    return { postId: data.id, postUrl: `https://www.facebook.com/${data.id}` };
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
    const err = await res.json();
    throw new Error(err.error?.message || 'Failed to publish post');
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

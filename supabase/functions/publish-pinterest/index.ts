import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { decryptCredential } from "../_shared/crypto.ts";
import { rehostImageForPinterest, refreshPinterestToken } from "../_shared/pinterest-helpers.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PublishRequest {
  connectionId: string;
  content: string;          // Pin description (max 500 chars)
  title?: string;           // Pin title (max 100 chars)
  mediaUrls?: string[];     // 1 = single image; 2-5 = carousel; mp4/mov = video
  link?: string;            // destination link (Pinterest is link-driven)
  boardId?: string;         // Pinterest board to pin to
  altText?: string;         // accessibility text
  pinType?: 'auto' | 'image' | 'carousel' | 'video' | 'idea';
  scheduleId?: string;
  contentId?: string;
  organization_id?: string;
}

const PINTEREST_API = 'https://api.pinterest.com/v5';
const PINTEREST_TRIAL_ACCESS_CODE = 'PINTEREST_TRIAL_ACCESS';
const PINTEREST_TRIAL_ACCESS_MESSAGE =
  'Pinterest app đang ở Trial access nên chưa thể tạo Pin thật trên Pinterest production. Vui lòng gửi app để Pinterest duyệt Standard access; API Sandbox chỉ dùng để test dữ liệu mẫu, không đăng lên tài khoản Pinterest thật.';

function isPinterestTrialAccessError(error: any): boolean {
  const text = [
    error?.message,
    error?.body?.message,
    error?.body?.error,
    error?.body?.raw,
  ].filter(Boolean).join(' ');
  return error?.status === 403 && /Trial access|may not create Pins in production|api-sandbox\.pinterest\.com/i.test(text);
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|m4v|webm)(\?|$)/i.test(url);
}

function truncate(str: string, max: number): string {
  if (!str) return '';
  if (str.length <= max) return str;
  return str.slice(0, max - 1).trimEnd() + '…';
}

async function pinterestFetch(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<any> {
  const res = await fetch(`${PINTEREST_API}${path}`, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  const text = await res.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) {
    const msg = data?.message || data?.error_description || data?.raw || `HTTP ${res.status}`;
    const err = new Error(`Pinterest API ${res.status}: ${msg}`);
    (err as any).status = res.status;
    (err as any).body = data;
    if (isPinterestTrialAccessError(err)) {
      (err as any).errorCode = PINTEREST_TRIAL_ACCESS_CODE;
      err.message = PINTEREST_TRIAL_ACCESS_MESSAGE;
    }
    throw err;
  }
  return data;
}

// Create an image Pin (single image, hosted URL)
async function createImagePin(
  accessToken: string,
  params: { boardId: string; title?: string; description: string; link?: string; altText?: string; imageUrl: string }
): Promise<{ id: string; url: string }> {
  const body = {
    board_id: params.boardId,
    title: truncate(params.title || '', 100),
    description: truncate(params.description, 500),
    link: params.link || undefined,
    alt_text: truncate(params.altText || params.title || '', 500),
    media_source: {
      source_type: 'image_url',
      url: params.imageUrl,
    },
  };
  console.log('[publish-pinterest] create image pin', { board: params.boardId, image: params.imageUrl });
  const data = await pinterestFetch('/pins', accessToken, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return { id: data.id, url: `https://pinterest.com/pin/${data.id}/` };
}

// Create a multi-image (carousel) Pin
async function createCarouselPin(
  accessToken: string,
  params: { boardId: string; title?: string; description: string; link?: string; imageUrls: string[]; altText?: string }
): Promise<{ id: string; url: string }> {
  const items = params.imageUrls.slice(0, 5).map((url) => ({ url }));
  const body = {
    board_id: params.boardId,
    title: truncate(params.title || '', 100),
    description: truncate(params.description, 500),
    link: params.link || undefined,
    alt_text: truncate(params.altText || params.title || '', 500),
    media_source: {
      source_type: 'multiple_image_urls',
      items,
    },
  };
  console.log('[publish-pinterest] create carousel pin', { board: params.boardId, count: items.length });
  const data = await pinterestFetch('/pins', accessToken, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return { id: data.id, url: `https://pinterest.com/pin/${data.id}/` };
}

// Register a video upload, upload bytes, poll for ready, then create video Pin
async function createVideoPin(
  accessToken: string,
  params: { boardId: string; title?: string; description: string; link?: string; videoUrl: string; coverImageUrl?: string; altText?: string }
): Promise<{ id: string; url: string }> {
  // Step 1: register video upload
  console.log('[publish-pinterest] register video upload');
  const register = await pinterestFetch('/media', accessToken, {
    method: 'POST',
    body: JSON.stringify({ media_type: 'video' }),
  });
  const mediaId: string = register.media_id;
  const uploadUrl: string = register.upload_url;
  const uploadParams: Record<string, string> = register.upload_parameters || {};

  // Step 2: download source video, then POST multipart to AWS pre-signed URL
  console.log('[publish-pinterest] downloading source video');
  const videoRes = await fetch(params.videoUrl);
  if (!videoRes.ok) throw new Error(`Could not download source video (HTTP ${videoRes.status})`);
  const videoBlob = await videoRes.blob();

  const form = new FormData();
  for (const [k, v] of Object.entries(uploadParams)) form.append(k, v);
  form.append('file', videoBlob, 'video.mp4');

  console.log('[publish-pinterest] uploading video bytes', { size: videoBlob.size });
  const uploadRes = await fetch(uploadUrl, { method: 'POST', body: form });
  if (!uploadRes.ok) {
    const txt = await uploadRes.text();
    throw new Error(`Video upload failed (HTTP ${uploadRes.status}): ${txt.slice(0, 200)}`);
  }

  // Step 3: poll status
  let status = 'processing';
  for (let i = 0; i < 24; i++) { // ~2 minutes max
    await new Promise((r) => setTimeout(r, 5000));
    const stat = await pinterestFetch(`/media/${mediaId}`, accessToken, { method: 'GET' });
    status = stat.status;
    console.log('[publish-pinterest] media poll', { mediaId, status, attempt: i + 1 });
    if (status === 'succeeded') break;
    if (status === 'failed') throw new Error('Pinterest video processing failed');
  }
  if (status !== 'succeeded') throw new Error('Pinterest video processing timeout');

  // Step 4: create the Pin referencing the uploaded media
  const body = {
    board_id: params.boardId,
    title: truncate(params.title || '', 100),
    description: truncate(params.description, 500),
    link: params.link || undefined,
    alt_text: truncate(params.altText || params.title || '', 500),
    media_source: {
      source_type: 'video_id',
      media_id: mediaId,
      cover_image_url: params.coverImageUrl,
    },
  };
  console.log('[publish-pinterest] create video pin', { board: params.boardId, mediaId });
  const data = await pinterestFetch('/pins', accessToken, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return { id: data.id, url: `https://pinterest.com/pin/${data.id}/` };
}

Deno.serve(withPerf({ functionName: 'publish-pinterest' }, async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = getServiceClient();
    const body: PublishRequest = await req.json();
    const { connectionId, content, title, mediaUrls, link, boardId, altText, pinType, scheduleId, contentId } = body;
    const resolvedPinType = pinType && pinType !== 'auto' ? pinType : null;

    console.log('[publish-pinterest] request', {
      connectionId,
      contentLength: content?.length,
      mediaCount: mediaUrls?.length,
      boardId,
      pinType: resolvedPinType || 'auto',
    });

    if (!connectionId) throw new Error('connectionId is required');
    if (!mediaUrls || mediaUrls.length === 0) {
      throw new Error('Pinterest yêu cầu ít nhất 1 ảnh hoặc video để đăng Pin');
    }

    // Fetch connection
    const { data: connection, error: connErr } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .single();
    if (connErr || !connection) throw new Error('Pinterest connection not found');
    if (connection.platform !== 'pinterest') throw new Error('Connection is not a Pinterest account');

    // Decrypt access token
    let accessToken: string;
    try {
      accessToken = await decryptCredential(connection.access_token);
    } catch (e) {
      console.error('[publish-pinterest] decrypt failed', e);
      throw new Error('Failed to decrypt Pinterest access token. Hãy kết nối lại.');
    }
    if (!accessToken) throw new Error('Pinterest access token missing');

    // Resolve board: explicit > metadata.default_board_id > first board
    let resolvedBoard = boardId || (connection.metadata as any)?.default_board_id;
    if (!resolvedBoard) {
      const { data: cachedBoard } = await supabase
        .from('pinterest_boards')
        .select('board_id')
        .eq('connection_id', connectionId)
        .order('is_default', { ascending: false })
        .limit(1)
        .maybeSingle();
      resolvedBoard = cachedBoard?.board_id;
    }
    if (!resolvedBoard) {
      throw new Error('Chưa chọn Pinterest board. Vui lòng chọn board mặc định trong cài đặt kết nối.');
    }

    // Create attempt log
    const { data: attempt } = await supabase
      .from('publish_attempts')
      .insert({
        connection_id: connectionId,
        content_id: contentId,
        schedule_id: scheduleId,
        platform: 'pinterest',
        status: 'pending',
        content_snapshot: { content, title, mediaUrls, link, boardId: resolvedBoard },
      })
      .select()
      .single();
    const attemptId = attempt?.id;

    try {
      const description = content || '';
      const firstMedia = mediaUrls[0];
      const autoIsVideo = isVideoUrl(firstMedia);
      // Apply user override; fall back to auto-detect
      const effectiveType = resolvedPinType
        || (autoIsVideo ? 'video' : (mediaUrls.length > 1 ? 'carousel' : 'image'));

      // Rehost non-Pinterest-safe URLs (data:, blob:, http://) to Supabase public bucket
      let safeMedia: string[] = mediaUrls;
      if (effectiveType !== 'video') {
        safeMedia = await Promise.all(
          mediaUrls.map((u) => rehostImageForPinterest(u, `pin-${connectionId.slice(0, 8)}`))
        );
      }
      const safeFirst = safeMedia[0];

      // Helper that runs the actual publish with current access token
      const doPublish = async (token: string): Promise<{ id: string; url: string }> => {
        if (effectiveType === 'video') {
          const cover = safeMedia[1] && !isVideoUrl(safeMedia[1]) ? safeMedia[1] : undefined;
          return await createVideoPin(token, {
            boardId: resolvedBoard, title, description, link,
            videoUrl: safeFirst, coverImageUrl: cover, altText,
          });
        }
        if (effectiveType === 'image' || safeMedia.length === 1) {
          return await createImagePin(token, {
            boardId: resolvedBoard, title, description, link, altText, imageUrl: safeFirst,
          });
        }
        // carousel / idea → use carousel endpoint
        const imageOnly = safeMedia.filter((u) => !isVideoUrl(u)).slice(0, 5);
        if (imageOnly.length === 0) throw new Error('Không có ảnh hợp lệ để tạo carousel Pin');
        if (imageOnly.length === 1) {
          return await createImagePin(token, {
            boardId: resolvedBoard, title, description, link, altText, imageUrl: imageOnly[0],
          });
        }
        return await createCarouselPin(token, {
          boardId: resolvedBoard, title, description, link, altText, imageUrls: imageOnly,
        });
      };

      // Try once; on 401 auto-refresh and retry once
      let result: { id: string; url: string };
      try {
        result = await doPublish(accessToken);
      } catch (e: any) {
        if (e?.status === 401) {
          console.log('[publish-pinterest] 401 — refreshing token and retrying');
          accessToken = await refreshPinterestToken(connectionId);
          result = await doPublish(accessToken);
        } else {
          throw e;
        }
      }

      console.log('[publish-pinterest] success', result);

      // Update attempt
      if (attemptId) {
        await supabase
          .from('publish_attempts')
          .update({
            status: 'success',
            external_post_id: result.id,
            published_at: new Date().toISOString(),
          })
          .eq('id', attemptId);
      }

      // Update connection last_used
      await supabase
        .from('social_connections')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', connectionId);

      // Update schedule
      if (scheduleId) {
        await supabase
          .from('content_schedules')
          .update({
            publish_status: 'published',
            published_at: new Date().toISOString(),
            external_post_id: result.id,
          })
          .eq('id', scheduleId);
      }

      // Log
      if (contentId) {
        await supabase.from('content_publishing_logs').insert({
          content_id: contentId,
          schedule_id: scheduleId,
          channel: 'pinterest',
          action: 'published',
          details: { post_id: result.id, post_url: result.url, board_id: resolvedBoard, media_count: mediaUrls.length, pin_type: effectiveType },
        });

        // Persist Pin info on content row for analytics polling + UI
        await supabase
          .from('multi_channel_contents')
          .update({
            pinterest_post_id: result.id,
            pinterest_post_url: result.url,
          })
          .eq('id', contentId);
      }

      return new Response(
        JSON.stringify({
          success: true,
          platform: 'pinterest',
          postId: result.id,
          postUrl: result.url,
          boardId: resolvedBoard,
          message: 'Đã đăng Pin lên Pinterest',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (publishError: any) {
      console.error('[publish-pinterest] publish error', publishError);

      if (attemptId) {
        await supabase
          .from('publish_attempts')
          .update({ status: 'failed', error_message: publishError.message })
          .eq('id', attemptId);
      }
      if (scheduleId) {
        await supabase
          .from('content_schedules')
          .update({ publish_status: 'failed', publish_error: publishError.message })
          .eq('id', scheduleId);
      }
      if (contentId) {
        await supabase.from('content_publishing_logs').insert({
          content_id: contentId,
          schedule_id: scheduleId,
          channel: 'pinterest',
          action: 'failed',
          error_message: publishError.message,
          details: { error: publishError.message, status: publishError.status },
        });
      }
      throw publishError;
    }
  } catch (error: any) {
    console.error('[publish-pinterest] error', error);
    const isTrialAccess = error?.errorCode === PINTEREST_TRIAL_ACCESS_CODE || isPinterestTrialAccessError(error);

    return new Response(
      JSON.stringify({
        success: false,
        platform: 'pinterest',
        error: isTrialAccess ? PINTEREST_TRIAL_ACCESS_MESSAGE : (error.message || 'Failed to publish to Pinterest'),
        errorCode: isTrialAccess ? PINTEREST_TRIAL_ACCESS_CODE : error?.errorCode,
        requiresAction: isTrialAccess ? true : undefined,
        nextSteps: isTrialAccess ? [
          'Vào Pinterest Developer Portal → Apps → Review and approval.',
          'Gửi app xin Standard access với scopes boards:read, pins:write, pins:read, user_accounts:read.',
          'Sau khi Pinterest duyệt, kết nối lại Pinterest rồi đăng Pin thật.',
        ] : undefined,
      }),
      { status: isTrialAccess ? 200 : 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));

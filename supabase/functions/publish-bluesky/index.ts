import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { decryptCredential } from "../_shared/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BSKY_SERVICE = 'https://bsky.social';
const MAX_BLOB_SIZE = 1_000_000; // 1MB Bluesky limit
const MAX_GRAPHEMES = 300;

interface BlueskySession {
  did: string;
  accessJwt: string;
  refreshJwt: string;
  handle: string;
}

// --- Grapheme-safe text utilities ---

function graphemeLength(text: string): number {
  const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
  return [...segmenter.segment(text)].length;
}

function graphemeTruncate(text: string, max: number): string {
  const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
  const segments = [...segmenter.segment(text)];
  if (segments.length <= max) return text;
  return segments.slice(0, max - 1).map(s => s.segment).join('') + '…';
}

// --- Auth ---

async function createSession(identifier: string, password: string): Promise<BlueskySession> {
  const res = await fetch(`${BSKY_SERVICE}/xrpc/com.atproto.server.createSession`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Bluesky auth failed (${res.status}): ${err.slice(0, 200)}`);
  }
  return await res.json();
}

// --- Rich text facets with byte offsets ---

async function resolveDID(handle: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${BSKY_SERVICE}/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (!res.ok) { await res.text(); return null; }
    const data = await res.json();
    return data.did || null;
  } catch {
    return null;
  }
}

async function parseRichTextFacets(text: string): Promise<any[]> {
  const facets: any[] = [];
  const encoder = new TextEncoder();

  // URL detection
  const urlRegex = /https?:\/\/[^\s<>")\]]+/g;
  let match;
  while ((match = urlRegex.exec(text)) !== null) {
    const beforeBytes = encoder.encode(text.slice(0, match.index)).byteLength;
    const matchBytes = encoder.encode(match[0]).byteLength;
    facets.push({
      index: { byteStart: beforeBytes, byteEnd: beforeBytes + matchBytes },
      features: [{ $type: 'app.bsky.richtext.facet#link', uri: match[0] }],
    });
  }

  // Mention detection @handle.bsky.social — resolve DID
  const mentionRegex = /@([a-zA-Z0-9._-]+\.[a-zA-Z]+)/g;
  while ((match = mentionRegex.exec(text)) !== null) {
    const handleStr = match[1];
    const did = await resolveDID(handleStr);
    if (did) {
      const beforeBytes = encoder.encode(text.slice(0, match.index)).byteLength;
      const matchBytes = encoder.encode(match[0]).byteLength;
      facets.push({
        index: { byteStart: beforeBytes, byteEnd: beforeBytes + matchBytes },
        features: [{ $type: 'app.bsky.richtext.facet#mention', did }],
      });
    }
  }

  // Hashtag detection
  const hashtagRegex = /#([a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]+)/g;
  while ((match = hashtagRegex.exec(text)) !== null) {
    const beforeBytes = encoder.encode(text.slice(0, match.index)).byteLength;
    const matchBytes = encoder.encode(match[0]).byteLength;
    facets.push({
      index: { byteStart: beforeBytes, byteEnd: beforeBytes + matchBytes },
      features: [{ $type: 'app.bsky.richtext.facet#tag', tag: match[1] }],
    });
  }

  return facets;
}

// --- Image handling with compression fallback ---

async function downloadAndPrepareImage(imageUrl: string): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  // Try original first
  let imgRes = await fetch(imageUrl);
  if (!imgRes.ok) {
    console.warn(`[publish-bluesky] Failed to download image: ${imgRes.status}`);
    await imgRes.text();
    return null;
  }
  let imageBytes = new Uint8Array(await imgRes.arrayBuffer());
  let contentType = imgRes.headers.get('content-type') || 'image/jpeg';

  // If within limit, return as-is
  if (imageBytes.length <= MAX_BLOB_SIZE) {
    return { bytes: imageBytes, contentType };
  }

  // Try Supabase Storage transform (resize + quality reduction)
  // Pattern: add ?width=1200&quality=75 if the URL is from Supabase Storage
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  if (imageUrl.includes(supabaseUrl) || imageUrl.includes('/storage/v1/')) {
    const separator = imageUrl.includes('?') ? '&' : '?';
    const transformedUrl = `${imageUrl}${separator}width=1200&quality=70`;
    console.log(`[publish-bluesky] Image too large (${imageBytes.length}B), trying transform: ${transformedUrl}`);
    
    try {
      imgRes = await fetch(transformedUrl);
      if (imgRes.ok) {
        imageBytes = new Uint8Array(await imgRes.arrayBuffer());
        contentType = imgRes.headers.get('content-type') || 'image/jpeg';
        if (imageBytes.length <= MAX_BLOB_SIZE) {
          console.log(`[publish-bluesky] Transformed image size: ${imageBytes.length}B — OK`);
          return { bytes: imageBytes, contentType };
        }
      } else {
        await imgRes.text();
      }
    } catch (e) {
      console.warn(`[publish-bluesky] Transform fetch failed: ${e}`);
    }

    // Try even more aggressive quality
    try {
      const aggressiveUrl = `${imageUrl}${separator}width=800&quality=50`;
      imgRes = await fetch(aggressiveUrl);
      if (imgRes.ok) {
        imageBytes = new Uint8Array(await imgRes.arrayBuffer());
        contentType = imgRes.headers.get('content-type') || 'image/jpeg';
        if (imageBytes.length <= MAX_BLOB_SIZE) {
          console.log(`[publish-bluesky] Aggressive transform: ${imageBytes.length}B — OK`);
          return { bytes: imageBytes, contentType };
        }
      } else {
        await imgRes.text();
      }
    } catch (e) {
      console.warn(`[publish-bluesky] Aggressive transform failed: ${e}`);
    }
  }

  console.warn(`[publish-bluesky] Image still too large after transforms (${imageBytes.length}B > ${MAX_BLOB_SIZE}B), skipping`);
  return null;
}

async function uploadBlob(session: BlueskySession, imageUrl: string): Promise<any> {
  const prepared = await downloadAndPrepareImage(imageUrl);
  if (!prepared) return null;

  const uploadRes = await fetch(`${BSKY_SERVICE}/xrpc/com.atproto.repo.uploadBlob`, {
    method: 'POST',
    headers: {
      'Content-Type': prepared.contentType,
      'Authorization': `Bearer ${session.accessJwt}`,
    },
    body: prepared.bytes,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`Blob upload failed (${uploadRes.status}): ${err.slice(0, 200)}`);
  }

  const { blob } = await uploadRes.json();
  return blob;
}

// --- Link card embed (app.bsky.embed.external) ---

function extractFirstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<>")\]]+/);
  return match ? match[0] : null;
}

async function fetchOGMetadata(url: string): Promise<{ title: string; description: string } | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Flowa-Bot/1.0' },
      signal: AbortSignal.timeout(5000),
      redirect: 'follow',
    });
    if (!res.ok) { await res.text(); return null; }
    const html = await res.text();
    
    const titleMatch = html.match(/<meta\s+(?:property|name)="og:title"\s+content="([^"]*)"/) ||
                        html.match(/<title>([^<]*)<\/title>/);
    const descMatch = html.match(/<meta\s+(?:property|name)="og:description"\s+content="([^"]*)"/) ||
                       html.match(/<meta\s+name="description"\s+content="([^"]*)"/);
    
    return {
      title: titleMatch?.[1]?.slice(0, 200) || url,
      description: descMatch?.[1]?.slice(0, 300) || '',
    };
  } catch {
    return null;
  }
}

// --- Main handler ---

Deno.serve(withPerf({ functionName: 'publish-bluesky' }, async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const warnings: string[] = [];

  try {
    const supabase = getServiceClient();
    const { connectionId, content, mediaUrls, contentId, scheduleId, altText } = await req.json();

    if (!connectionId || !content) {
      return new Response(JSON.stringify({ error: 'connectionId và content là bắt buộc' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get connection
    const { data: connection, error: connErr } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('platform', 'bluesky')
      .single();

    if (connErr || !connection) {
      return new Response(JSON.stringify({ error: 'Không tìm thấy kết nối Bluesky' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Decrypt credentials
    const handle = await decryptCredential(connection.access_token);
    const appPassword = await decryptCredential(connection.refresh_token);

    if (!handle || !appPassword) {
      return new Response(JSON.stringify({ error: 'Không thể giải mã credentials Bluesky' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create session
    const session = await createSession(handle, appPassword);

    // Grapheme-safe truncation (300 grapheme limit)
    let truncatedContent = content;
    const originalLength = graphemeLength(content);
    if (originalLength > MAX_GRAPHEMES) {
      truncatedContent = graphemeTruncate(content, MAX_GRAPHEMES);
      warnings.push(`Nội dung bị cắt từ ${originalLength} xuống ${MAX_GRAPHEMES} graphemes`);
    }

    // Build post record
    const record: any = {
      $type: 'app.bsky.feed.post',
      text: truncatedContent,
      createdAt: new Date().toISOString(),
    };

    // Add rich text facets (with DID resolution for mentions)
    const facets = await parseRichTextFacets(truncatedContent);
    if (facets.length > 0) {
      record.facets = facets;
    }

    // Upload images (max 4) with auto-compression
    const hasImages = mediaUrls && Array.isArray(mediaUrls) && mediaUrls.length > 0;
    if (hasImages) {
      const images: any[] = [];
      let imageIndex = 0;
      for (const url of mediaUrls.slice(0, 4)) {
        try {
          const blob = await uploadBlob(session, url);
          if (blob) {
            // Auto alt text: use provided altText, or content snippet for first image
            const autoAlt = imageIndex === 0
              ? (altText || graphemeTruncate(content, 200))
              : (altText || '');
            images.push({ alt: autoAlt, image: blob });
          } else {
            warnings.push(`Ảnh ${imageIndex + 1} bị bỏ qua (quá lớn sau khi nén)`);
          }
        } catch (e) {
          console.warn(`[publish-bluesky] Failed to upload image ${imageIndex + 1}: ${e}`);
          warnings.push(`Ảnh ${imageIndex + 1} upload thất bại: ${(e as Error).message?.slice(0, 100)}`);
        }
        imageIndex++;
      }
      if (images.length > 0) {
        record.embed = {
          $type: 'app.bsky.embed.images',
          images,
        };
      }
    }

    // Link card embed — only when NO images and text contains a URL
    if (!record.embed) {
      const firstUrl = extractFirstUrl(truncatedContent);
      if (firstUrl) {
        const og = await fetchOGMetadata(firstUrl);
        record.embed = {
          $type: 'app.bsky.embed.external',
          external: {
            uri: firstUrl,
            title: og?.title || firstUrl,
            description: og?.description || '',
          },
        };
      }
    }

    // Create post
    const postRes = await fetch(`${BSKY_SERVICE}/xrpc/com.atproto.repo.createRecord`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.accessJwt}`,
      },
      body: JSON.stringify({
        repo: session.did,
        collection: 'app.bsky.feed.post',
        record,
      }),
    });

    if (!postRes.ok) {
      const err = await postRes.text();
      throw new Error(`Đăng bài thất bại (${postRes.status}): ${err.slice(0, 300)}`);
    }

    const postResult = await postRes.json();
    const postUri = postResult.uri;
    const postUrl = `https://bsky.app/profile/${session.handle}/post/${postUri.split('/').pop()}`;

    // Update last_used_at
    await supabase.from('social_connections')
      .update({ last_used_at: new Date().toISOString(), last_error: null })
      .eq('id', connectionId);

    // Update multi_channel_contents if contentId provided
    if (contentId) {
      await supabase.from('multi_channel_contents')
        .update({ bluesky_post_id: postUri, bluesky_post_url: postUrl })
        .eq('id', contentId);
    }

    // Log publishing
    if (contentId) {
      await supabase.from('publishing_logs').insert({
        content_id: contentId,
        channel: 'bluesky',
        status: 'published',
        platform_post_id: postUri,
        platform_post_url: postUrl,
        published_at: new Date().toISOString(),
        organization_id: connection.organization_id,
        schedule_id: scheduleId || null,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      postId: postUri,
      postUrl,
      cid: postResult.cid,
      warnings: warnings.length > 0 ? warnings : undefined,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[publish-bluesky] error:', err);
    return new Response(JSON.stringify({
      success: false,
      error: err instanceof Error ? err.message : 'Lỗi không xác định',
      warnings: warnings.length > 0 ? warnings : undefined,
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}));

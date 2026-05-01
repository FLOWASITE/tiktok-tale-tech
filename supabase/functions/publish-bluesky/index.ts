import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { decryptCredential } from "../_shared/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BSKY_SERVICE = 'https://bsky.social';

interface BlueskySession {
  did: string;
  accessJwt: string;
  refreshJwt: string;
  handle: string;
}

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

/** Parse URLs in text and return rich text facets with byte offsets */
function parseRichTextFacets(text: string): any[] {
  const facets: any[] = [];
  const encoder = new TextEncoder();

  // URL detection
  const urlRegex = /https?:\/\/[^\s<>\"]+/g;
  let match;
  while ((match = urlRegex.exec(text)) !== null) {
    const beforeBytes = encoder.encode(text.slice(0, match.index)).byteLength;
    const matchBytes = encoder.encode(match[0]).byteLength;
    facets.push({
      index: { byteStart: beforeBytes, byteEnd: beforeBytes + matchBytes },
      features: [{ $type: 'app.bsky.richtext.facet#link', uri: match[0] }],
    });
  }

  // Mention detection @handle.bsky.social
  const mentionRegex = /@([a-zA-Z0-9._-]+\.[a-zA-Z]+)/g;
  while ((match = mentionRegex.exec(text)) !== null) {
    const beforeBytes = encoder.encode(text.slice(0, match.index)).byteLength;
    const matchBytes = encoder.encode(match[0]).byteLength;
    facets.push({
      index: { byteStart: beforeBytes, byteEnd: beforeBytes + matchBytes },
      features: [{ $type: 'app.bsky.richtext.facet#mention', did: '' }], // DID resolved later if needed
    });
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

async function uploadBlob(session: BlueskySession, imageUrl: string): Promise<any> {
  // Download image
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`Failed to download image: ${imgRes.status}`);
  const imageBytes = new Uint8Array(await imgRes.arrayBuffer());
  const contentType = imgRes.headers.get('content-type') || 'image/jpeg';

  // Upload to Bluesky (max 1MB)
  if (imageBytes.length > 1_000_000) {
    console.warn(`[publish-bluesky] Image too large (${imageBytes.length} bytes), skipping`);
    return null;
  }

  const uploadRes = await fetch(`${BSKY_SERVICE}/xrpc/com.atproto.repo.uploadBlob`, {
    method: 'POST',
    headers: {
      'Content-Type': contentType,
      'Authorization': `Bearer ${session.accessJwt}`,
    },
    body: imageBytes,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`Blob upload failed (${uploadRes.status}): ${err.slice(0, 200)}`);
  }

  const { blob } = await uploadRes.json();
  return blob;
}

Deno.serve(withPerf({ functionName: 'publish-bluesky' }, async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = getServiceClient();
    const { connectionId, content, mediaUrls, contentId, scheduleId } = await req.json();

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
    const handle = await decryptCredential(connection.access_token); // stored as handle
    const appPassword = await decryptCredential(connection.refresh_token); // stored as app password

    if (!handle || !appPassword) {
      return new Response(JSON.stringify({ error: 'Không thể giải mã credentials Bluesky' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create session
    const session = await createSession(handle, appPassword);

    // Truncate content to 300 chars (graphemes)
    const truncatedContent = content.length > 300 ? content.slice(0, 297) + '...' : content;

    // Build post record
    const record: any = {
      $type: 'app.bsky.feed.post',
      text: truncatedContent,
      createdAt: new Date().toISOString(),
    };

    // Add rich text facets
    const facets = parseRichTextFacets(truncatedContent);
    if (facets.length > 0) {
      record.facets = facets;
    }

    // Upload images (max 4)
    if (mediaUrls && Array.isArray(mediaUrls) && mediaUrls.length > 0) {
      const images: any[] = [];
      for (const url of mediaUrls.slice(0, 4)) {
        try {
          const blob = await uploadBlob(session, url);
          if (blob) {
            images.push({ alt: '', image: blob });
          }
        } catch (e) {
          console.warn(`[publish-bluesky] Failed to upload image: ${e}`);
        }
      }
      if (images.length > 0) {
        record.embed = {
          $type: 'app.bsky.embed.images',
          images,
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
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[publish-bluesky] error:', err);
    return new Response(JSON.stringify({
      success: false,
      error: err instanceof Error ? err.message : 'Lỗi không xác định',
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}));

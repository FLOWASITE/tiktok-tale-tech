import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { decryptCredential } from "../_shared/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BSKY_SERVICE = 'https://bsky.social';
const MAX_BLOB_SIZE = 1_000_000; // 1MB Bluesky limit
const MAX_GRAPHEMES = 300;
const MAX_BYTES = 3000; // AT Protocol app.bsky.feed.post text byte limit

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

function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

/**
 * Truncate text so it satisfies BOTH grapheme limit AND UTF-8 byte limit.
 * Reserves room for ellipsis "…" (3 bytes UTF-8, 1 grapheme) when truncated.
 */
function graphemeTruncate(text: string, maxGraphemes: number, maxBytes: number = MAX_BYTES): string {
  const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
  const segments = [...segmenter.segment(text)].map(s => s.segment);
  const fitsGraphemes = segments.length <= maxGraphemes;
  const fitsBytes = utf8ByteLength(text) <= maxBytes;
  if (fitsGraphemes && fitsBytes) return text;

  const ellipsis = '…';
  const ellipsisBytes = utf8ByteLength(ellipsis);
  const targetGraphemes = maxGraphemes - 1; // reserve 1 for "…"
  const targetBytes = maxBytes - ellipsisBytes;

  let acc = '';
  let count = 0;
  for (const seg of segments) {
    if (count + 1 > targetGraphemes) break;
    const next = acc + seg;
    if (utf8ByteLength(next) > targetBytes) break;
    acc = next;
    count++;
  }
  return acc + ellipsis;
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

// Bluesky hashtag rules: max 64 chars, alnum/underscore/diacritics, no leading digit-only.
const MAX_TAG_LEN = 64;

interface RawFacet {
  byteStart: number;
  byteEnd: number;
  feature: any;
  needsResolve?: { handle: string };
}

async function parseRichTextFacets(text: string): Promise<any[]> {
  const encoder = new TextEncoder();
  const raw: RawFacet[] = [];
  // Track byte ranges already claimed (URL > mention > hashtag) to avoid overlap
  // (e.g. `#tag` inside a URL, or `@user.com` inside a URL).
  const claimed: Array<[number, number]> = [];
  const overlaps = (s: number, e: number) =>
    claimed.some(([cs, ce]) => s < ce && e > cs);
  const claim = (s: number, e: number) => claimed.push([s, e]);

  const byteRange = (matchIndex: number, matchStr: string): [number, number] => {
    const start = encoder.encode(text.slice(0, matchIndex)).byteLength;
    const end = start + encoder.encode(matchStr).byteLength;
    return [start, end];
  };

  // 1. URLs (full http/https first — highest precedence)
  const urlRegex = /https?:\/\/[^\s<>")\]]+/g;
  // Trim trailing punctuation (., ,, ;, !, ?, :) that AT Protocol typically excludes.
  const trimUrlTail = (u: string) => u.replace(/[.,;:!?)\]]+$/, '');
  let m: RegExpExecArray | null;
  while ((m = urlRegex.exec(text)) !== null) {
    const cleaned = trimUrlTail(m[0]);
    const [s, e] = byteRange(m.index, cleaned);
    if (overlaps(s, e)) continue;
    claim(s, e);
    raw.push({
      byteStart: s,
      byteEnd: e,
      feature: { $type: 'app.bsky.richtext.facet#link', uri: cleaned },
    });
  }

  // 2. Bare domains (no scheme) — common in Bluesky. Conservative TLDs only.
  // Avoid matching things inside emails or already-claimed URLs.
  const bareDomainRegex = /(?:^|[\s(])((?:[a-z0-9-]+\.)+(?:com|net|org|io|ai|co|app|dev|xyz|one|vn|me|so|cloud|tech|store|shop|blog|news|info|gg|to)(?:\/[^\s<>")\]]*)?)/gi;
  while ((m = bareDomainRegex.exec(text)) !== null) {
    const domain = trimUrlTail(m[1]);
    // Skip if preceded by '@' (email) or '/' (path fragment) or '.' (sub).
    const prevChar = text[m.index + m[0].indexOf(m[1]) - 1] || '';
    if (prevChar === '@' || prevChar === '/' || prevChar === '.') continue;
    const idx = m.index + m[0].indexOf(m[1]);
    const [s, e] = byteRange(idx, domain);
    if (overlaps(s, e)) continue;
    claim(s, e);
    raw.push({
      byteStart: s,
      byteEnd: e,
      feature: { $type: 'app.bsky.richtext.facet#link', uri: `https://${domain}` },
    });
  }

  // 3. Mentions @handle.tld — collect first, resolve DIDs in parallel.
  const mentionRegex = /@([a-zA-Z0-9][a-zA-Z0-9._-]*\.[a-zA-Z][a-zA-Z0-9.-]*)/g;
  const mentionCandidates: Array<{ s: number; e: number; handle: string }> = [];
  while ((m = mentionRegex.exec(text)) !== null) {
    const cleanedHandle = m[1].replace(/[.]+$/, '');
    const [s, e] = byteRange(m.index, '@' + cleanedHandle);
    if (overlaps(s, e)) continue;
    mentionCandidates.push({ s, e, handle: cleanedHandle });
  }
  const dids = await Promise.all(mentionCandidates.map(c => resolveDID(c.handle)));
  mentionCandidates.forEach((c, i) => {
    const did = dids[i];
    if (!did) return;
    claim(c.s, c.e);
    raw.push({
      byteStart: c.s,
      byteEnd: c.e,
      feature: { $type: 'app.bsky.richtext.facet#mention', did },
    });
  });

  // 4. Hashtags — Vietnamese diacritics supported, strip leading digits, cap 64 chars.
  const hashtagRegex = /#([a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF\u00C0-\u1EF9]+)/g;
  while ((m = hashtagRegex.exec(text)) !== null) {
    let tag = m[1];
    // Reject pure-numeric tags (Bluesky convention)
    if (/^\d+$/.test(tag)) continue;
    if (tag.length > MAX_TAG_LEN) tag = tag.slice(0, MAX_TAG_LEN);
    const [s, e] = byteRange(m.index, '#' + tag);
    if (overlaps(s, e)) continue;
    claim(s, e);
    raw.push({
      byteStart: s,
      byteEnd: e,
      feature: { $type: 'app.bsky.richtext.facet#tag', tag },
    });
  }

  // 5. Sort by byteStart (AT Protocol expects ordered facets)
  raw.sort((a, b) => a.byteStart - b.byteStart);

  return raw.map(r => ({
    index: { byteStart: r.byteStart, byteEnd: r.byteEnd },
    features: [r.feature],
  }));
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

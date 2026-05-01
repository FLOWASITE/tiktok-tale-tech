import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { encrypt, decrypt } from "../_shared/crypto.ts";
import {
  importDpopPrivateJwk,
  refreshAccessToken,
  pdsFetch,
  type AuthServerMetadata,
  type DpopKey,
} from "../_shared/bluesky-oauth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_BLOB_SIZE = 1_000_000; // 1MB Bluesky limit
const MAX_GRAPHEMES = 300;
const MAX_BYTES = 3000;

// =====================================================================
// Auth context for publish session (OAuth-based)
// =====================================================================

interface PublishCtx {
  did: string;
  handle: string;
  pdsUrl: string;
  accessToken: string;
  dpopKey: DpopKey;
  dpopNonce?: string;
  connectionId: string;
}

class BlueskyReconnectRequiredError extends Error {
  status = 401;
  errorCode = "BLUESKY_REAUTH_REQUIRED";

  constructor(message = "Phiên Bluesky đã hết hạn. Vui lòng kết nối lại Bluesky.") {
    super(message);
    this.name = "BlueskyReconnectRequiredError";
  }
}

function isInvalidRefreshTokenError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || "");
  return /invalid_grant|refresh token replayed|invalid refresh token/i.test(message);
}

async function loadOAuthContext(supabase: any, connectionId: string): Promise<PublishCtx> {
  // Refresh lock TTL — concurrent publishes wait this long for the leader to finish
  const REFRESH_LOCK_TTL_MS = 15_000;
  const REFRESH_WAIT_POLL_MS = 400;
  const REFRESH_WAIT_MAX_MS = 12_000;

  async function fetchConn() {
    const { data, error } = await supabase
      .from("social_connections").select("*").eq("id", connectionId).eq("platform", "bluesky").single();
    if (error || !data) throw new Error("Không tìm thấy kết nối Bluesky");
    return data;
  }

  async function buildContextFromConn(row: any, accessTokenOverride?: string): Promise<PublishCtx> {
    const rowMeta = row.metadata || {};
    if (!rowMeta.token_endpoint || !rowMeta.dpop_jwk_encrypted || !rowMeta.pds_url) {
      throw new Error("Kết nối Bluesky cũ (App Password) không còn được hỗ trợ. Vui lòng kết nối lại bằng OAuth.");
    }
    const dpopJwkPlain = await decrypt(rowMeta.dpop_jwk_encrypted);
    const dpopJwk = JSON.parse(dpopJwkPlain);
    const dpopKey = await importDpopPrivateJwk(dpopJwk);
    return {
      did: rowMeta.did || row.platform_user_id,
      handle: row.platform_username,
      pdsUrl: String(rowMeta.pds_url).replace(/\/$/, ""),
      accessToken: accessTokenOverride || await decrypt(row.access_token),
      dpopKey,
      dpopNonce: rowMeta.dpop_nonce || undefined,
      connectionId,
    };
  }

  async function waitForFreshToken(previousUpdatedAt?: string): Promise<PublishCtx | null> {
    const startedAt = Date.now();
    while (Date.now() - startedAt < REFRESH_WAIT_MAX_MS) {
      await new Promise((r) => setTimeout(r, REFRESH_WAIT_POLL_MS));
      const freshConn = await fetchConn();
      const expiresAtMs = freshConn.token_expires_at ? new Date(freshConn.token_expires_at).getTime() : 0;
      const rowChanged = previousUpdatedAt && freshConn.updated_at && freshConn.updated_at !== previousUpdatedAt;
      if (rowChanged && expiresAtMs - Date.now() > 60_000) {
        return await buildContextFromConn(freshConn);
      }
    }
    return null;
  }

  let conn = await fetchConn();
  let meta = conn.metadata || {};
  if (!meta.token_endpoint || !meta.dpop_jwk_encrypted || !meta.pds_url) {
    throw new Error("Kết nối Bluesky cũ (App Password) không còn được hỗ trợ. Vui lòng kết nối lại bằng OAuth.");
  }

  const dpopJwkPlain = await decrypt(meta.dpop_jwk_encrypted);
  const dpopJwk = JSON.parse(dpopJwkPlain);
  const dpopKey = await importDpopPrivateJwk(dpopJwk);

  const needsRefresh = () => {
    const expiresAtMs = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : 0;
    return !expiresAtMs || expiresAtMs - Date.now() < 60_000;
  };

  if (needsRefresh()) {
    // Try to claim the refresh lock atomically. Only ONE concurrent request will succeed.
    const lockUntil = new Date(Date.now() + REFRESH_LOCK_TTL_MS).toISOString();
    const previousLock = meta.refresh_lock_until || null;
    const lockExpired = !previousLock || new Date(previousLock).getTime() < Date.now();

    let claimed = false;
    if (lockExpired) {
      // Use updated_at version of the row as compare-and-swap proxy
      const { data: claimRow, error: claimErr } = await supabase
        .from("social_connections")
        .update({ metadata: { ...meta, refresh_lock_until: lockUntil } })
        .eq("id", connectionId)
        .eq("updated_at", conn.updated_at)
        .select("id")
        .maybeSingle();
      claimed = !claimErr && !!claimRow;
    }

    if (claimed) {
      console.log(`[publish-bluesky] Claimed refresh lock, refreshing token...`);
      try {
        const refreshTokenPlain = await decrypt(conn.refresh_token);
        const authServer: AuthServerMetadata = {
          issuer: meta.authz_issuer,
          authorization_endpoint: "",
          token_endpoint: meta.token_endpoint,
          pushed_authorization_request_endpoint: "",
        };
        const newToken = await refreshAccessToken({
          authServer, refreshToken: refreshTokenPlain, dpopKey,
          initialNonce: meta.dpop_nonce || undefined,
        });

        const nextMeta = { ...meta, dpop_nonce: newToken.dpop_nonce || meta.dpop_nonce, refresh_lock_until: null };
        const { error: saveErr } = await supabase.from("social_connections").update({
          access_token: await encrypt(newToken.access_token),
          refresh_token: await encrypt(newToken.refresh_token),
          token_expires_at: new Date(newToken.expires_at).toISOString(),
          last_error: null,
          metadata: nextMeta,
        }).eq("id", connectionId);
        if (saveErr) throw new Error(`Không lưu được token Bluesky mới: ${saveErr.message}`);

        return {
          did: meta.did || conn.platform_user_id,
          handle: conn.platform_username,
          pdsUrl: String(meta.pds_url).replace(/\/$/, ""),
          accessToken: newToken.access_token,
          dpopKey,
          dpopNonce: newToken.dpop_nonce || meta.dpop_nonce || undefined,
          connectionId,
        };
      } catch (e) {
        if (isInvalidRefreshTokenError(e)) {
          const recovered = await waitForFreshToken(conn.updated_at);
          if (recovered) return recovered;
        }
        const reconnectMsg = isInvalidRefreshTokenError(e)
          ? "Phiên Bluesky đã hết hạn hoặc refresh token đã bị dùng lại. Vui lòng ngắt kết nối và kết nối lại Bluesky."
          : undefined;
        // Release lock on failure so the next request can retry
        await supabase.from("social_connections")
          .update({
            metadata: { ...meta, refresh_lock_until: null },
            ...(reconnectMsg ? { is_active: false, last_error: reconnectMsg } : {}),
          })
          .eq("id", connectionId);
        if (reconnectMsg) throw new BlueskyReconnectRequiredError(reconnectMsg);
        throw e;
      }
    } else {
      // Another worker is refreshing — poll until token is updated
      console.log(`[publish-bluesky] Another worker is refreshing, waiting...`);
      const startedAt = Date.now();
      while (Date.now() - startedAt < REFRESH_WAIT_MAX_MS) {
        await new Promise((r) => setTimeout(r, REFRESH_WAIT_POLL_MS));
        conn = await fetchConn();
        meta = conn.metadata || {};
        if (!needsRefresh()) break;
      }
      if (needsRefresh()) {
        throw new Error("Timeout chờ refresh token Bluesky từ request khác");
      }
    }
  }

  return await buildContextFromConn(conn);
}

async function persistNonce(supabase: any, connectionId: string, nonce: string | undefined) {
  if (!nonce) return;
  const { data: conn } = await supabase.from("social_connections").select("metadata").eq("id", connectionId).single();
  const meta = conn?.metadata || {};
  if (meta.dpop_nonce === nonce) return;
  await supabase.from("social_connections").update({
    metadata: { ...meta, dpop_nonce: nonce },
  }).eq("id", connectionId);
}

// =====================================================================
// Text utilities (unchanged from original)
// =====================================================================

function graphemeLength(text: string): number {
  const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
  return [...segmenter.segment(text)].length;
}

function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

function graphemeTruncate(text: string, maxGraphemes: number, maxBytes: number = MAX_BYTES): string {
  const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
  const segments = [...segmenter.segment(text)].map(s => s.segment);
  const fitsGraphemes = segments.length <= maxGraphemes;
  const fitsBytes = utf8ByteLength(text) <= maxBytes;
  if (fitsGraphemes && fitsBytes) return text;

  const ellipsis = '…';
  const ellipsisBytes = utf8ByteLength(ellipsis);
  const targetGraphemes = maxGraphemes - 1;
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

// =====================================================================
// Rich text facets — resolve handles via PUBLIC appview (no auth needed)
// =====================================================================

async function resolveDID(handle: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (!res.ok) { await res.text(); return null; }
    const data = await res.json();
    return data.did || null;
  } catch {
    return null;
  }
}

const MAX_TAG_LEN = 64;

interface RawFacet {
  byteStart: number;
  byteEnd: number;
  feature: any;
}

async function parseRichTextFacets(text: string): Promise<any[]> {
  const encoder = new TextEncoder();
  const raw: RawFacet[] = [];
  const claimed: Array<[number, number]> = [];
  const overlaps = (s: number, e: number) => claimed.some(([cs, ce]) => s < ce && e > cs);
  const claim = (s: number, e: number) => claimed.push([s, e]);

  const byteRange = (matchIndex: number, matchStr: string): [number, number] => {
    const start = encoder.encode(text.slice(0, matchIndex)).byteLength;
    const end = start + encoder.encode(matchStr).byteLength;
    return [start, end];
  };

  const trimUrlTail = (u: string) => u.replace(/[.,;:!?)\]]+$/, '');

  // 1. URLs
  const urlRegex = /https?:\/\/[^\s<>")\]]+/g;
  let m: RegExpExecArray | null;
  while ((m = urlRegex.exec(text)) !== null) {
    const cleaned = trimUrlTail(m[0]);
    const [s, e] = byteRange(m.index, cleaned);
    if (overlaps(s, e)) continue;
    claim(s, e);
    raw.push({ byteStart: s, byteEnd: e, feature: { $type: 'app.bsky.richtext.facet#link', uri: cleaned } });
  }

  // 2. Bare domains
  const bareDomainRegex = /(?:^|[\s(])((?:[a-z0-9-]+\.)+(?:com|net|org|io|ai|co|app|dev|xyz|one|vn|me|so|cloud|tech|store|shop|blog|news|info|gg|to)(?:\/[^\s<>")\]]*)?)/gi;
  while ((m = bareDomainRegex.exec(text)) !== null) {
    const domain = trimUrlTail(m[1]);
    const prevChar = text[m.index + m[0].indexOf(m[1]) - 1] || '';
    if (prevChar === '@' || prevChar === '/' || prevChar === '.') continue;
    const idx = m.index + m[0].indexOf(m[1]);
    const [s, e] = byteRange(idx, domain);
    if (overlaps(s, e)) continue;
    claim(s, e);
    raw.push({ byteStart: s, byteEnd: e, feature: { $type: 'app.bsky.richtext.facet#link', uri: `https://${domain}` } });
  }

  // 3. Mentions
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
    raw.push({ byteStart: c.s, byteEnd: c.e, feature: { $type: 'app.bsky.richtext.facet#mention', did } });
  });

  // 4. Hashtags
  const hashtagRegex = /#([a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF\u00C0-\u1EF9]+)/g;
  while ((m = hashtagRegex.exec(text)) !== null) {
    let tag = m[1];
    if (/^\d+$/.test(tag)) continue;
    if (tag.length > MAX_TAG_LEN) tag = tag.slice(0, MAX_TAG_LEN);
    const [s, e] = byteRange(m.index, '#' + tag);
    if (overlaps(s, e)) continue;
    claim(s, e);
    raw.push({ byteStart: s, byteEnd: e, feature: { $type: 'app.bsky.richtext.facet#tag', tag } });
  }

  raw.sort((a, b) => a.byteStart - b.byteStart);
  return raw.map(r => ({
    index: { byteStart: r.byteStart, byteEnd: r.byteEnd },
    features: [r.feature],
  }));
}

// =====================================================================
// Image handling
// =====================================================================

async function downloadAndPrepareImage(imageUrl: string): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  let imgRes = await fetch(imageUrl);
  if (!imgRes.ok) {
    console.warn(`[publish-bluesky] Failed to download image: ${imgRes.status}`);
    await imgRes.text();
    return null;
  }
  let imageBytes = new Uint8Array(await imgRes.arrayBuffer());
  let contentType = imgRes.headers.get('content-type') || 'image/jpeg';

  if (imageBytes.length <= MAX_BLOB_SIZE) return { bytes: imageBytes, contentType };

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  if (imageUrl.includes(supabaseUrl) || imageUrl.includes('/storage/v1/')) {
    const separator = imageUrl.includes('?') ? '&' : '?';
    for (const params of [`width=1200&quality=70`, `width=800&quality=50`]) {
      try {
        imgRes = await fetch(`${imageUrl}${separator}${params}`);
        if (imgRes.ok) {
          imageBytes = new Uint8Array(await imgRes.arrayBuffer());
          contentType = imgRes.headers.get('content-type') || 'image/jpeg';
          if (imageBytes.length <= MAX_BLOB_SIZE) return { bytes: imageBytes, contentType };
        } else { await imgRes.text(); }
      } catch (e) { console.warn(`[publish-bluesky] Transform fetch failed: ${e}`); }
    }
  }

  console.warn(`[publish-bluesky] Image still too large (${imageBytes.length}B), skipping`);
  return null;
}

async function uploadBlob(ctx: PublishCtx, supabase: any, imageUrl: string): Promise<any> {
  const prepared = await downloadAndPrepareImage(imageUrl);
  if (!prepared) return null;

  const { response, newNonce } = await pdsFetch({
    url: `${ctx.pdsUrl}/xrpc/com.atproto.repo.uploadBlob`,
    method: "POST",
    accessToken: ctx.accessToken,
    dpopKey: ctx.dpopKey,
    nonce: ctx.dpopNonce,
    body: prepared.bytes,
    contentType: prepared.contentType,
  });
  if (newNonce) { ctx.dpopNonce = newNonce; await persistNonce(supabase, ctx.connectionId, newNonce); }

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Blob upload failed (${response.status}): ${err.slice(0, 200)}`);
  }
  const { blob } = await response.json();
  return blob;
}

// =====================================================================
// Link card embed
// =====================================================================

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
  } catch { return null; }
}

// =====================================================================
// Main handler
// =====================================================================

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

    // Load OAuth context (auto-refreshes token if needed)
    const ctx = await loadOAuthContext(supabase, connectionId);

    // Truncate
    let truncatedContent = content;
    const originalLength = graphemeLength(content);
    const originalBytes = utf8ByteLength(content);
    if (originalLength > MAX_GRAPHEMES || originalBytes > MAX_BYTES) {
      truncatedContent = graphemeTruncate(content, MAX_GRAPHEMES, MAX_BYTES);
      warnings.push(
        `Nội dung bị cắt: ${originalLength}g/${originalBytes}b → ${graphemeLength(truncatedContent)}g/${utf8ByteLength(truncatedContent)}b (giới hạn ${MAX_GRAPHEMES}g/${MAX_BYTES}b)`
      );
    }
    console.log(`[publish-bluesky] text: ${graphemeLength(truncatedContent)}g, ${utf8ByteLength(truncatedContent)}b`);

    const record: any = {
      $type: 'app.bsky.feed.post',
      text: truncatedContent,
      createdAt: new Date().toISOString(),
    };

    const facets = await parseRichTextFacets(truncatedContent);
    if (facets.length > 0) record.facets = facets;

    // Images
    const hasImages = mediaUrls && Array.isArray(mediaUrls) && mediaUrls.length > 0;
    if (hasImages) {
      const images: any[] = [];
      let imageIndex = 0;
      for (const url of mediaUrls.slice(0, 4)) {
        try {
          const blob = await uploadBlob(ctx, supabase, url);
          if (blob) {
            const autoAlt = imageIndex === 0
              ? (altText || graphemeTruncate(content, 200))
              : (altText || '');
            images.push({ alt: autoAlt, image: blob });
          } else {
            warnings.push(`Ảnh ${imageIndex + 1} bị bỏ qua (quá lớn sau khi nén)`);
          }
        } catch (e) {
          console.warn(`[publish-bluesky] Image ${imageIndex + 1} upload failed: ${e}`);
          warnings.push(`Ảnh ${imageIndex + 1} upload thất bại: ${(e as Error).message?.slice(0, 100)}`);
        }
        imageIndex++;
      }
      if (images.length > 0) {
        record.embed = { $type: 'app.bsky.embed.images', images };
      }
    }

    // External link card
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

    // Create post via DPoP-authenticated PDS call
    const { response: postRes, newNonce: pNonce } = await pdsFetch({
      url: `${ctx.pdsUrl}/xrpc/com.atproto.repo.createRecord`,
      method: "POST",
      accessToken: ctx.accessToken,
      dpopKey: ctx.dpopKey,
      nonce: ctx.dpopNonce,
      body: JSON.stringify({ repo: ctx.did, collection: 'app.bsky.feed.post', record }),
      contentType: "application/json",
    });
    if (pNonce) { ctx.dpopNonce = pNonce; await persistNonce(supabase, ctx.connectionId, pNonce); }

    if (!postRes.ok) {
      const err = await postRes.text();
      throw new Error(`Đăng bài thất bại (${postRes.status}): ${err.slice(0, 300)}`);
    }

    const postResult = await postRes.json();
    const postUri = postResult.uri;
    const postUrl = `https://bsky.app/profile/${ctx.handle}/post/${postUri.split('/').pop()}`;

    await supabase.from('social_connections')
      .update({ last_used_at: new Date().toISOString(), last_error: null })
      .eq('id', connectionId);

    if (contentId) {
      await supabase.from('multi_channel_contents')
        .update({ bluesky_post_id: postUri, bluesky_post_url: postUrl })
        .eq('id', contentId);

      const { data: conn } = await supabase.from("social_connections").select("organization_id").eq("id", connectionId).single();
      await supabase.from('publishing_logs').insert({
        content_id: contentId,
        channel: 'bluesky',
        status: 'published',
        platform_post_id: postUri,
        platform_post_url: postUrl,
        published_at: new Date().toISOString(),
        organization_id: conn?.organization_id,
        schedule_id: scheduleId || null,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      postId: postUri,
      postUrl,
      cid: postResult.cid,
      warnings: warnings.length > 0 ? warnings : undefined,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('[publish-bluesky] error:', err);
    return new Response(JSON.stringify({
      success: false,
      error: err instanceof Error ? err.message : 'Lỗi không xác định',
      warnings: warnings.length > 0 ? warnings : undefined,
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}));

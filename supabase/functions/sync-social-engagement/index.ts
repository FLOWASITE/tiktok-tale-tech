// Sync social engagement metrics from platforms (FB, IG, LinkedIn, TikTok, X)
// Triggered by pg_cron every 6 hours OR manually by user
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildOAuth1Header } from "../_shared/oauth1a.ts";
import { decryptCredential } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Try-decrypt: token có thể đã plain hoặc đã encrypted
async function safeDecrypt(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  try {
    return await decryptCredential(value);
  } catch {
    return value; // fallback - đã là plain
  }
}

interface PostRef {
  content_id: string | null;
  organization_id: string;
  channel: string;
  post_id: string;
  performed_at: string;
}

// ---------- Platform fetchers ----------

async function fetchFacebookMetrics(accessToken: string, postId: string) {
  // Insights endpoint for page posts
  const url = `https://graph.facebook.com/v21.0/${postId}/insights?metric=post_impressions,post_impressions_unique,post_reactions_by_type_total,post_clicks&access_token=${accessToken}`;
  const r = await fetch(url);
  if (!r.ok) return null;
  const data = await r.json();
  const map: Record<string, number> = {};
  for (const m of data.data ?? []) {
    map[m.name] = m.values?.[0]?.value ?? 0;
  }

  // Get likes/comments/shares from main post
  const r2 = await fetch(
    `https://graph.facebook.com/v21.0/${postId}?fields=likes.summary(true),comments.summary(true),shares&access_token=${accessToken}`,
  );
  let likes = 0, comments = 0, shares = 0;
  if (r2.ok) {
    const post = await r2.json();
    likes = post.likes?.summary?.total_count ?? 0;
    comments = post.comments?.summary?.total_count ?? 0;
    shares = post.shares?.count ?? 0;
  }

  return {
    impressions: map["post_impressions"] ?? 0,
    reach: map["post_impressions_unique"] ?? 0,
    likes,
    comments,
    shares,
    link_clicks: map["post_clicks"] ?? 0,
    saves: 0,
    video_views: 0,
    raw: { fb_insights: map },
  };
}

async function fetchInstagramMetrics(accessToken: string, mediaId: string) {
  const url = `https://graph.facebook.com/v21.0/${mediaId}/insights?metric=reach,impressions,likes,comments,shares,saved&access_token=${accessToken}`;
  const r = await fetch(url);
  if (!r.ok) return null;
  const data = await r.json();
  const map: Record<string, number> = {};
  for (const m of data.data ?? []) {
    map[m.name] = m.values?.[0]?.value ?? 0;
  }
  return {
    reach: map["reach"] ?? 0,
    impressions: map["impressions"] ?? 0,
    likes: map["likes"] ?? 0,
    comments: map["comments"] ?? 0,
    shares: map["shares"] ?? 0,
    saves: map["saved"] ?? 0,
    video_views: 0,
    link_clicks: 0,
    raw: { ig_insights: map },
  };
}

async function fetchLinkedInMetrics(accessToken: string, urn: string) {
  // urn format: urn:li:share:xxx or urn:li:ugcPost:xxx
  const r = await fetch(
    `https://api.linkedin.com/rest/socialActions/${encodeURIComponent(urn)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "LinkedIn-Version": "202405",
      },
    },
  );
  if (!r.ok) return null;
  const data = await r.json();
  return {
    reach: 0,
    impressions: 0,
    likes: data.likesSummary?.totalLikes ?? 0,
    comments: data.commentsSummary?.aggregatedTotalComments ?? 0,
    shares: 0,
    saves: 0,
    video_views: 0,
    link_clicks: 0,
    raw: { linkedin: data },
  };
}

async function fetchTikTokMetrics(accessToken: string, videoId: string) {
  const r = await fetch(
    `https://open.tiktokapis.com/v2/video/query/?fields=id,view_count,like_count,comment_count,share_count`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ filters: { video_ids: [videoId] } }),
    },
  );
  if (!r.ok) return null;
  const data = await r.json();
  const v = data.data?.videos?.[0];
  if (!v) return null;
  return {
    reach: 0,
    impressions: v.view_count ?? 0,
    likes: v.like_count ?? 0,
    comments: v.comment_count ?? 0,
    shares: v.share_count ?? 0,
    saves: 0,
    video_views: v.view_count ?? 0,
    link_clicks: 0,
    raw: { tiktok: v },
  };
}

// Twitter/X — public metrics qua API v2 với OAuth 1.0a user context
// Endpoint: GET /2/tweets?ids=<id>&tweet.fields=public_metrics,non_public_metrics
async function fetchTwitterMetrics(args: {
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
  tweetId: string;
}) {
  const { consumerKey, consumerSecret, accessToken, accessTokenSecret, tweetId } = args;
  const baseUrl = "https://api.x.com/2/tweets";
  const queryParams: Record<string, string> = {
    ids: tweetId,
    "tweet.fields": "public_metrics,non_public_metrics,organic_metrics,created_at",
  };

  // Build OAuth header — query params phải tham gia signing
  const authHeader = buildOAuth1Header(
    "GET",
    baseUrl,
    consumerKey,
    consumerSecret,
    accessToken,
    accessTokenSecret,
    queryParams,
  );

  const qs = Object.entries(queryParams)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const r = await fetch(`${baseUrl}?${qs}`, {
    headers: { Authorization: authHeader },
  });

  if (!r.ok) {
    const errText = await r.text().catch(() => "");
    console.warn(`[sync-engagement] twitter ${tweetId} → ${r.status}: ${errText.slice(0, 200)}`);
    return null;
  }

  const data = await r.json();
  const tweet = data?.data?.[0];
  if (!tweet) return null;

  const pub = tweet.public_metrics ?? {};
  const nonPub = tweet.non_public_metrics ?? {};
  const organic = tweet.organic_metrics ?? {};

  // Impressions chỉ có khi authorized user là author của tweet
  const impressions = nonPub.impression_count ?? organic.impression_count ?? 0;
  const videoViews = organic.video_view_count ?? nonPub.video_view_count ?? 0;
  const linkClicks = organic.url_link_clicks ?? nonPub.url_link_clicks ?? 0;

  return {
    reach: 0, // Twitter không expose reach distinct
    impressions,
    likes: pub.like_count ?? 0,
    comments: pub.reply_count ?? 0,
    shares: (pub.retweet_count ?? 0) + (pub.quote_count ?? 0),
    saves: pub.bookmark_count ?? 0,
    video_views: videoViews,
    link_clicks: linkClicks,
    raw: { twitter: { public_metrics: pub, non_public_metrics: nonPub, organic_metrics: organic } },
  };
}

// ---------- Main handler ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startedAt = Date.now();
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Optional: scope sync (manual trigger from UI)
  let scope: { organization_id?: string; brand_template_id?: string } = {};
  try {
    if (req.method === "POST") {
      scope = await req.json().catch(() => ({}));
    }
  } catch (_) { /* noop */ }

  // 1. Build list of recent published posts (last 30 days, max 500)
  const sinceIso = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  let query = supabase
    .from("content_publishing_logs")
    .select("content_id, organization_id, channel, details, performed_at")
    .eq("action", "published")
    .gte("performed_at", sinceIso)
    .order("performed_at", { ascending: false })
    .limit(500);

  // Note: filter scope.organization_id sẽ được áp dụng sau khi backfill org_id
  // (vì 1 số log cũ thiếu organization_id, cần lookup từ multi_channel_contents)

  const { data: logs, error: logsErr } = await query;
  if (logsErr) {
    console.error("[sync-engagement] logs error", logsErr);
    return new Response(JSON.stringify({ error: logsErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Build post list. Một số log cũ thiếu organization_id → backfill từ multi_channel_contents.
  const missingOrgContentIds = new Set<string>();
  type StagedLog = {
    content_id: string | null;
    organization_id: string | null;
    channel: string;
    post_id: string;
    performed_at: string;
  };
  const staged: StagedLog[] = [];

  for (const log of logs ?? []) {
    const d = (log.details ?? {}) as Record<string, unknown>;
    const postId = (d.post_id ?? d.tweet_id ?? d.media_id) as string | undefined;
    if (!postId) continue;
    if (!log.organization_id && log.content_id) {
      missingOrgContentIds.add(log.content_id as string);
    }
    staged.push({
      content_id: log.content_id,
      organization_id: log.organization_id,
      channel: log.channel,
      post_id: postId,
      performed_at: log.performed_at,
    });
  }

  // Backfill org_id từ multi_channel_contents
  const contentOrgMap = new Map<string, string>();
  if (missingOrgContentIds.size > 0) {
    const { data: contents } = await supabase
      .from("multi_channel_contents")
      .select("id, organization_id")
      .in("id", Array.from(missingOrgContentIds));
    for (const c of contents ?? []) {
      if (c.id && c.organization_id) {
        contentOrgMap.set(c.id as string, c.organization_id as string);
      }
    }
  }

  const posts: PostRef[] = [];
  for (const s of staged) {
    const orgId = s.organization_id ?? (s.content_id ? contentOrgMap.get(s.content_id) ?? null : null);
    if (!orgId) continue;
    if (scope.organization_id && orgId !== scope.organization_id) continue;
    posts.push({
      content_id: s.content_id,
      organization_id: orgId,
      channel: s.channel,
      post_id: s.post_id,
      performed_at: s.performed_at,
    });
  }

  // Dedupe by (org, channel, post_id) - keep most recent
  const dedupKey = (p: PostRef) =>
    `${p.organization_id}::${p.channel}::${p.post_id}`;
  const dedupMap = new Map<string, PostRef>();
  for (const p of posts) {
    if (!dedupMap.has(dedupKey(p))) dedupMap.set(dedupKey(p), p);
  }
  const uniquePosts = Array.from(dedupMap.values());

  // 2. Load active connections + map qua brand_template_id để bù khi connection thiếu organization_id
  const orgIds = [...new Set(uniquePosts.map((p) => p.organization_id))];
  const { data: connections } = await supabase
    .from("social_connections")
    .select("id, organization_id, platform, access_token, refresh_token, consumer_key, consumer_secret, brand_template_id, page_id")
    .eq("is_active", true);

  type ConnRow = NonNullable<typeof connections>[number];

  // Lookup org từ brand_template_id để fix các connection legacy thiếu organization_id
  const brandIds = (connections ?? [])
    .filter((c) => !c.organization_id && c.brand_template_id)
    .map((c) => c.brand_template_id as string);
  const brandOrgMap = new Map<string, string>();
  if (brandIds.length) {
    const { data: brands } = await supabase
      .from("brand_templates")
      .select("id, organization_id")
      .in("id", brandIds);
    for (const b of brands ?? []) {
      if (b.id && b.organization_id) brandOrgMap.set(b.id as string, b.organization_id as string);
    }
  }

  const connMap = new Map<string, ConnRow>();
  for (const c of connections ?? []) {
    const effectiveOrg =
      c.organization_id ??
      (c.brand_template_id ? brandOrgMap.get(c.brand_template_id as string) : null);
    if (!effectiveOrg) continue;
    if (orgIds.length && !orgIds.includes(effectiveOrg)) continue;
    const key = `${effectiveOrg}::${c.platform}`;
    // Prefer connection có organization_id thực; chỉ overwrite nếu chưa có
    if (!connMap.has(key)) {
      connMap.set(key, { ...c, organization_id: effectiveOrg });
    }
  }

  const channelToPlatform: Record<string, string> = {
    facebook: "facebook",
    instagram: "instagram",
    linkedin: "linkedin",
    tiktok: "tiktok",
    twitter: "twitter",
    x: "twitter",
    threads: "threads",
  };

  // 3. Fetch metrics in parallel (chunked to avoid rate limits)
  let success = 0, failed = 0, skipped = 0;
  const upserts: any[] = [];

  const CHUNK = 10;
  for (let i = 0; i < uniquePosts.length; i += CHUNK) {
    const chunk = uniquePosts.slice(i, i + CHUNK);
    const results = await Promise.all(
      chunk.map(async (p) => {
        const platform = channelToPlatform[p.channel.toLowerCase()] ?? p.channel.toLowerCase();
        const conn = connMap.get(`${p.organization_id}::${platform}`);
        if (!conn) return { post: p, skip: true };

        try {
          let metrics: {
            reach: number; impressions: number; likes: number; comments: number;
            shares: number; saves: number; video_views: number; link_clicks: number;
            raw: Record<string, unknown>;
          } | null = null;
          switch (platform) {
            case "facebook":
              metrics = await fetchFacebookMetrics(conn.access_token, p.post_id);
              break;
            case "instagram":
              metrics = await fetchInstagramMetrics(conn.access_token, p.post_id);
              break;
            case "linkedin":
              metrics = await fetchLinkedInMetrics(conn.access_token, p.post_id);
              break;
            case "tiktok":
              metrics = await fetchTikTokMetrics(conn.access_token, p.post_id);
              break;
            case "twitter": {
              // Twitter cần OAuth 1.0a: consumer key/secret + access token + token secret
              // accessTokenSecret được lưu ở refresh_token (theo publish-twitter)
              const consumerKey =
                Deno.env.get("TWITTER_CONSUMER_KEY") ||
                (await safeDecrypt(conn.consumer_key));
              const consumerSecret =
                Deno.env.get("TWITTER_CONSUMER_SECRET") ||
                (await safeDecrypt(conn.consumer_secret));
              const accessToken = await safeDecrypt(conn.access_token);
              const accessTokenSecret = await safeDecrypt(conn.refresh_token);

              if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
                console.warn(
                  `[sync-engagement] twitter ${p.post_id} thiếu credentials (consumer/access/secret)`,
                );
                return { post: p, error: "missing_twitter_credentials" };
              }

              metrics = await fetchTwitterMetrics({
                consumerKey,
                consumerSecret,
                accessToken,
                accessTokenSecret,
                tweetId: p.post_id,
              });
              break;
            }
            default:
              return { post: p, skip: true };
          }
          if (!metrics) return { post: p, error: "no_data" };
          return { post: p, conn, platform, metrics };
        } catch (e) {
          return { post: p, error: (e as Error).message };
        }
      }),
    );

    for (const r of results) {
      if ("skip" in r && r.skip) { skipped++; continue; }
      if ("error" in r && r.error) { failed++; continue; }
      if (!("metrics" in r) || !r.metrics) { failed++; continue; }
      success++;
      upserts.push({
        organization_id: r.post.organization_id,
        brand_template_id: r.conn?.brand_template_id ?? null,
        connection_id: r.conn?.id ?? null,
        content_id: r.post.content_id,
        platform: r.platform,
        post_id: r.post.post_id,
        snapshot_at: new Date().toISOString(),
        ...r.metrics,
      });
    }
  }

  // 4. Bulk upsert
  if (upserts.length) {
    const { error: upErr } = await supabase
      .from("social_post_metrics")
      .upsert(upserts, {
        onConflict: "connection_id,post_id,((snapshot_at AT TIME ZONE 'UTC')::date)",
        ignoreDuplicates: false,
      });
    if (upErr) {
      console.error("[sync-engagement] upsert error", upErr);
    }
  }

  // 5. Track sync state per connection used
  const stateRows = new Map<string, { organization_id: string; connection_id: string; platform: string; posts: number }>();
  for (const u of upserts) {
    if (!u.connection_id) continue;
    const k = u.connection_id;
    const cur = stateRows.get(k) ?? { organization_id: u.organization_id, connection_id: u.connection_id, platform: u.platform, posts: 0 };
    cur.posts += 1;
    stateRows.set(k, cur);
  }
  if (stateRows.size) {
    await supabase.from("report_sync_state").upsert(
      Array.from(stateRows.values()).map((s) => ({
        organization_id: s.organization_id,
        connection_id: s.connection_id,
        platform: s.platform,
        last_synced_at: new Date().toISOString(),
        last_status: "success",
        posts_synced: s.posts,
        consecutive_failures: 0,
      })),
      { onConflict: "connection_id" },
    );
  }

  return new Response(
    JSON.stringify({
      ok: true,
      total: uniquePosts.length,
      success,
      failed,
      skipped,
      duration_ms: Date.now() - startedAt,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

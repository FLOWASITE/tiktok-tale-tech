import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function tokenize(s: string): Set<string> {
  return new Set(
    (s || "").toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3)
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

const LONGFORM_URL_COLS = [
  "website_post_url",
  "blogger_post_url",
  "wordpress_post_url",
  "flowa_blog_post_url",
  "medium_post_url",
  "shopify_post_url",
  "wix_post_url",
];

function pickPublishedUrl(row: any): string | null {
  for (const c of LONGFORM_URL_COLS) {
    if (row[c]) return row[c] as string;
  }
  return null;
}

Deno.serve(withPerf({ functionName: "suggest-internal-links" }, async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = getServiceClient();
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");
    const { data: claims } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claims?.claims?.sub) throw new Error("Unauthorized");
    const userId = claims.claims.sub;

    const body = await req.json();
    // Support both legacy (organizationId/draftText/...) and new (organization_id/content_id/...) payloads
    const organizationId: string = body.organization_id || body.organizationId;
    const contentId: string | undefined = body.content_id || body.contentId;
    const matchCount: number = Number(body.match_count ?? body.limit ?? 8);
    const threshold: number = Number(body.threshold ?? 0.05);

    if (!organizationId) throw new Error("organization_id required");

    const { data: mem } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!mem) throw new Error("Forbidden");

    // 1) Resolve draft text — either provided directly or fetched via contentId
    let draftText: string = body.draftText || body.draft_text || "";
    let sourceTitle = "";
    if (!draftText && contentId) {
      const { data: src } = await supabase
        .from("multi_channel_contents")
        .select("topic, title, website_content, facebook_content, instagram_content")
        .eq("id", contentId)
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (src) {
        sourceTitle = src.title || src.topic || "";
        draftText = [src.title, src.topic, src.website_content, src.facebook_content, src.instagram_content]
          .filter(Boolean).join("\n").slice(0, 6000);
      }
    }
    if (!draftText) throw new Error("draftText (or content_id with content) required");

    // 2) Pull candidate posts in same org (exclude self)
    let q = supabase
      .from("multi_channel_contents")
      .select("id, topic, title, website_content, website_post_url, blogger_post_url, wordpress_post_url, flowa_blog_post_url, medium_post_url, shopify_post_url, wix_post_url")
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false })
      .limit(200);
    if (contentId) q = q.neq("id", contentId);

    const { data: pool, error } = await q;
    if (error) throw error;
    if (!pool?.length) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const draftTokens = tokenize(draftText);

    const scored = pool
      .map((p: any) => {
        const itemText = `${p.title || ""} ${p.topic || ""} ${(p.website_content || "").slice(0, 2000)}`;
        const score = jaccard(draftTokens, tokenize(itemText));
        const url = pickPublishedUrl(p);
        return { p, score, url };
      })
      .filter((x) => x.score >= threshold && !!x.url)
      .sort((a, b) => b.score - a.score)
      .slice(0, matchCount);

    const suggestions = scored.map(({ p, score, url }) => ({
      id: p.id,
      title: p.title || p.topic || "Untitled",
      topic: p.topic || "",
      similarity: String(score.toFixed(3)),
      anchor_suggestion: p.title || p.topic || "",
      url_hint: url!,
    }));

    return new Response(JSON.stringify({ suggestions, sourceTitle }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[suggest-internal-links] error:", e);
    return new Response(JSON.stringify({ error: e?.message || String(e), suggestions: [] }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));

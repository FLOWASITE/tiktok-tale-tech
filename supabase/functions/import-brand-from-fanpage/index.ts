// import-brand-from-fanpage
// Reads page info + recent posts from Facebook Graph API for an existing
// social_connection (platform='facebook'), then asks AI to extract brand profile.
//
// Auth: standard JWT.
// Body: { social_connection_id: string, organization_id?: string, locale?: string }

import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { decryptCredential } from "../_shared/crypto.ts";
import { extractBrandSuggestions } from "../_shared/brand-extractor.ts";
import { getAIConfig } from "../_shared/ai-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(withPerf({ functionName: "import-brand-from-fanpage" }, async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = getServiceClient();
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const connId: string | undefined = body?.social_connection_id;
    const organizationId: string | undefined = body?.organization_id;
    const locale: string = body?.locale || "vi";

    if (!connId) return json({ error: "social_connection_id required" }, 400);

    const [orchCfg, extrCfg] = await Promise.all([
      getAIConfig("import-brand-from-fanpage", organizationId).catch(() => null),
      getAIConfig("import-brand-extractor", organizationId).catch(() => null),
    ]);
    if (orchCfg?.is_enabled === false || extrCfg?.is_enabled === false) {
      return json({ error: "Tính năng Import Brand đang tạm ngưng (Admin)", code: "FEATURE_DISABLED" }, 503);
    }

    const { data: conn, error: connErr } = await supabase
      .from("social_connections")
      .select("id, platform, platform_user_id, platform_display_name, access_token, user_id, organization_id, brand_template_id, metadata")
      .eq("id", connId)
      .maybeSingle();

    if (connErr || !conn) return json({ error: "Connection không tồn tại" }, 404);
    if (conn.platform !== "facebook") return json({ error: "Chỉ hỗ trợ Facebook fanpage" }, 400);
    if (!conn.platform_user_id || !conn.access_token) {
      return json({ error: "Page token chưa sẵn sàng. Vui lòng kết nối lại Facebook." }, 400);
    }

    let pageToken: string;
    try {
      pageToken = await decryptCredential(conn.access_token);
    } catch (e) {
      console.error("[import-brand-from-fanpage] decrypt failed:", e);
      return json({ error: "Không giải mã được token. Vui lòng kết nối lại Facebook." }, 400);
    }

    const pageId = conn.platform_user_id;
    const fields = "name,about,bio,description,category,mission,founded,company_overview,products,general_info,website,fan_count,followers_count,picture.type(large){url}";
    const infoUrl = `https://graph.facebook.com/v21.0/${pageId}?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(pageToken)}`;
    const postsUrl = `https://graph.facebook.com/v21.0/${pageId}/posts?fields=message,created_time&limit=20&access_token=${encodeURIComponent(pageToken)}`;

    const [infoResp, postsResp] = await Promise.all([fetch(infoUrl), fetch(postsUrl)]);
    const infoData = await infoResp.json();
    const postsData = await postsResp.json();

    if (!infoResp.ok) {
      console.error("[import-brand-from-fanpage] page info error:", infoData);
      return json({
        error: infoData?.error?.message || "Không lấy được thông tin page",
        hint: "Kiểm tra quyền page hoặc kết nối lại Facebook.",
      }, 502);
    }

    const posts: Array<{ message?: string }> = Array.isArray(postsData?.data) ? postsData.data : [];
    const postSamples = posts
      .map((p) => (p.message || "").trim())
      .filter((m) => m.length >= 50)
      .slice(0, 12);

    const combined = [
      `# Page name: ${infoData.name || ""}`,
      infoData.category ? `# Category: ${infoData.category}` : "",
      infoData.about ? `## About\n${infoData.about}` : "",
      infoData.bio ? `## Bio\n${infoData.bio}` : "",
      infoData.description ? `## Description\n${infoData.description}` : "",
      infoData.mission ? `## Mission\n${infoData.mission}` : "",
      infoData.company_overview ? `## Company overview\n${infoData.company_overview}` : "",
      infoData.products ? `## Products\n${infoData.products}` : "",
      infoData.general_info ? `## General info\n${infoData.general_info}` : "",
      infoData.website ? `# Website: ${infoData.website}` : "",
      "",
      "## Recent posts",
      ...postSamples.map((m, i) => `### Post ${i + 1}\n${m}`),
    ].filter(Boolean).join("\n");

    if (combined.trim().length < 80) {
      return json({
        error: "Page chưa có đủ nội dung để phân tích (cần ít nhất phần About hoặc vài bài viết).",
      }, 422);
    }

    const extracted = await extractBrandSuggestions({
      source: "fanpage",
      content: combined,
      locale,
      organizationId,
      hint: infoData.name,
    });

    if (!extracted.success) {
      return json({ error: extracted.error || "AI extraction failed" }, 502);
    }

    return json({
      success: true,
      suggestion: extracted.suggestion,
      raw_meta: {
        source: "fanpage",
        page_id: pageId,
        page_name: infoData.name,
        category: infoData.category || null,
        picture: infoData.picture?.data?.url || null,
        fan_count: infoData.fan_count ?? null,
        followers_count: infoData.followers_count ?? null,
        website: infoData.website || null,
        social_connection_id: conn.id,
        post_count: postSamples.length,
      },
    });
  } catch (e) {
    console.error("[import-brand-from-fanpage] error:", e);
    return json({ error: e instanceof Error ? e.message : "Internal error" }, 500);
  }
}));

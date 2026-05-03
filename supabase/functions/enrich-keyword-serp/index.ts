import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const TOP_AUTHORITY_DOMAINS = [
  "wikipedia.org", "youtube.com", "facebook.com", "amazon.com", "reddit.com",
  "linkedin.com", "tiktok.com", "instagram.com", "vnexpress.net", "tuoitre.vn",
  "thanhnien.vn", "zingnews.vn", "vietnamnet.vn", "dantri.com.vn",
];

interface SerpResult { url: string; title?: string; description?: string; }

export function detectSerpFeatures(results: SerpResult[]): string[] {
  const features = new Set<string>();
  for (const r of results) {
    const u = (r.url || "").toLowerCase();
    const t = ((r.title || "") + " " + (r.description || "")).toLowerCase();
    if (u.includes("youtube.com") || u.includes("tiktok.com")) features.add("video");
    if (u.includes("shopee.") || u.includes("lazada.") || u.includes("tiki.vn") || u.includes("amazon.")) features.add("shopping");
    if (u.includes("facebook.com") || u.includes("instagram.com")) features.add("social");
    if (u.match(/\/(news|tin-tuc)\b/) || u.includes("vnexpress.net") || u.includes("dantri.com.vn")) features.add("news");
    if (t.includes("?") && (t.startsWith("how") || t.includes("là gì") || t.includes("làm thế nào"))) features.add("paa");
    if (u.includes("maps.google") || u.includes("/maps/")) features.add("local");
  }
  return Array.from(features);
}

export function computeKD(results: SerpResult[]): number {
  if (results.length === 0) return 50;
  let authorityHits = 0;
  for (const r of results) {
    try {
      const host = new URL(r.url).hostname.replace(/^www\./, "");
      if (TOP_AUTHORITY_DOMAINS.some(d => host.endsWith(d))) authorityHits++;
    } catch {}
  }
  // 0 hits → 25 KD; 10 hits → 95 KD
  return Math.min(100, Math.max(10, 25 + authorityHits * 7));
}

function topDomains(results: SerpResult[], n = 3): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of results) {
    try {
      const host = new URL(r.url).hostname.replace(/^www\./, "");
      if (!seen.has(host)) { seen.add(host); out.push(host); }
      if (out.length >= n) break;
    } catch {}
  }
  return out;
}

async function firecrawlSearch(query: string): Promise<SerpResult[]> {
  if (!FIRECRAWL_API_KEY) return [];
  try {
    const res = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit: 10, lang: "vi", country: "VN" }),
    });
    if (!res.ok) {
      console.error("[firecrawl]", res.status, await res.text().catch(() => ""));
      return [];
    }
    const data = await res.json();
    const items = data?.data?.web || data?.web || data?.data || [];
    return (Array.isArray(items) ? items : []).map((x: any) => ({
      url: x.url, title: x.title, description: x.description || x.snippet,
    })).filter((x: SerpResult) => !!x.url);
  } catch (e) {
    console.error("[firecrawl] exception", e);
    return [];
  }
}

async function classifyIntent(keyword: string, results: SerpResult[]): Promise<string | null> {
  if (!LOVABLE_API_KEY) return null;
  const snippet = results.slice(0, 5).map((r, i) => `${i + 1}. ${r.title || ""} — ${r.description || ""}`).join("\n");
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "Bạn là SEO analyst. Phân loại search intent của keyword dựa trên SERP. Chỉ chọn 1 trong: informational, commercial, transactional, navigational." },
          { role: "user", content: `Keyword: "${keyword}"\n\nTop SERP results:\n${snippet || "(no data)"}\n\nTrả về intent.` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "set_intent",
            description: "Set the classified search intent",
            parameters: {
              type: "object",
              properties: { intent: { type: "string", enum: ["informational", "commercial", "transactional", "navigational"] } },
              required: ["intent"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "set_intent" } },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return null;
    const parsed = JSON.parse(args);
    return parsed.intent || null;
  } catch (e) {
    console.error("[intent] error", e);
    return null;
  }
}

async function enrichOne(supabase: any, kw: { id: string; keyword: string }) {
  const results = await firecrawlSearch(kw.keyword);
  const serp_features = detectSerpFeatures(results);
  const difficulty = computeKD(results);
  const top_competitors = topDomains(results);
  const intent = await classifyIntent(kw.keyword, results);

  const patch: Record<string, unknown> = {
    serp_features,
    difficulty,
    top_competitors,
    updated_at: new Date().toISOString(),
  };
  if (intent) patch.intent = intent;

  const { error } = await supabase.from("seo_keywords").update(patch).eq("id", kw.id);
  if (error) throw new Error(error.message);
}

async function runJob(supabase: any, jobId: string, orgId: string, keywordIds: string[]) {
  await supabase.from("keyword_enrichment_jobs").update({ status: "running", total: keywordIds.length }).eq("id", jobId);

  const { data: kws = [] } = await supabase
    .from("seo_keywords")
    .select("id,keyword")
    .eq("organization_id", orgId)
    .in("id", keywordIds);

  const errors: { id: string; error: string }[] = [];
  let done = 0;

  // throttle: 3 concurrent
  const queue = [...(kws || [])];
  const workers = Array.from({ length: 3 }, async () => {
    while (queue.length) {
      const kw = queue.shift();
      if (!kw) break;
      try {
        await enrichOne(supabase, kw);
      } catch (e: any) {
        errors.push({ id: kw.id, error: e?.message || String(e) });
      }
      done++;
      // periodic progress update
      if (done % 3 === 0 || done === kws.length) {
        await supabase.from("keyword_enrichment_jobs").update({ done, errors }).eq("id", jobId);
      }
    }
  });
  await Promise.all(workers);

  await supabase.from("keyword_enrichment_jobs").update({
    status: errors.length === kws.length && kws.length > 0 ? "failed" : "done",
    done,
    errors,
    completed_at: new Date().toISOString(),
  }).eq("id", jobId);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { keywordIds, organizationId } = await req.json();
    if (!Array.isArray(keywordIds) || keywordIds.length === 0 || !organizationId) {
      return new Response(JSON.stringify({ error: "keywordIds[] và organizationId là bắt buộc" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (keywordIds.length > 50) {
      return new Response(JSON.stringify({ error: "Tối đa 50 keyword/lần" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // verify membership
    const { data: member } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userData.user.id)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (!member) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: job, error: jobErr } = await supabase
      .from("keyword_enrichment_jobs")
      .insert({
        organization_id: organizationId,
        status: "queued",
        total: keywordIds.length,
        keyword_ids: keywordIds,
        created_by: userData.user.id,
      })
      .select("id")
      .single();
    if (jobErr || !job) throw new Error(jobErr?.message || "Failed to create job");

    // background persist
    // @ts-ignore EdgeRuntime
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(runJob(supabase, job.id, organizationId, keywordIds));
    } else {
      runJob(supabase, job.id, organizationId, keywordIds).catch(e => console.error("[runJob]", e));
    }

    return new Response(JSON.stringify({ jobId: job.id, total: keywordIds.length, hasFirecrawl: !!FIRECRAWL_API_KEY }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[enrich-keyword-serp] error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

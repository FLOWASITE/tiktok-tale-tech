// AI Research Lab v2 — Multi-seed + SERP grounding + competitor scrape + streaming
// + Brand/Industry context + Seed expansion (Autocomplete + PAA) + SERP cache
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { callAIWithMetrics } from "../_shared/ai-provider.ts";
import { expandSeeds } from "../_shared/seed-expander.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Preset = "long_tail_questions" | "commercial_intent" | "local_seo_vn" | "competitor_gaps" | "default";

const PRESET_PROMPTS: Record<Preset, string> = {
  long_tail_questions: "TẬP TRUNG: Long-tail 4+ từ + câu hỏi (làm sao, cách, có nên, là gì, tại sao, khi nào).",
  commercial_intent: "TẬP TRUNG: Commercial/transactional intent — 'giá', 'mua', 'đăng ký', 'tốt nhất', 'so sánh', 'review'.",
  local_seo_vn: "TẬP TRUNG: Local SEO Việt Nam — thêm địa danh (Hà Nội, TP HCM, Đà Nẵng, quận, gần tôi).",
  competitor_gaps: "TẬP TRUNG: Keyword đối thủ đang rank (lấy từ SERP grounding bên dưới) mà có thể tận dụng để cạnh tranh.",
  default: "Cân bằng các loại: long-tail, question, modifier, comparison, commercial.",
};

interface KeywordSuggestion {
  keyword: string;
  search_volume: number;
  difficulty: number;
  cpc_vnd: number;
  intent: "informational" | "commercial" | "transactional" | "navigational";
  funnel_stage: "TOFU" | "MOFU" | "BOFU";
  cluster_name: string;
  rationale?: string;
  source_seed?: string;
  pillar_match?: string | null;
  is_gap?: boolean;
}

// Simple in-memory TTL cache for Firecrawl (24h search, 6h scrape)
const fcCache = new Map<string, { data: any; exp: number }>();
function fcGet<T>(key: string): T | null {
  const hit = fcCache.get(key);
  if (hit && hit.exp > Date.now()) return hit.data as T;
  if (hit) fcCache.delete(key);
  return null;
}
function fcSet(key: string, data: any, ttlMs: number) {
  fcCache.set(key, { data, exp: Date.now() + ttlMs });
}

async function firecrawlSearch(query: string, country = "vn", lang = "vi"): Promise<{ title: string; description: string; url: string }[]> {
  if (!FIRECRAWL_API_KEY) return [];
  const cacheKey = `fc:search:${query.toLowerCase()}:${country}:${lang}`;
  const cached = fcGet<{ title: string; description: string; url: string }[]>(cacheKey);
  if (cached) {
    console.log(`[keyword-research-v2] SERP cache HIT: ${query}`);
    return cached;
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit: 10, lang, country }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return [];
    const j = await res.json();
    const arr = j.data?.web || j.data || [];
    const out = arr.slice(0, 10).map((r: any) => ({ title: r.title || "", description: r.description || r.snippet || "", url: r.url || "" }));
    fcSet(cacheKey, out, 24 * 3600_000);
    return out;
  } catch (e) {
    console.warn("[keyword-research-v2] Firecrawl search failed:", e);
    return [];
  }
}

async function firecrawlScrape(url: string): Promise<string> {
  if (!FIRECRAWL_API_KEY) return "";
  const cacheKey = `fc:scrape:${url}`;
  const cached = fcGet<string>(cacheKey);
  if (cached !== null) return cached;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000);
    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return "";
    const j = await res.json();
    const md = String(j.data?.markdown || j.markdown || "").slice(0, 4000);
    fcSet(cacheKey, md, 6 * 3600_000);
    return md;
  } catch (e) {
    console.warn("[keyword-research-v2] Firecrawl scrape failed:", e);
    return "";
  }
}

interface BrandCtx {
  brand_name?: string;
  industry?: string;
  tone_of_voice?: string;
  target_audience?: string;
  pillars: { name: string; keywords?: string[]; weight?: number }[];
  forbidden_terms: string[];
  jurisdiction?: string;
}

async function fetchBrandCtx(supabase: any, brandTemplateId?: string): Promise<BrandCtx | null> {
  if (!brandTemplateId) return null;
  const { data: brand } = await supabase
    .from("brand_templates")
    .select("brand_name,name,industry,tone_of_voice,target_age_range,market_segment,content_pillars,forbidden_words,industry_template_id,jurisdiction_code")
    .eq("id", brandTemplateId)
    .maybeSingle();
  if (!brand) return null;

  let forbidden: string[] = Array.isArray(brand.forbidden_words) ? brand.forbidden_words : [];
  let jurisdiction = brand.jurisdiction_code as string | undefined;
  if (brand.industry_template_id) {
    const { data: ind } = await supabase
      .from("industry_templates")
      .select("forbidden_terms")
      .eq("id", brand.industry_template_id)
      .maybeSingle();
    if (ind?.forbidden_terms && Array.isArray(ind.forbidden_terms)) {
      forbidden = [...new Set([...forbidden, ...ind.forbidden_terms.map(String)])];
    }
  }

  const pillars = Array.isArray(brand.content_pillars) ? brand.content_pillars : [];
  return {
    brand_name: brand.brand_name || brand.name,
    industry: brand.industry,
    tone_of_voice: brand.tone_of_voice,
    target_audience: [brand.target_age_range, brand.market_segment].filter(Boolean).join(" / "),
    pillars: pillars.slice(0, 5),
    forbidden_terms: forbidden.slice(0, 20),
    jurisdiction,
  };
}

function buildBrandBlock(ctx: BrandCtx | null): string {
  if (!ctx) return "";
  const pillarLines = ctx.pillars
    .sort((a: any, b: any) => (b?.weight ?? 0) - (a?.weight ?? 0))
    .slice(0, 3)
    .map((p, i) => {
      const kws = Array.isArray(p.keywords) ? p.keywords.slice(0, 3).join(", ") : "";
      return `  ${i + 1}. ${p.name}${kws ? ` — keywords: ${kws}` : ""}`;
    }).join("\n");
  const lines: string[] = ["", "## BRAND CONTEXT (priority cao)"];
  if (ctx.brand_name) lines.push(`Brand: ${ctx.brand_name}${ctx.industry ? ` | Ngành: ${ctx.industry}` : ""}`);
  if (ctx.tone_of_voice) lines.push(`Tone: ${ctx.tone_of_voice}`);
  if (ctx.target_audience) lines.push(`Audience: ${ctx.target_audience}`);
  if (pillarLines) lines.push(`Content pillars (top 3):\n${pillarLines}`);
  lines.push("");
  lines.push("## Output bias");
  lines.push("- Keyword PHẢI bám sát ngành & audience trên (không sinh keyword chung chung)");
  if (ctx.pillars.length) lines.push(`- Mỗi keyword GẮN field 'pillar_match' = tên 1 pillar phù hợp nhất (hoặc null nếu không khớp)`);
  if (ctx.forbidden_terms.length) lines.push(`- TUYỆT ĐỐI tránh thuật ngữ: ${ctx.forbidden_terms.join(", ")}`);
  return lines.join("\n");
}

function buildSystemPrompt(preset: Preset, limit: number, brandCtx: BrandCtx | null): string {
  return `Bạn là chuyên gia SEO tiếng Việt. Sinh chính xác ${limit} keyword biến thể.

${PRESET_PROMPTS[preset]}

Mỗi keyword có: search_volume (tháng/VN, 0-50000), difficulty (0-100), cpc_vnd (0-50000), intent, funnel_stage (TOFU/MOFU/BOFU), cluster_name (3-5 từ).
Khi có SERP grounding (titles/descriptions thật), ƯỚC LƯỢNG dựa trên độ cạnh tranh thật từ SERP — KHÔNG bịa số.
Trả qua tool call 'submit_keyword_batch', mỗi batch 5 keyword. Gọi tool nhiều lần cho đến khi đủ ${limit}.${buildBrandBlock(brandCtx)}`;
}

function buildUserPrompt(seeds: string[], expandedSeeds: string[], serpGround: Record<string, any[]>, competitorContext: string, locale: string): string {
  let p = `SEEDS (user): ${seeds.map(s => `"${s}"`).join(", ")}\nLOCALE: ${locale}\n`;
  if (expandedSeeds.length) {
    p += `SEEDS MỞ RỘNG (Autocomplete + PAA): ${expandedSeeds.map(s => `"${s}"`).join(", ")}\n`;
  }
  p += `\n`;
  if (Object.keys(serpGround).length) {
    p += "=== SERP GROUNDING (top 10 thực tế) ===\n";
    for (const [seed, results] of Object.entries(serpGround)) {
      p += `\n[${seed}]\n`;
      results.slice(0, 8).forEach((r: any, i: number) => {
        p += `${i + 1}. ${r.title} — ${r.description?.slice(0, 120) || ""}\n`;
      });
    }
    p += "\n";
  }
  if (competitorContext) {
    p += `=== NỘI DUNG ĐỐI THỦ (đã scrape) ===\n${competitorContext.slice(0, 3000)}\n\n`;
  }
  p += `Sinh keyword đa dạng từ tất cả seeds + seeds mở rộng. Mỗi keyword gắn source_seed = seed gốc gần nhất.`;
  return p;
}

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "submit_keyword_batch",
    description: "Submit a batch of 5 keyword suggestions",
    parameters: {
      type: "object",
      properties: {
        keywords: {
          type: "array",
          items: {
            type: "object",
            properties: {
              keyword: { type: "string" },
              search_volume: { type: "integer" },
              difficulty: { type: "integer" },
              cpc_vnd: { type: "integer" },
              intent: { type: "string", enum: ["informational", "commercial", "transactional", "navigational"] },
              funnel_stage: { type: "string", enum: ["TOFU", "MOFU", "BOFU"] },
              cluster_name: { type: "string" },
              rationale: { type: "string" },
              source_seed: { type: "string" },
              pillar_match: { type: "string", description: "Tên pillar phù hợp nhất (nếu có brand context); null nếu không khớp" },
            },
            required: ["keyword", "search_volume", "difficulty", "cpc_vnd", "intent", "funnel_stage", "cluster_name"],
          },
        },
      },
      required: ["keywords"],
    },
  },
};

async function callAI(supabase: any, organizationId: string, userId: string, seeds: string[], expandedSeeds: string[], serpGround: Record<string, any[]>, competitorContext: string, preset: Preset, locale: string, limit: number, brandCtx: BrandCtx | null): Promise<{ suggestions: KeywordSuggestion[]; usedFallback: boolean }> {
  const sys = buildSystemPrompt(preset, limit, brandCtx);
  const user = buildUserPrompt(seeds, expandedSeeds, serpGround, competitorContext, locale);

  const tryCall = async (modelOverride?: string) => {
    const res = await callAIWithMetrics(supabase, {
      functionName: "keyword-research-v2",
      organizationId,
      userId,
      messages: [{ role: "system", content: sys }, { role: "user", content: user }],
      tools: [TOOL_SCHEMA],
      modelOverride,
      actionType: "keyword_research",
    });
    if (!res.success) {
      const err: any = new Error(res.error || "AI call failed");
      if (res.error?.includes("Rate limit")) err.status = 429;
      else if (res.error?.includes("Payment")) err.status = 402;
      throw err;
    }
    const calls = res.data?.choices?.[0]?.message?.tool_calls || [];
    const all: KeywordSuggestion[] = [];
    for (const c of calls) {
      try {
        const args = JSON.parse(c.function.arguments);
        if (Array.isArray(args.keywords)) all.push(...args.keywords);
      } catch { /* skip */ }
    }
    return all;
  };

  try {
    const suggestions = await tryCall();
    return { suggestions, usedFallback: false };
  } catch (e: any) {
    if (e.status === 429 || e.status === 402) throw e;
    console.warn("[keyword-research-v2] Primary failed, fallback to flash:", e.message);
    const suggestions = await tryCall("google/gemini-2.5-flash");
    return { suggestions, usedFallback: true };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!user) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  let body: any;
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

  const seeds: string[] = (Array.isArray(body.seeds) ? body.seeds : [body.seed]).map((s: any) => String(s || "").trim()).filter(Boolean).slice(0, 5);
  const competitorUrls: string[] = (body.competitorUrls || []).map((u: any) => String(u || "").trim()).filter(Boolean).slice(0, 3);
  const preset: Preset = PRESET_PROMPTS[body.preset as Preset] ? body.preset : "default";
  const organizationId = body.organizationId;
  const brandTemplateId: string | undefined = body.brandTemplateId;
  const locale = body.locale || "vi";
  const limit = Math.min(100, Math.max(5, parseInt(body.limit) || 30));

  if (!seeds.length || !organizationId) {
    return new Response(JSON.stringify({ error: "seeds & organizationId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Brand context (optional)
  const brandCtx = await fetchBrandCtx(supabase, brandTemplateId).catch((e) => {
    console.warn("[keyword-research-v2] brand ctx fail:", e);
    return null;
  });

  // Create job
  const { data: job, error: jobErr } = await supabase.from("keyword_research_jobs").insert({
    organization_id: organizationId,
    seed_keyword: seeds[0],
    seeds, competitor_urls: competitorUrls, preset,
    mode: "expand", status: "running",
    ai_model: "google/gemini-2.5-pro",
    created_by: user.id,
  }).select("id").single();
  if (jobErr || !job) return new Response(JSON.stringify({ error: jobErr?.message || "Failed to create job" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const jobId = job.id;

  // SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      const work = async () => {
        try {
          send("progress", { pct: 5, jobId, message: "Khởi tạo job..." });
          if (brandCtx?.brand_name) {
            send("progress", { pct: 8, message: `Áp brand context: ${brandCtx.brand_name}` });
          }

          // 1. Competitor scrape
          let competitorContext = "";
          if (competitorUrls.length) {
            send("progress", { pct: 15, message: `Đang phân tích ${competitorUrls.length} URL đối thủ...` });
            const scraped = await Promise.all(competitorUrls.map(u => firecrawlScrape(u)));
            competitorContext = scraped.filter(Boolean).join("\n\n---\n\n");
          }

          // 2. SERP grounding
          send("progress", { pct: 25, message: "SERP grounding (Firecrawl)..." });
          const serpGround: Record<string, any[]> = {};
          await Promise.all(seeds.map(async (s) => {
            serpGround[s] = await firecrawlSearch(s);
          }));
          send("serp", { hasFirecrawl: !!FIRECRAWL_API_KEY, results: Object.fromEntries(Object.entries(serpGround).map(([k, v]) => [k, v.length])) });

          // 3. Seed expansion
          send("progress", { pct: 35, message: "Mở rộng seed (Autocomplete + PAA)..." });
          let expandedSeeds: string[] = [];
          try {
            expandedSeeds = await expandSeeds(seeds, serpGround, locale);
          } catch (e) {
            console.warn("[keyword-research-v2] expand seeds failed:", (e as Error).message);
          }
          if (expandedSeeds.length) {
            send("expanded_seeds", { seeds: expandedSeeds });
          }

          // 4. AI generate (with heartbeat to keep SSE stream alive through proxies)
          send("progress", { pct: 50, message: `AI sinh ${limit} keyword${brandCtx ? " (brand-aware)" : ""}...` });
          let hbPct = 50;
          const hb = setInterval(() => {
            try {
              // ticker progress 50 → 78 trong lúc chờ AI
              hbPct = Math.min(78, hbPct + 2);
              send("progress", { pct: hbPct, message: `AI đang sinh keyword... (${hbPct}%)` });
              // SSE comment để chống buffering
              controller.enqueue(encoder.encode(`: ping\n\n`));
            } catch { /* stream closed */ }
          }, 5000);
          let suggestions: KeywordSuggestion[] = [];
          try {
            const r = await callAI(supabase, organizationId, user.id, seeds, expandedSeeds, serpGround, competitorContext, preset, locale, limit, brandCtx);
            suggestions = r.suggestions;
          } finally {
            clearInterval(hb);
          }
          if (!suggestions.length) throw new Error("AI không trả keyword nào");

          // 5. Gap detection
          send("progress", { pct: 80, message: "Gap analysis..." });
          const keywords = suggestions.map(s => s.keyword.toLowerCase().trim());
          const { data: existing } = await supabase.from("seo_keywords")
            .select("keyword").eq("organization_id", organizationId).in("keyword", keywords);
          const existingSet = new Set((existing || []).map((r: any) => r.keyword));
          const enriched = suggestions.map(s => ({ ...s, keyword: s.keyword.toLowerCase().trim(), is_gap: !existingSet.has(s.keyword.toLowerCase().trim()) }));

          // Stream batches of 5 to FE
          for (let i = 0; i < enriched.length; i += 5) {
            send("keyword_batch", { batch: enriched.slice(i, i + 5), index: i, total: enriched.length });
          }

          // 6. Save preview
          await supabase.from("keyword_research_jobs").update({
            preview: enriched,
            serp_grounding: serpGround,
            result: { suggestions: enriched.length, gaps: enriched.filter(e => e.is_gap).length, hasFirecrawl: !!FIRECRAWL_API_KEY, expandedSeeds, brandTemplateId: brandTemplateId || null },
            status: "preview_ready",
            keywords_added: 0,
          }).eq("id", jobId);

          send("done", { jobId, total: enriched.length, gaps: enriched.filter(e => e.is_gap).length });
        } catch (e: any) {
          console.error("[keyword-research-v2] Error:", e);
          const status = e.status === 429 ? 429 : e.status === 402 ? 402 : 500;
          await supabase.from("keyword_research_jobs").update({
            status: "failed",
            error_message: e.message || String(e),
            completed_at: new Date().toISOString(),
          }).eq("id", jobId);
          send("error", { message: e.message || "Unknown", status });
        } finally {
          controller.close();
        }
      };
      // @ts-ignore
      if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(work());
      } else {
        work();
      }
    },
  });

  return new Response(stream, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", "Connection": "keep-alive", "X-Accel-Buffering": "no" },
  });
});

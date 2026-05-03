// AI Research Lab v2 — Multi-seed + SERP grounding + competitor scrape + streaming
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
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
  is_gap?: boolean;
}

async function firecrawlSearch(query: string, country = "vn", lang = "vi"): Promise<{ title: string; description: string; url: string }[]> {
  if (!FIRECRAWL_API_KEY) return [];
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
    return arr.slice(0, 10).map((r: any) => ({ title: r.title || "", description: r.description || r.snippet || "", url: r.url || "" }));
  } catch (e) {
    console.warn("[keyword-research-v2] Firecrawl search failed:", e);
    return [];
  }
}

async function firecrawlScrape(url: string): Promise<string> {
  if (!FIRECRAWL_API_KEY) return "";
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
    const md = j.data?.markdown || j.markdown || "";
    return String(md).slice(0, 4000);
  } catch (e) {
    console.warn("[keyword-research-v2] Firecrawl scrape failed:", e);
    return "";
  }
}

function buildSystemPrompt(preset: Preset, limit: number): string {
  return `Bạn là chuyên gia SEO tiếng Việt. Sinh chính xác ${limit} keyword biến thể.

${PRESET_PROMPTS[preset]}

Mỗi keyword có: search_volume (tháng/VN, 0-50000), difficulty (0-100), cpc_vnd (0-50000), intent, funnel_stage (TOFU/MOFU/BOFU), cluster_name (3-5 từ).
Khi có SERP grounding (titles/descriptions thật), ƯỚC LƯỢNG dựa trên độ cạnh tranh thật từ SERP — KHÔNG bịa số.
Trả qua tool call 'submit_keyword_batch', mỗi batch 5 keyword. Gọi tool nhiều lần cho đến khi đủ ${limit}.`;
}

function buildUserPrompt(seeds: string[], serpGround: Record<string, any[]>, competitorContext: string, locale: string): string {
  let p = `SEEDS: ${seeds.map(s => `"${s}"`).join(", ")}\nLOCALE: ${locale}\n\n`;
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
  p += `Sinh keyword đa dạng từ tất cả seeds. Mỗi keyword gắn source_seed = seed gốc.`;
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
            },
            required: ["keyword", "search_volume", "difficulty", "cpc_vnd", "intent", "funnel_stage", "cluster_name"],
          },
        },
      },
      required: ["keywords"],
    },
  },
};

async function resolveAdminModel(supabase: any, organizationId: string): Promise<{ model: string; temperature: number | null }> {
  try {
    let q = supabase.from("ai_function_configs")
      .select("model_override, temperature")
      .eq("function_name", "keyword-research-v2")
      .eq("is_enabled", true);
    q = q.or(`organization_id.eq.${organizationId},organization_id.is.null`);
    const { data } = await q.order("organization_id", { nullsFirst: false }).limit(1);
    const row = data?.[0];
    return { model: row?.model_override || "google/gemini-2.5-pro", temperature: row?.temperature ?? null };
  } catch {
    return { model: "google/gemini-2.5-pro", temperature: null };
  }
}

async function callAI(supabase: any, organizationId: string, seeds: string[], serpGround: Record<string, any[]>, competitorContext: string, preset: Preset, locale: string, limit: number): Promise<KeywordSuggestion[]> {
  const sys = buildSystemPrompt(preset, limit);
  const user = buildUserPrompt(seeds, serpGround, competitorContext, locale);
  const adminCfg = await resolveAdminModel(supabase, organizationId);

  const tryModel = async (model: string) => {
    const payload: any = {
      model,
      messages: [{ role: "system", content: sys }, { role: "user", content: user }],
      tools: [TOOL_SCHEMA],
    };
    if (adminCfg.temperature !== null) payload.temperature = adminCfg.temperature;
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const t = await resp.text();
      const err: any = new Error(`AI ${resp.status}: ${t}`);
      err.status = resp.status;
      throw err;
    }
    const data = await resp.json();
    const calls = data.choices?.[0]?.message?.tool_calls || [];
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
    return await tryModel(adminCfg.model);
  } catch (e: any) {
    if (e.status === 429 || e.status === 402) throw e;
    console.warn("[keyword-research-v2] Primary model failed, fallback flash:", e.message);
    return await tryModel("google/gemini-2.5-flash");
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
  const locale = body.locale || "vi";
  const limit = Math.min(100, Math.max(5, parseInt(body.limit) || 30));

  if (!seeds.length || !organizationId) {
    return new Response(JSON.stringify({ error: "seeds & organizationId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

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

          // 1. Competitor scrape
          let competitorContext = "";
          if (competitorUrls.length) {
            send("progress", { pct: 15, message: `Đang phân tích ${competitorUrls.length} URL đối thủ...` });
            const scraped = await Promise.all(competitorUrls.map(u => firecrawlScrape(u)));
            competitorContext = scraped.filter(Boolean).join("\n\n---\n\n");
          }

          // 2. SERP grounding
          send("progress", { pct: 30, message: "SERP grounding (Firecrawl)..." });
          const serpGround: Record<string, any[]> = {};
          await Promise.all(seeds.map(async (s) => {
            serpGround[s] = await firecrawlSearch(s);
          }));
          send("serp", { hasFirecrawl: !!FIRECRAWL_API_KEY, results: Object.fromEntries(Object.entries(serpGround).map(([k, v]) => [k, v.length])) });

          // 3. AI generate
          send("progress", { pct: 50, message: `AI sinh ${limit} keyword...` });
          const suggestions = await callAI(supabase, organizationId, seeds, serpGround, competitorContext, preset, locale, limit);
          if (!suggestions.length) throw new Error("AI không trả keyword nào");

          // 4. Gap detection
          send("progress", { pct: 80, message: "Gap analysis..." });
          const keywords = suggestions.map(s => s.keyword.toLowerCase().trim());
          const { data: existing } = await supabase.from("seo_keywords")
            .select("keyword").eq("organization_id", organizationId).in("keyword", keywords);
          const existingSet = new Set((existing || []).map(r => r.keyword));
          const enriched = suggestions.map(s => ({ ...s, keyword: s.keyword.toLowerCase().trim(), is_gap: !existingSet.has(s.keyword.toLowerCase().trim()) }));

          // Stream batches of 5 to FE
          for (let i = 0; i < enriched.length; i += 5) {
            send("keyword_batch", { batch: enriched.slice(i, i + 5), index: i, total: enriched.length });
          }

          // 5. Save preview
          await supabase.from("keyword_research_jobs").update({
            preview: enriched,
            serp_grounding: serpGround,
            result: { suggestions: enriched.length, gaps: enriched.filter(e => e.is_gap).length, hasFirecrawl: !!FIRECRAWL_API_KEY },
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
    headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
  });
});

// Keyword Research engine: expand seed → SERP scan → cluster → bulk insert
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { callAIWithMetrics } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface KeywordSuggestion {
  keyword: string;
  search_volume: number;
  difficulty: number;
  cpc_vnd: number;
  intent: "informational" | "commercial" | "transactional" | "navigational";
  funnel_stage: "TOFU" | "MOFU" | "BOFU";
  cluster_name: string;
  rationale?: string;
}

async function resolveAdminModel(supabase: any, organizationId: string): Promise<{ model: string; temperature: number | null }> {
  try {
    let q = supabase.from("ai_function_configs")
      .select("model_override, temperature")
      .eq("function_name", "keyword-research")
      .eq("is_enabled", true);
    q = q.or(`organization_id.eq.${organizationId},organization_id.is.null`);
    const { data } = await q.order("organization_id", { nullsFirst: false }).limit(1);
    const row = data?.[0];
    return { model: row?.model_override || "google/gemini-2.5-pro", temperature: row?.temperature ?? null };
  } catch {
    return { model: "google/gemini-2.5-pro", temperature: null };
  }
}

async function expandKeywords(supabase: any, organizationId: string, seed: string, locale: string, limit: number): Promise<{ suggestions: KeywordSuggestion[]; model: string }> {
  const sys = `Bạn là chuyên gia SEO Việt Nam, chuyên programmatic SEO cho ngành AI marketing.
Sinh ${limit} biến thể keyword tiếng Việt từ seed keyword. Bao gồm:
- Long-tail (4+ từ)
- Question-based ("làm sao", "cách", "có nên", "là gì")
- Modifier-based (thêm địa điểm, năm 2026, ngành nghề, "tốt nhất", "miễn phí", "so sánh")
- Comparison ("vs", "so với", "thay thế")
- High-intent commercial ("giá", "mua", "đăng ký", "dùng thử")

Ước lượng search_volume tháng/VN (0-10000+), difficulty (0-100), cpc_vnd (0-50000), intent, funnel_stage.
Phân nhóm theo cluster_name ngắn gọn (3-5 từ, vd: "AI Content Generation", "Carousel Tools").

CHỈ TRẢ VỀ JSON array, KHÔNG markdown, KHÔNG giải thích.`;

  const userPrompt = `Seed: "${seed}"
Locale: ${locale}
Sinh chính xác ${limit} keyword. Format JSON:
[{"keyword":"...","search_volume":1200,"difficulty":35,"cpc_vnd":8500,"intent":"commercial","funnel_stage":"MOFU","cluster_name":"...","rationale":"ngắn"}]`;

  const adminCfg = await resolveAdminModel(supabase, organizationId);
  const payload: any = {
    model: adminCfg.model,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: userPrompt },
    ],
    tools: [{
      type: "function",
      function: {
        name: "submit_keywords",
        description: "Submit expanded keyword suggestions",
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
                },
                required: ["keyword", "search_volume", "difficulty", "cpc_vnd", "intent", "funnel_stage", "cluster_name"],
              },
            },
          },
          required: ["keywords"],
        },
      },
    }],
    tool_choice: { type: "function", function: { name: "submit_keywords" } },
  };
  if (adminCfg.temperature !== null) payload.temperature = adminCfg.temperature;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`AI gateway error ${resp.status}: ${t}`);
  }

  const data = await resp.json();
  const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("No tool call response");
  const parsed = JSON.parse(args);
  return { suggestions: parsed.keywords || [], model: adminCfg.model };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // Auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !user) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { seed, mode = "expand", organizationId, locale = "vi", limit = 30 } = body;

    if (!seed || !organizationId) {
      return new Response(JSON.stringify({ error: "seed & organizationId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (limit > 100) {
      return new Response(JSON.stringify({ error: "limit max 100" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tạo job
    const { data: job, error: jobErr } = await supabase.from("keyword_research_jobs")
      .insert({
        organization_id: organizationId,
        seed_keyword: seed,
        mode,
        status: "running",
        ai_model: "google/gemini-2.5-pro",
        created_by: user.id,
      })
      .select("id")
      .single();

    if (jobErr) throw jobErr;
    const jobId = job.id;

    // Background work
    const work = async () => {
      try {
        const { suggestions, model: usedModel } = await expandKeywords(supabase, organizationId, seed, locale, Math.min(limit, 100));
        console.log(`[keyword-research] Generated ${suggestions.length} keywords for "${seed}" with ${usedModel}`);
        await supabase.from("keyword_research_jobs").update({ ai_model: usedModel }).eq("id", jobId);

        // Lấy/tạo cluster theo cluster_name
        const clusterNames = [...new Set(suggestions.map(s => s.cluster_name).filter(Boolean))];
        const clusterMap = new Map<string, string>();

        for (const name of clusterNames) {
          const { data: existing } = await supabase.from("seo_clusters")
            .select("id")
            .eq("organization_id", organizationId)
            .eq("name", name)
            .maybeSingle();
          if (existing) {
            clusterMap.set(name, existing.id);
          } else {
            const { data: created } = await supabase.from("seo_clusters")
              .insert({ organization_id: organizationId, name, description: `Auto từ seed "${seed}"`, status: "planning" })
              .select("id")
              .single();
            if (created) clusterMap.set(name, created.id);
          }
        }

        // Bulk insert keywords (skip duplicates qua unique constraint)
        const rows = suggestions.map(s => ({
          organization_id: organizationId,
          keyword: s.keyword.toLowerCase().trim(),
          locale,
          search_volume: s.search_volume || 0,
          difficulty: Math.min(100, Math.max(0, s.difficulty || 50)),
          cpc_vnd: s.cpc_vnd || 0,
          intent: s.intent,
          funnel_stage: s.funnel_stage,
          cluster_id: clusterMap.get(s.cluster_name) || null,
          source: "ai_suggested" as const,
          notes: s.rationale,
          status: "new" as const,
        }));

        const { data: inserted, error: insErr } = await supabase.from("seo_keywords")
          .upsert(rows, { onConflict: "organization_id,keyword,locale", ignoreDuplicates: true })
          .select("id");

        if (insErr) throw insErr;

        await supabase.from("keyword_research_jobs").update({
          status: "done",
          keywords_added: inserted?.length || 0,
          result: { suggestions: suggestions.length, clusters_created: clusterMap.size },
          completed_at: new Date().toISOString(),
        }).eq("id", jobId);

        console.log(`[keyword-research] Job ${jobId} done: ${inserted?.length} inserted`);
      } catch (e) {
        console.error("[keyword-research] Background error:", e);
        await supabase.from("keyword_research_jobs").update({
          status: "failed",
          error_message: e instanceof Error ? e.message : String(e),
          completed_at: new Date().toISOString(),
        }).eq("id", jobId);
      }
    };

    // Fire and forget (background persistence)
    // @ts-ignore: EdgeRuntime available in Deno deploy
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(work());
    } else {
      work();
    }

    return new Response(JSON.stringify({ jobId, status: "running" }), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[keyword-research] Error:", e);
    const msg = e instanceof Error ? e.message : "Unknown";
    const status = msg.includes("429") ? 429 : msg.includes("402") ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

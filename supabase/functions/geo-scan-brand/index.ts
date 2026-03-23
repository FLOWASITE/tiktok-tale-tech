import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Cost estimates per API call (USD)
const COST_PER_CALL: Record<string, number> = {
  chatgpt: 0.003,
  gemini: 0.001,
  perplexity: 0.005,
};

// Max prompts per batch to avoid timeouts
const MAX_PROMPTS_PER_BATCH = 10;
const MAX_ENGINES_PER_SCAN = 3;
const DELAY_BETWEEN_CALLS_MS = 500;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { monitorId, batchSize } = await req.json();
    if (!monitorId) throw new Error("monitorId is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch monitor config
    const { data: monitor, error: mErr } = await supabase
      .from("geo_brand_monitors")
      .select("*")
      .eq("id", monitorId)
      .single();
    if (mErr || !monitor) throw new Error("Monitor not found");

    const brandName = monitor.brand_name as string;
    const competitors = (monitor.competitors || []) as string[];
    const aiEngines = ((monitor.ai_engines || ["chatgpt", "gemini"]) as string[]).slice(0, MAX_ENGINES_PER_SCAN);

    // Fetch prompts from geo_prompts table
    const { data: promptRows } = await supabase
      .from("geo_prompts")
      .select("id, prompt_text, intent_type")
      .eq("brand_monitor_id", monitorId)
      .eq("is_active", true)
      .order("use_count", { ascending: true })
      .limit(batchSize || MAX_PROMPTS_PER_BATCH);

    // Fallback: auto-generate from keywords if no prompts configured
    let prompts: { id?: string; text: string; intent: string }[] = [];
    if (promptRows && promptRows.length > 0) {
      prompts = promptRows.map((p: any) => ({ id: p.id, text: p.prompt_text, intent: p.intent_type }));
    } else {
      const keywords = (monitor.keywords || []) as string[];
      prompts = keywords.slice(0, 5).flatMap((kw: string) => [
        { text: `${kw} là gì? Giới thiệu về ${kw}`, intent: "informational" },
        { text: `Top thương hiệu ${kw} tốt nhất hiện nay`, intent: "commercial" },
        { text: `So sánh ${brandName} với ${competitors[0] || "đối thủ"} về ${kw}`, intent: "comparison" },
      ]);
    }

    const promptLimit = Math.min(prompts.length, MAX_PROMPTS_PER_BATCH);
    const totalApiCalls = promptLimit * aiEngines.length;
    const estimatedCost = aiEngines.reduce((sum, e) => sum + (COST_PER_CALL[e] || 0.003) * promptLimit, 0);

    // Create scan job
    const { data: scanJob } = await supabase
      .from("geo_scan_jobs")
      .insert({
        organization_id: monitor.organization_id,
        brand_monitor_id: monitorId,
        status: "running",
        total_prompts: promptLimit,
        total_api_calls: totalApiCalls,
        estimated_cost_usd: estimatedCost,
        engines_used: aiEngines,
        started_at: new Date().toISOString(),
      } as any)
      .select("id")
      .single();

    const scanJobId = scanJob?.id;
    const results: any[] = [];
    let completedPrompts = 0;

    for (let pi = 0; pi < promptLimit; pi++) {
      const prompt = prompts[pi];

      for (const engine of aiEngines) {
        try {
          // Build engine-specific system prompt
          const systemPrompt = buildSystemPrompt(engine, brandName, competitors);

          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${lovableApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: getModelForEngine(engine),
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt.text },
              ],
              tools: [{
                type: "function",
                function: {
                  name: "analyze_ai_response",
                  description: "Analyze the AI response for brand mentions, citations, and sentiment",
                  parameters: {
                    type: "object",
                    properties: {
                      response_text: { type: "string", description: "The simulated AI response" },
                      brand_mentioned: { type: "boolean" },
                      mention_type: { type: "string", enum: ["direct", "implied", "comparison", "none"] },
                      mention_count: { type: "integer" },
                      citation_urls: { type: "array", items: { type: "string" } },
                      sentiment_score: { type: "integer", description: "-100 to 100" },
                      sentiment_label: { type: "string", enum: ["positive", "neutral", "negative"] },
                      competitor_mentions: {
                        type: "object",
                        description: "Map of competitor name to mention count",
                      },
                      brand_position: { type: "integer", description: "Position of brand in list (1=first, 0=not listed)" },
                      key_phrases: { type: "array", items: { type: "string" }, description: "Key phrases used to describe brand" },
                    },
                    required: ["response_text", "brand_mentioned", "mention_type", "mention_count", "sentiment_score", "sentiment_label"],
                    additionalProperties: false,
                  },
                },
              }],
              tool_choice: { type: "function", function: { name: "analyze_ai_response" } },
            }),
          });

          if (!aiResponse.ok) {
            if (aiResponse.status === 429) {
              console.warn(`Rate limited on ${engine}, skipping remaining`);
              break;
            }
            if (aiResponse.status === 402) {
              throw new Error("AI credits exhausted (402)");
            }
            console.error(`AI error ${aiResponse.status} for ${engine}`);
            continue;
          }

          const aiData = await aiResponse.json();
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
          
          if (!toolCall?.function?.arguments) continue;
          const analysis = JSON.parse(toolCall.function.arguments);

          results.push({
            organization_id: monitor.organization_id,
            brand_monitor_id: monitorId,
            ai_engine: engine,
            prompt: prompt.text,
            response: analysis.response_text || "",
            brand_mentioned: analysis.brand_mentioned || false,
            mention_count: analysis.mention_count || 0,
            citation_urls: analysis.citation_urls || [],
            sentiment_score: Math.max(-100, Math.min(100, analysis.sentiment_score || 0)),
            sentiment_label: analysis.sentiment_label || "neutral",
            competitor_mentions: analysis.competitor_mentions || {},
            scanned_at: new Date().toISOString(),
          });

          // Update prompt use_count
          if (prompt.id) {
            supabase
              .from("geo_prompts")
              .update({ use_count: (promptRows?.find((p: any) => p.id === prompt.id)?.use_count || 0) + 1, last_used_at: new Date().toISOString() } as any)
              .eq("id", prompt.id)
              .then(() => {});
          }
        } catch (err) {
          console.error(`Error scanning ${engine} for "${prompt.text.slice(0, 50)}":`, err);
        }

        // Delay between calls
        if (DELAY_BETWEEN_CALLS_MS > 0) {
          await new Promise(r => setTimeout(r, DELAY_BETWEEN_CALLS_MS));
        }
      }

      completedPrompts++;

      // Update scan job progress
      if (scanJobId) {
        supabase
          .from("geo_scan_jobs")
          .update({ completed_prompts: completedPrompts } as any)
          .eq("id", scanJobId)
          .then(() => {});
      }
    }

    // Insert results
    if (results.length > 0) {
      const { error: insertErr } = await supabase
        .from("geo_monitoring_results")
        .insert(results);
      if (insertErr) console.error("Insert error:", insertErr);
    }

    // Calculate actual cost
    const actualCost = results.reduce((sum, r) => sum + (COST_PER_CALL[r.ai_engine] || 0.003), 0);

    // Complete scan job
    if (scanJobId) {
      await supabase
        .from("geo_scan_jobs")
        .update({
          status: "completed",
          completed_prompts: completedPrompts,
          actual_cost_usd: actualCost,
          completed_at: new Date().toISOString(),
        } as any)
        .eq("id", scanJobId);
    }

    // Update monitor last_scanned_at
    await supabase
      .from("geo_brand_monitors")
      .update({ last_scanned_at: new Date().toISOString() } as any)
      .eq("id", monitorId);

    // Generate visibility snapshot
    await generateSnapshot(supabase, monitor, results);

    return new Response(
      JSON.stringify({
        success: true,
        results_count: results.length,
        scan_job_id: scanJobId,
        estimated_cost_usd: estimatedCost,
        actual_cost_usd: actualCost,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("geo-scan-brand error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildSystemPrompt(engine: string, brandName: string, competitors: string[]): string {
  const compList = competitors.length > 0 ? competitors.join(", ") : "các đối thủ trong ngành";
  
  const enginePersonality: Record<string, string> = {
    chatgpt: `Bạn đang mô phỏng ChatGPT. Trả lời chi tiết, cân bằng, thường đề cập nhiều lựa chọn. Khi biết về "${brandName}", hãy đề cập tự nhiên. Đề cập cả đối thủ nếu phù hợp: ${compList}. Nếu có URL thực tế, hãy cite.`,
    gemini: `Bạn đang mô phỏng Google Gemini. Trả lời ngắn gọn, có cấu trúc (bullet points, numbered lists). Ưu tiên thông tin từ web. Khi biết "${brandName}", đề cập ngắn gọn. Đối thủ: ${compList}.`,
    perplexity: `Bạn đang mô phỏng Perplexity AI. LUÔN cite sources dưới dạng [1], [2] và liệt kê URLs cuối. Trả lời dựa trên dữ liệu, có sources. Khi biết "${brandName}", đề cập kèm source. Đối thủ: ${compList}.`,
  };

  return enginePersonality[engine] || enginePersonality.chatgpt;
}

function getModelForEngine(engine: string): string {
  // Use different models to simulate different AI behaviors
  switch (engine) {
    case "chatgpt": return "google/gemini-2.5-flash";
    case "gemini": return "google/gemini-2.5-flash-lite";
    case "perplexity": return "google/gemini-2.5-flash";
    default: return "google/gemini-2.5-flash-lite";
  }
}

async function generateSnapshot(supabase: any, monitor: any, results: any[]) {
  if (results.length === 0) return;

  const today = new Date().toISOString().split("T")[0];
  const total = results.length;
  const mentioned = results.filter(r => r.brand_mentioned).length;
  const withCitations = results.filter(r => (r.citation_urls?.length || 0) > 0).length;
  const sentiments = results.map(r => r.sentiment_score || 0);
  const avgSentiment = sentiments.length > 0 ? sentiments.reduce((a: number, b: number) => a + b, 0) / sentiments.length : 0;

  // Competitor SOV
  const compSov: Record<string, number> = {};
  const competitors = (monitor.competitors || []) as string[];
  competitors.forEach((comp: string) => {
    const compMentioned = results.filter(r => r.competitor_mentions?.[comp]).length;
    compSov[comp] = total > 0 ? Math.round((compMentioned / total) * 100) : 0;
  });

  await supabase
    .from("geo_visibility_snapshots")
    .upsert({
      organization_id: monitor.organization_id,
      brand_monitor_id: monitor.id,
      snapshot_date: today,
      sov_percentage: total > 0 ? Math.round((mentioned / total) * 100) : 0,
      citation_rate: total > 0 ? Math.round((withCitations / total) * 100) : 0,
      avg_sentiment: Math.round(avgSentiment),
      total_scans: total,
      mentions_count: mentioned,
      citations_count: withCitations,
      competitor_sov: compSov,
    } as any, { onConflict: "brand_monitor_id,snapshot_date" });
}

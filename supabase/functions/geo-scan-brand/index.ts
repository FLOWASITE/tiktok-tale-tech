import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COST_PER_CALL: Record<string, number> = {
  chatgpt: 0.003,
  gemini: 0.001,
  perplexity: 0.005,
};

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
    const perplexityApiKey = Deno.env.get("PERPLEXITY_API_KEY");
    const openrouterApiKey = Deno.env.get("OPENROUTER_API_KEY");
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
    let actualCostTotal = 0;

    for (let pi = 0; pi < promptLimit; pi++) {
      const prompt = prompts[pi];

      for (const engine of aiEngines) {
        try {
          let result: any;

          // === REAL PERPLEXITY API (via OpenRouter or direct) ===
          if (engine === "perplexity" && (openrouterApiKey || perplexityApiKey)) {
            result = await scanWithPerplexity(openrouterApiKey || perplexityApiKey!, !!openrouterApiKey, prompt.text, brandName, competitors, monitor);
          } else {
            // === SIMULATED via Lovable AI Gateway ===
            result = await scanSimulated(lovableApiKey, engine, prompt.text, brandName, competitors, monitor);
          }

          if (result) {
            results.push(result);
            actualCostTotal += result._cost || COST_PER_CALL[engine] || 0.003;
          }

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

        if (DELAY_BETWEEN_CALLS_MS > 0) {
          await new Promise(r => setTimeout(r, DELAY_BETWEEN_CALLS_MS));
        }
      }

      completedPrompts++;
      if (scanJobId) {
        supabase
          .from("geo_scan_jobs")
          .update({ completed_prompts: completedPrompts } as any)
          .eq("id", scanJobId)
          .then(() => {});
      }
    }

    // Insert results (strip internal _cost field)
    if (results.length > 0) {
      const cleanResults = results.map(({ _cost, ...r }) => r);
      const { error: insertErr } = await supabase
        .from("geo_monitoring_results")
        .insert(cleanResults);
      if (insertErr) console.error("Insert error:", insertErr);
    }

    // Complete scan job
    if (scanJobId) {
      await supabase
        .from("geo_scan_jobs")
        .update({
          status: "completed",
          completed_prompts: completedPrompts,
          actual_cost_usd: actualCostTotal,
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
    const snapshot = await generateSnapshot(supabase, monitor, results);

    // === AUTO-GENERATE TASKS from results ===
    await autoGenerateTasks(supabase, monitor, results, snapshot);

    // === AUTO-GENERATE ALERTS from snapshot comparison ===
    await autoGenerateAlerts(supabase, monitor, snapshot);

    return new Response(
      JSON.stringify({
        success: true,
        results_count: results.length,
        scan_job_id: scanJobId,
        estimated_cost_usd: estimatedCost,
        actual_cost_usd: actualCostTotal,
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

// ============ PERPLEXITY REAL API (via OpenRouter or direct) ============
async function scanWithPerplexity(
  apiKey: string, useOpenRouter: boolean, promptText: string, brandName: string, competitors: string[], monitor: any
): Promise<any> {
  const apiUrl = useOpenRouter
    ? "https://openrouter.ai/api/v1/chat/completions"
    : "https://api.perplexity.ai/chat/completions";
  const model = useOpenRouter ? "perplexity/sonar" : "sonar";

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (useOpenRouter) {
    headers["HTTP-Referer"] = "https://tiktok-tale-tech.lovable.app";
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "Trả lời chi tiết và chính xác bằng tiếng Việt. Luôn cite sources." },
        { role: "user", content: promptText },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`Perplexity API error ${response.status}:`, errText);
    return null;
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  const citations = data.citations || [];

  // Parse brand mentions from real response
  const brandLower = brandName.toLowerCase();
  const contentLower = content.toLowerCase();
  const brandMentioned = contentLower.includes(brandLower);
  const mentionCount = (contentLower.split(brandLower).length - 1);

  // Parse competitor mentions
  const competitorMentions: Record<string, number> = {};
  competitors.forEach(comp => {
    const compLower = comp.toLowerCase();
    const count = (contentLower.split(compLower).length - 1);
    if (count > 0) competitorMentions[comp] = count;
  });

  // Simple sentiment estimation from content
  const positiveWords = ["tốt", "xuất sắc", "chất lượng", "uy tín", "hàng đầu", "phổ biến", "tin cậy", "được yêu thích"];
  const negativeWords = ["kém", "yếu", "hạn chế", "thiếu", "không tốt", "chậm", "đắt", "rủi ro"];
  let sentimentScore = 0;
  positiveWords.forEach(w => { if (contentLower.includes(w)) sentimentScore += 12; });
  negativeWords.forEach(w => { if (contentLower.includes(w)) sentimentScore -= 15; });
  sentimentScore = Math.max(-100, Math.min(100, sentimentScore));

  // Calculate cost from usage
  const usage = data.usage;
  let cost = COST_PER_CALL.perplexity;
  if (usage) {
    cost = ((usage.prompt_tokens || 0) * 0.000001 + (usage.completion_tokens || 0) * 0.000001);
    cost = Math.max(cost, 0.0001); // minimum
  }

  return {
    organization_id: monitor.organization_id,
    brand_monitor_id: monitor.id,
    ai_engine: "perplexity",
    prompt: promptText,
    response: content.slice(0, 5000),
    brand_mentioned: brandMentioned,
    mention_count: mentionCount,
    citation_urls: citations.slice(0, 10),
    sentiment_score: sentimentScore,
    sentiment_label: sentimentScore > 10 ? "positive" : sentimentScore < -10 ? "negative" : "neutral",
    competitor_mentions: competitorMentions,
    is_simulated: false,
    scanned_at: new Date().toISOString(),
    _cost: cost,
  };
}

// ============ SIMULATED via Lovable AI Gateway ============
async function scanSimulated(
  lovableApiKey: string, engine: string, promptText: string, brandName: string, competitors: string[], monitor: any
): Promise<any> {
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
        { role: "user", content: promptText },
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
              competitor_mentions: { type: "object", description: "Map of competitor name to mention count" },
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
      console.warn(`Rate limited on ${engine}, skipping`);
      return null;
    }
    if (aiResponse.status === 402) {
      throw new Error("AI credits exhausted (402)");
    }
    const text = await aiResponse.text();
    console.error(`AI error ${aiResponse.status} for ${engine}:`, text);
    return null;
  }

  const aiData = await aiResponse.json();
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) return null;

  const analysis = JSON.parse(toolCall.function.arguments);

  return {
    organization_id: monitor.organization_id,
    brand_monitor_id: monitor.id,
    ai_engine: engine,
    prompt: promptText,
    response: analysis.response_text || "",
    brand_mentioned: analysis.brand_mentioned || false,
    mention_count: analysis.mention_count || 0,
    citation_urls: analysis.citation_urls || [],
    sentiment_score: Math.max(-100, Math.min(100, analysis.sentiment_score || 0)),
    sentiment_label: analysis.sentiment_label || "neutral",
    competitor_mentions: analysis.competitor_mentions || {},
    is_simulated: true,
    scanned_at: new Date().toISOString(),
    _cost: COST_PER_CALL[engine] || 0.003,
  };
}

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
  switch (engine) {
    case "chatgpt": return "google/gemini-2.5-flash";
    case "gemini": return "google/gemini-2.5-flash-lite";
    case "perplexity": return "google/gemini-2.5-flash";
    default: return "google/gemini-2.5-flash-lite";
  }
}

// ============ SNAPSHOT ============
async function generateSnapshot(supabase: any, monitor: any, results: any[]): Promise<any> {
  if (results.length === 0) return null;

  const today = new Date().toISOString().split("T")[0];
  const total = results.length;
  const mentioned = results.filter(r => r.brand_mentioned).length;
  const withCitations = results.filter(r => (r.citation_urls?.length || 0) > 0).length;
  const sentiments = results.map(r => r.sentiment_score || 0);
  const avgSentiment = sentiments.length > 0 ? sentiments.reduce((a: number, b: number) => a + b, 0) / sentiments.length : 0;

  const compSov: Record<string, number> = {};
  const competitors = (monitor.competitors || []) as string[];
  competitors.forEach((comp: string) => {
    const compMentioned = results.filter(r => r.competitor_mentions?.[comp]).length;
    compSov[comp] = total > 0 ? Math.round((compMentioned / total) * 100) : 0;
  });

  const snapshot = {
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
  };

  await supabase
    .from("geo_visibility_snapshots")
    .upsert(snapshot as any, { onConflict: "brand_monitor_id,snapshot_date" });

  return snapshot;
}

// ============ AUTO-GENERATE TASKS ============
async function autoGenerateTasks(supabase: any, monitor: any, results: any[], snapshot: any) {
  if (!snapshot || results.length === 0) return;

  const orgId = monitor.organization_id;
  const monitorId = monitor.id;

  // Check existing pending/in_progress tasks to avoid duplicates
  const { data: existingTasks } = await supabase
    .from("geo_action_tasks")
    .select("title, status")
    .eq("brand_monitor_id", monitorId)
    .in("status", ["pending", "in_progress"]);

  const existingTitles = new Set((existingTasks || []).map((t: any) => t.title));
  const tasksToCreate: any[] = [];

  // Rule 1: Low SOV
  if (snapshot.sov_percentage < 20) {
    const title = `Tăng brand visibility cho "${monitor.brand_name}" (SOV: ${snapshot.sov_percentage}%)`;
    if (!existingTitles.has(title)) {
      tasksToCreate.push({
        organization_id: orgId,
        brand_monitor_id: monitorId,
        source_module: "monitor",
        priority: "strategic",
        title,
        description: `SOV hiện tại chỉ ${snapshot.sov_percentage}%. Cần tối ưu content để AI engines đề cập brand nhiều hơn.`,
        status: "pending",
        impact_score: 90,
        effort_level: "high",
      });
    }
  }

  // Rule 2: Negative sentiment
  if (snapshot.avg_sentiment < -20) {
    const title = `Cải thiện sentiment AI cho "${monitor.brand_name}" (${snapshot.avg_sentiment})`;
    if (!existingTitles.has(title)) {
      tasksToCreate.push({
        organization_id: orgId,
        brand_monitor_id: monitorId,
        source_module: "monitor",
        priority: "quick_win",
        title,
        description: `Sentiment trung bình ${snapshot.avg_sentiment}. Review content strategy và tạo nội dung tích cực.`,
        status: "pending",
        impact_score: 80,
        effort_level: "medium",
      });
    }
  }

  // Rule 3: No citations
  if (snapshot.citation_rate === 0) {
    const title = `Thêm citation signals cho "${monitor.brand_name}"`;
    if (!existingTitles.has(title)) {
      tasksToCreate.push({
        organization_id: orgId,
        brand_monitor_id: monitorId,
        source_module: "monitor",
        priority: "optimization",
        title,
        description: `Không có citation nào từ AI engines. Cần thêm structured data, schema markup và cải thiện SEO.`,
        status: "pending",
        impact_score: 70,
        effort_level: "medium",
      });
    }
  }

  // Rule 4: Competitor SOV higher
  const competitors = (monitor.competitors || []) as string[];
  const compSov = snapshot.competitor_sov || {};
  competitors.forEach((comp: string) => {
    if ((compSov[comp] || 0) > snapshot.sov_percentage + 10) {
      const title = `Đối thủ "${comp}" có SOV cao hơn (${compSov[comp]}% vs ${snapshot.sov_percentage}%)`;
      if (!existingTitles.has(title)) {
        tasksToCreate.push({
          organization_id: orgId,
          brand_monitor_id: monitorId,
          source_module: "competitor",
          priority: "strategic",
          title,
          description: `${comp} đang được AI đề cập nhiều hơn. Phân tích content strategy của đối thủ.`,
          status: "pending",
          impact_score: 85,
          effort_level: "high",
        });
      }
    }
  });

  if (tasksToCreate.length > 0) {
    const { error } = await supabase.from("geo_action_tasks").insert(tasksToCreate);
    if (error) console.error("Auto-task creation error:", error);
    else console.log(`Created ${tasksToCreate.length} auto tasks`);
  }
}

// ============ AUTO-GENERATE ALERTS ============
async function autoGenerateAlerts(supabase: any, monitor: any, currentSnapshot: any) {
  if (!currentSnapshot) return;

  // Get previous snapshot
  const { data: prevSnapshots } = await supabase
    .from("geo_visibility_snapshots")
    .select("*")
    .eq("brand_monitor_id", monitor.id)
    .lt("snapshot_date", currentSnapshot.snapshot_date)
    .order("snapshot_date", { ascending: false })
    .limit(1);

  const prev = prevSnapshots?.[0];
  if (!prev) return; // No previous data to compare

  const alerts: any[] = [];
  const orgId = monitor.organization_id;
  const monitorId = monitor.id;

  // SOV significant change (±10%)
  const sovDiff = currentSnapshot.sov_percentage - (prev.sov_percentage || 0);
  if (Math.abs(sovDiff) >= 10) {
    alerts.push({
      organization_id: orgId,
      brand_monitor_id: monitorId,
      alert_type: sovDiff > 0 ? "sov_spike" : "sov_drop",
      severity: Math.abs(sovDiff) >= 20 ? "high" : "medium",
      title: sovDiff > 0
        ? `SOV tăng ${sovDiff}% (${prev.sov_percentage}% → ${currentSnapshot.sov_percentage}%)`
        : `SOV giảm ${Math.abs(sovDiff)}% (${prev.sov_percentage}% → ${currentSnapshot.sov_percentage}%)`,
      description: sovDiff > 0
        ? `Brand visibility đang cải thiện. Tiếp tục chiến lược content hiện tại.`
        : `Brand visibility đang giảm. Cần review content strategy ngay.`,
      data: { previous: prev.sov_percentage, current: currentSnapshot.sov_percentage, diff: sovDiff },
      is_read: false,
    });
  }

  // Sentiment significant drop (>15 points)
  const sentDiff = currentSnapshot.avg_sentiment - (prev.avg_sentiment || 0);
  if (sentDiff < -15) {
    alerts.push({
      organization_id: orgId,
      brand_monitor_id: monitorId,
      alert_type: "sentiment_drop",
      severity: sentDiff < -30 ? "high" : "medium",
      title: `Sentiment giảm ${Math.abs(sentDiff)} điểm (${prev.avg_sentiment} → ${currentSnapshot.avg_sentiment})`,
      description: `AI đang mô tả brand với tông tiêu cực hơn trước. Review nội dung và phản hồi.`,
      data: { previous: prev.avg_sentiment, current: currentSnapshot.avg_sentiment, diff: sentDiff },
      is_read: false,
    });
  }

  // Citation rate change
  const citDiff = currentSnapshot.citation_rate - (prev.citation_rate || 0);
  if (Math.abs(citDiff) >= 15) {
    alerts.push({
      organization_id: orgId,
      brand_monitor_id: monitorId,
      alert_type: citDiff > 0 ? "citation_increase" : "citation_drop",
      severity: "medium",
      title: citDiff > 0
        ? `Citation rate tăng ${citDiff}%`
        : `Citation rate giảm ${Math.abs(citDiff)}%`,
      description: `Citation rate: ${prev.citation_rate}% → ${currentSnapshot.citation_rate}%`,
      data: { previous: prev.citation_rate, current: currentSnapshot.citation_rate, diff: citDiff },
      is_read: false,
    });
  }

  if (alerts.length > 0) {
    const { error } = await supabase.from("geo_alert_history").insert(alerts);
    if (error) console.error("Alert creation error:", error);
    else console.log(`Created ${alerts.length} alerts`);
  }
}

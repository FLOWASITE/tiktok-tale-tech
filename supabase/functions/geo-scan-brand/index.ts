import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { monitorId } = await req.json();
    if (!monitorId) throw new Error("monitorId is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch monitor config
    const { data: monitor, error: mErr } = await supabase
      .from("geo_brand_monitors")
      .select("*")
      .eq("id", monitorId)
      .single();

    if (mErr || !monitor) throw new Error("Monitor not found");

    const brandName = monitor.brand_name;
    const keywords = monitor.keywords || [];
    const competitors = monitor.competitors || [];
    const aiEngines = monitor.ai_engines || ["chatgpt", "gemini"];

    // Generate prompts based on keywords
    const prompts = keywords.flatMap((kw: string) => [
      `${kw} là gì? Giới thiệu về ${kw}`,
      `So sánh ${kw} với các đối thủ cạnh tranh`,
      `Top thương hiệu ${kw} tốt nhất hiện nay`,
      `Đánh giá ${kw} có tốt không?`,
      `Nên chọn ${kw} hay ${competitors[0] || 'đối thủ'} ?`,
    ]);

    const results: any[] = [];

    if (!lovableApiKey) {
      // No API key — create mock results for structure
      for (const prompt of prompts.slice(0, 10)) {
        for (const engine of aiEngines) {
          results.push({
            organization_id: monitor.organization_id,
            brand_monitor_id: monitorId,
            ai_engine: engine,
            prompt,
            response: `[Simulated] Response for "${prompt}" on ${engine}`,
            brand_mentioned: Math.random() > 0.4,
            mention_count: Math.floor(Math.random() * 3),
            citation_urls: [],
            sentiment_score: Math.round((Math.random() * 100) - 30),
            sentiment_label: "neutral",
            competitor_mentions: {},
            scanned_at: new Date().toISOString(),
          });
        }
      }
    } else {
      // Use Lovable AI to simulate AI engine responses
      for (const prompt of prompts.slice(0, 5)) {
        for (const engine of aiEngines.slice(0, 2)) {
          try {
            const aiResponse = await fetch(
              "https://ai.gateway.lovable.dev/v1/chat/completions",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${lovableApiKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: "google/gemini-2.5-flash-lite",
                  messages: [
                    {
                      role: "system",
                      content: `Bạn đang giả lập ${engine}. Trả lời câu hỏi người dùng một cách tự nhiên bằng tiếng Việt. Nếu biết về brand "${brandName}", hãy đề cập. Trả lời ngắn gọn (100-200 từ).`,
                    },
                    { role: "user", content: prompt },
                  ],
                }),
              }
            );

            if (!aiResponse.ok) {
              const errText = await aiResponse.text();
              console.error(`AI gateway error for ${engine}:`, aiResponse.status, errText);
              continue;
            }

            const aiData = await aiResponse.json();
            const responseText = aiData.choices?.[0]?.message?.content || "";

            // Analyze response
            const brandLower = brandName.toLowerCase();
            const responseLower = responseText.toLowerCase();
            const mentioned = responseLower.includes(brandLower);
            const mentionCount = (responseLower.match(new RegExp(brandLower, "g")) || []).length;

            // Extract URLs
            const urlRegex = /https?:\/\/[^\s)]+/g;
            const citationUrls = responseText.match(urlRegex) || [];

            // Simple sentiment: count positive/negative words
            const positiveWords = ["tốt", "chất lượng", "uy tín", "hàng đầu", "xuất sắc", "nổi bật", "đáng tin"];
            const negativeWords = ["kém", "tệ", "thất vọng", "không tốt", "yếu", "thiếu"];
            let sentimentScore = 0;
            positiveWords.forEach(w => { if (responseLower.includes(w)) sentimentScore += 15; });
            negativeWords.forEach(w => { if (responseLower.includes(w)) sentimentScore -= 20; });
            sentimentScore = Math.max(-100, Math.min(100, sentimentScore));

            // Check competitor mentions
            const compMentions: Record<string, boolean> = {};
            competitors.forEach((comp: string) => {
              compMentions[comp] = responseLower.includes(comp.toLowerCase());
            });

            results.push({
              organization_id: monitor.organization_id,
              brand_monitor_id: monitorId,
              ai_engine: engine,
              prompt,
              response: responseText,
              brand_mentioned: mentioned,
              mention_count: mentionCount,
              citation_urls: citationUrls,
              sentiment_score: sentimentScore,
              sentiment_label: sentimentScore > 20 ? "positive" : sentimentScore < -20 ? "negative" : "neutral",
              competitor_mentions: compMentions,
              scanned_at: new Date().toISOString(),
            });
          } catch (err) {
            console.error(`Error scanning ${engine} for prompt "${prompt}":`, err);
          }
        }
      }
    }

    // Insert results
    if (results.length > 0) {
      const { error: insertErr } = await supabase
        .from("geo_monitoring_results")
        .insert(results);
      if (insertErr) console.error("Insert error:", insertErr);
    }

    // Update last_scanned_at
    await supabase
      .from("geo_brand_monitors")
      .update({ last_scanned_at: new Date().toISOString() })
      .eq("id", monitorId);

    return new Response(
      JSON.stringify({ success: true, results_count: results.length }),
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

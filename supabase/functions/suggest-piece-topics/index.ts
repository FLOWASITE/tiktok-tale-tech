import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { callAI } from "../_shared/ai-provider.ts";
import { withCache } from "../_shared/cache-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ANGLE_LABELS: Record<string, string> = {
  educational: "Educational / how-to",
  comparison: "Comparison / vs.",
  case_study: "Case study with real numbers",
  behind_the_scenes: "Behind-the-scenes story",
  tips_tricks: "Tips & tricks list",
  myth_busting: "Myth-busting / common mistakes",
  testimonial: "Customer testimonial",
  seasonal_hook: "Seasonal / timely hook",
  cta_offer: "Direct offer / CTA",
  storytelling: "Brand storytelling",
};

const ROLE_LABELS: Record<string, string> = {
  seed: "Seed (top-funnel attract)",
  sprout: "Sprout (mid-funnel nurture)",
  harvest: "Harvest (bottom-funnel convert)",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const piece = body?.piece || {};
    const brandTemplateId: string | undefined = body?.brand_template_id;
    const organizationId: string | undefined = body?.organization_id;
    const campaignTitle: string = body?.campaign_title || "";
    const existingTitles: string[] = Array.isArray(body?.existing_titles)
      ? body.existing_titles.filter((t: unknown) => typeof t === "string").slice(0, 30)
      : [];
    const clarification = body?.clarification_context || {};

    if (!piece || !piece.angle || !piece.content_role) {
      return new Response(
        JSON.stringify({ error: "Thiếu thông tin piece (angle, content_role)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch brand context
    let brandName = "";
    let industry = "";
    let toneOfVoice = "";
    let brandPositioning = "";
    let targetAudience = "";
    if (brandTemplateId) {
      try {
        const { data: brand } = await supabase
          .from("brand_templates")
          .select("brand_name, industry, tone_of_voice, brand_positioning, target_audience")
          .eq("id", brandTemplateId)
          .maybeSingle();
        if (brand) {
          brandName = brand.brand_name || "";
          industry = brand.industry || "";
          toneOfVoice = (brand as any).tone_of_voice || "";
          brandPositioning = (brand as any).brand_positioning || "";
          targetAudience = (brand as any).target_audience || "";
        }
      } catch { /* ignore */ }
    }

    const angleLabel = ANGLE_LABELS[piece.angle] || piece.angle;
    const roleLabel = ROLE_LABELS[piece.content_role] || piece.content_role;
    const channel = piece.target_channel || "facebook";
    const pillar = piece.pillar || "(no specific pillar)";
    const currentTitle = piece.title || "";
    const currentKeyMessage = piece.key_message || "";
    const keyMessages = Array.isArray(clarification?.key_messages)
      ? (clarification.key_messages as string[]).slice(0, 5)
      : [];

    const dedupBlock = existingTitles.length > 0
      ? `\nAVOID titles similar to these already in the plan:\n${existingTitles.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n`
      : "";

    const prompt = `You are a senior content strategist for SEA brands. Your job is to propose 5 DIFFERENT topic ideas for ONE piece of a content campaign. The output language MUST be Vietnamese.

CAMPAIGN: "${campaignTitle}"
BRAND: ${brandName || "(unknown)"} — Industry: ${industry || "(unknown)"}
Brand voice: ${toneOfVoice || "(not specified)"}
Brand positioning: ${brandPositioning || "(not specified)"}
Target audience: ${targetAudience || "(not specified)"}
${keyMessages.length ? `Key messages to honor: ${keyMessages.map((m) => `"${m}"`).join("; ")}` : ""}

THIS PIECE'S FIXED CONSTRAINTS (do not change):
- Angle: ${angleLabel}
- Content role: ${roleLabel}
- Target channel: ${channel}
- Pillar: ${pillar}
- Current draft title: "${currentTitle}"
- Current key message: "${currentKeyMessage}"
${dedupBlock}
RULES:
1. Propose EXACTLY 5 distinct topic ideas.
2. Each idea MUST be on-brand, on-industry, and respect the angle + role above.
3. Vary the hooks: number/list, question, contrarian, story, benefit-led — do not repeat patterns.
4. Titles must be specific (mention industry concepts, audience pain, or concrete outcome). Avoid vague clickbait.
5. Each idea includes: a Vietnamese title (≤ 90 chars), a 1-sentence hook (≤ 140 chars) explaining the angle, and a tight key_message (≤ 120 chars).
6. Output Vietnamese. No emoji in title. Tone matches brand voice.

Return ONLY valid JSON in this exact shape:
{
  "suggestions": [
    { "title": "...", "hook": "...", "key_message": "..." }
  ]
}`;

    type Suggestion = { title: string; hook: string; key_message: string };

    const generateSuggestions = async (): Promise<Suggestion[]> => {
      const aiResult = await callAI({
        functionName: "suggest-piece-topics",
        organizationId,
        messages: [{ role: "user", content: prompt }],
        temperatureOverride: 0.7,
        maxTokensOverride: 900,
      } as any);

      if (!aiResult?.success) {
        const errMsg = aiResult?.error || "AI call failed";
        console.error("[suggest-piece-topics] AI error:", errMsg);
        const err = new Error(errMsg) as Error & { code?: string };
        if (errMsg.includes("429") || errMsg.toLowerCase().includes("rate limit")) err.code = "RATE_LIMIT";
        else if (errMsg.includes("402") || errMsg.includes("Payment") || errMsg.includes("credits")) err.code = "CREDITS_EXHAUSTED";
        throw err;
      }

      const content = aiResult.data?.choices?.[0]?.message?.content || "";
      let parsed: any = null;
      try {
        parsed = JSON.parse(content);
      } catch {
        const m = content.match(/\{[\s\S]*\}/);
        if (m) {
          try { parsed = JSON.parse(m[0]); } catch { /* ignore */ }
        }
      }

      const rawList = Array.isArray(parsed?.suggestions) ? parsed.suggestions : [];
      return rawList
        .map((s: any) => ({
          title: typeof s?.title === "string" ? s.title.trim().slice(0, 140) : "",
          hook: typeof s?.hook === "string" ? s.hook.trim().slice(0, 180) : "",
          key_message: typeof s?.key_message === "string" ? s.key_message.trim().slice(0, 200) : "",
        }))
        .filter((s: Suggestion) => s.title.length > 0)
        .slice(0, 5);
    };

    let suggestions: Suggestion[] = [];
    let fromCache = false;

    try {
      if (organizationId) {
        // 7-day cache scoped to org. Key includes brand + pillar + angle + role + channel + existing titles.
        const cached = await withCache<Suggestion[]>({
          functionName: "suggest-piece-topics",
          scope: "org",
          organizationId,
          brandTemplateId,
          input: {
            brand_template_id: brandTemplateId || "",
            pillar,
            angle: piece.angle,
            content_role: piece.content_role,
            channel,
            current_title: currentTitle,
            current_key_message: currentKeyMessage,
            campaign_title: campaignTitle,
            existing_titles: existingTitles,
            key_messages: keyMessages,
          },
          versions: { brandVoice: brandTemplateId || "none" },
          ttlDays: 7,
          generateFn: generateSuggestions,
          validateFn: (data) => Array.isArray(data) && data.length > 0,
        });
        suggestions = cached.data;
        fromCache = cached.fromCache;
      } else {
        suggestions = await generateSuggestions();
      }
    } catch (err) {
      const e = err as Error & { code?: string };
      if (e.code === "RATE_LIMIT") {
        return new Response(
          JSON.stringify({ error: "Quá nhiều yêu cầu, thử lại sau ít giây", errorCode: "RATE_LIMIT" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (e.code === "CREDITS_EXHAUSTED") {
        return new Response(
          JSON.stringify({ error: "Hết AI credits. Vui lòng nạp tại Settings → Usage.", errorCode: "CREDITS_EXHAUSTED" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ error: e.message || "AI call failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (suggestions.length === 0) {
      return new Response(
        JSON.stringify({ error: "AI không trả về gợi ý hợp lệ. Vui lòng thử lại." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ suggestions, cached: fromCache }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (e) {
    console.error("[suggest-piece-topics] Error:", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message || "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

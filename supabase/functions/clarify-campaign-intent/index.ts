import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { callAI } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const title = body.title || body.campaign_title;
    const description = body.description || body.campaign_description || "";
    const channels = body.channels || body.target_channels || [];
    const brandTemplateId = body.brand_template_id;
    const organizationId = body.organization_id;
    let brandName = body.brand_name || "";
    let industry = body.industry || "";

    // NEW: strategic context already provided in earlier wizard steps
    const objectivesArr: string[] = Array.isArray(body.objectives) ? body.objectives : [];
    const primaryObjective: string = body.primary_objective || objectivesArr[0] || body.objective || "";
    const secondaryObjectives: string[] = objectivesArr.slice(1);
    const objective: string = primaryObjective; // backward-compat
    const keyMessages: string[] = Array.isArray(body.key_messages) ? body.key_messages : [];
    const primaryCta: string = body.primary_cta || "";
    const pillars: string[] = Array.isArray(body.pillars) ? body.pillars : [];
    const kpiTargets = body.kpi_targets && typeof body.kpi_targets === "object" ? body.kpi_targets : {};
    const totalPostsTarget: number | undefined = body.total_posts_target;
    const durationDays: number | undefined = body.duration_days;

    if (!title) {
      return new Response(
        JSON.stringify({ error: "title is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (brandTemplateId && (!brandName || !industry)) {
      try {
        const { data: brand } = await supabase
          .from("brand_templates")
          .select("brand_name, industry, tone_of_voice")
          .eq("id", brandTemplateId)
          .single();
        if (brand) {
          brandName = brandName || brand.brand_name || "";
          industry = industry || brand.industry || "";
        }
      } catch { /* ignore */ }
    }

    const channelList = (Array.isArray(channels) ? channels : []).join(", ") || "chưa chọn";

    // ─── Heuristic name-quality check (mirror of src/lib/campaignNameQuality.ts) ───
    const nameQuality = analyzeName(title);

    // Expanded 7-criteria completeness
    const hasDetailedTitle = (title?.length || 0) > 15;
    const hasDescription = (description?.length || 0) > 20;
    const hasChannels = channels.length > 0;
    const hasBrand = !!brandName;
    const hasObjective = !!objective;
    const hasMessagesOrCta = keyMessages.length > 0 || !!primaryCta;
    const hasPillars = pillars.length > 0;
    const completenessScore = [hasDetailedTitle, hasDescription, hasChannels, hasBrand, hasObjective, hasMessagesOrCta, hasPillars].filter(Boolean).length;

    // Server-side fast-path: enough context AND name has meaning → skip AI call
    if (nameQuality.status === "ok" && hasObjective && (hasMessagesOrCta || hasPillars) && (hasDetailedTitle || hasDescription)) {
      return new Response(
        JSON.stringify({
          ready: true,
          understanding: `Tạo chiến dịch "${title}" — mục tiêu ${objective}${primaryCta ? `, CTA: ${primaryCta}` : ""}.`,
          completeness_score: completenessScore,
          skipped: "sufficient_context",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const strategicContext = [
      objective && `- Primary objective: ${objective} (70% weight)`,
      secondaryObjectives.length > 0 && `- Secondary objectives: ${secondaryObjectives.join(", ")} (30% weight)`,
      keyMessages.length > 0 && `- Key messages: ${keyMessages.join(" | ")}`,
      primaryCta && `- Primary CTA: ${primaryCta}`,
      pillars.length > 0 && `- Content pillars: ${pillars.join(", ")}`,
      Object.keys(kpiTargets).length > 0 && `- KPI targets: ${JSON.stringify(kpiTargets)}`,
      totalPostsTarget && `- Posts target: ${totalPostsTarget}`,
      durationDays && `- Duration: ${durationDays} days`,
    ].filter(Boolean).join("\n") || "(none beyond title/description)";

    const prompt = `You are a content strategist. A user wants to create a content campaign.

Campaign title: "${title}"
Campaign description: "${description || "not provided"}"
Brand name: "${brandName || "not provided"}"
Brand industry: "${industry || "not provided"}"
Target channels: ${channelList}

Strategic context already provided in earlier wizard steps:
${strategicContext}

Brief completeness: ${completenessScore}/7 criteria met.
Heuristic name quality: ${nameQuality.status}${nameQuality.reason ? ` (${nameQuality.reason})` : ""}.

## TASK 1 — Evaluate the campaign title
Decide if the title is one of:
- "ok": meaningful AND clearly related to description/brand/objective.
- "vague": real words but too generic, missing product/audience/timing/angle (e.g. "Chiến dịch marketing", "Bài viết tháng 4").
- "irrelevant": title talks about something different from description/brand/industry/objective (e.g. title "Khuyến mãi mùa hè" but description is "Webinar B2B AI").
- "gibberish": random characters, placeholder, or repeated tokens (e.g. "asdf asdf", "test 123", "aaaaaa").

If title is NOT "ok", you MUST suggest exactly 3 alternative names in the SAME LANGUAGE as the description/brand/industry (fallback: same language as title). Each suggestion must be 4–12 words, specific (mention product, audience, timing, or angle), and tied to the description/objective.

## TASK 2 — Decide if you have enough info to create high-quality content
The user has already gone through 3 wizard steps — DO NOT ask things they already specified above.

RULES:
- If completeness >= 5 AND title is "ok" → ready: true.
- If objective + (key messages OR pillars) are set AND title is "ok" → ready: true.
- Only ask when title is "ok" but topic specificity, brand differentiator, or tone preference is truly missing.
- Maximum 2 questions. Each with exactly 3 suggestions.
- NEVER ask about: objective, audience, CTA, key messages, pillars, channels, duration — already collected.

## Output JSON shape (return ONLY valid JSON, no markdown)

If title is NOT "ok":
{ "ready": false, "name_issue": "vague" | "irrelevant" | "gibberish", "name_issue_reason": "1 short sentence in same language as title", "suggested_names": ["...", "...", "..."] }

If title is "ok" AND you have enough info:
{ "ready": true, "name_quality": "ok", "understanding": "1-sentence summary in same language as title" }

If title is "ok" but you need clarification:
{ "ready": false, "name_quality": "ok", "questions": [ { "question": "...", "why": "...", "suggestions": ["a","b","c"] } ] }

Respond in the SAME LANGUAGE as the campaign title/description.`;

    const aiResult = await callAI({
      functionName: "clarify-campaign-intent",
      organizationId,
      messages: [{ role: "user", content: prompt }],
      temperatureOverride: 0.2,
      maxTokensOverride: 800,
    });

    if (!aiResult.success) {
      console.error("[clarify-campaign-intent] AI error:", aiResult.error);
      return new Response(
        JSON.stringify({ ready: true, understanding: `Tạo nội dung về "${title}"`, completeness_score: completenessScore }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const content = aiResult.data?.choices?.[0]?.message?.content || "";

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = { ready: true, understanding: `Tạo nội dung về "${title}"` };
      }
    }

    // Enforce max 2 questions even if AI ignores instruction
    if (parsed?.questions && Array.isArray(parsed.questions)) {
      parsed.questions = parsed.questions.slice(0, 2);
    }
    parsed.completeness_score = completenessScore;

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[clarify-campaign-intent] Error:", e);
    return new Response(
      JSON.stringify({ ready: true, understanding: "Đủ thông tin để bắt đầu" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

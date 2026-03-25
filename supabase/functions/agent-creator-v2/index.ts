// ============================================
// Agent Creator V2 — Content Router
//
// Routes by content_type and calls existing Edge Functions:
//   multichannel  → generate-core-content + generate-multichannel
//   video_script  → generate-script + analyze-script + improve-script
//   carousel      → generate-carousel
//
// Includes Brief Assembly + Self-Review (6 criteria)
// ============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Types ───

interface CreatorInput {
  pipeline_id: string;
  content_type: "multichannel" | "video_script" | "carousel";
  topic: string;
  organization_id: string;
  brand_template_id?: string | null;
  campaign_context?: {
    plan_id?: string;
    piece_number?: number;
    total_pieces?: number;
    angle?: string;
    content_role?: string;
    target_channel?: string;
    estimated_length?: string;
    campaign_title?: string;
    clarification_context?: Record<string, string>;
  };
  target_channels?: string[];
  content_goal?: string;
  content_angle?: string;
  content_role?: string;
  length_mode?: string;
  campaign_id?: string | null;
}

interface BrandBrief {
  brand_name?: string;
  brand_positioning?: string;
  tone_of_voice?: string;
  industry?: string;
  content_pillars?: string[];
  target_audience?: string;
  forbidden_words?: string[];
  preferred_words?: string[];
  formality_level?: string;
  language_style?: string;
  unique_value_proposition?: string;
}

interface SelfReviewScores {
  brand_voice: number;
  topic_relevance: number;
  structure: number;
  depth: number;
  language_quality: number;
  platform_fit: number;
  overall: number;
  verdict: "pass" | "revise" | "fail";
  feedback?: string;
}

interface CreatorResult {
  success: boolean;
  content_type: string;
  content_id?: string;
  title?: string;
  output?: any;
  self_review?: SelfReviewScores;
  error?: string;
}

// ─── Helper: call Edge Function ───

async function callFunction(supabaseUrl: string, serviceKey: string, fnName: string, body: Record<string, unknown>) {
  const res = await fetch(`${supabaseUrl}/functions/v1/${fnName}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `${fnName} returned ${res.status}`);
  return data;
}

// ─── Brief Assembly ───

async function assembleBrief(
  supabase: any,
  brandTemplateId: string | null | undefined,
  organizationId: string
): Promise<BrandBrief> {
  if (!brandTemplateId) return {};

  const { data: brand } = await supabase
    .from("brand_templates")
    .select(
      "brand_name, brand_positioning, tone_of_voice, industry, content_pillars, " +
      "unique_value_proposition, forbidden_words, preferred_words, formality_level, language_style"
    )
    .eq("id", brandTemplateId)
    .single();

  if (!brand) return {};

  // Fetch target audience from personas
  let targetAudience = "";
  const { data: personas } = await supabase
    .from("customer_personas")
    .select("name, occupation, age_range, pain_points")
    .eq("brand_template_id", brandTemplateId)
    .eq("is_primary", true)
    .limit(2);

  if (personas?.length) {
    targetAudience = personas
      .map((p: any) => `${p.name} (${p.occupation || ""}, ${p.age_range || ""})`)
      .join("; ");
  }

  return {
    brand_name: brand.brand_name,
    brand_positioning: brand.brand_positioning,
    tone_of_voice: brand.tone_of_voice,
    industry: brand.industry,
    content_pillars: brand.content_pillars,
    unique_value_proposition: brand.unique_value_proposition,
    forbidden_words: brand.forbidden_words,
    preferred_words: brand.preferred_words,
    formality_level: brand.formality_level,
    language_style: brand.language_style,
    target_audience: targetAudience,
  };
}

// ─── Self-Review (6 criteria) ───

async function selfReview(
  contentText: string,
  contentType: string,
  topic: string,
  brief: BrandBrief,
  targetChannel?: string
): Promise<SelfReviewScores | null> {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableApiKey || !contentText) return null;

  const prompt = `Đánh giá chất lượng nội dung ${contentType} theo 6 tiêu chí (0-100):

CHỦ ĐỀ: ${topic}
KÊNH: ${targetChannel || "đa kênh"}
${brief.brand_name ? `BRAND: ${brief.brand_name}. Tone: ${brief.tone_of_voice || "N/A"}. Ngành: ${brief.industry || "N/A"}.` : ""}
${brief.forbidden_words?.length ? `TỪ CẤM: ${brief.forbidden_words.join(", ")}` : ""}

NỘI DUNG (trích):
${contentText.slice(0, 4000)}

Đánh giá 6 tiêu chí:
1. brand_voice (0-100): Tone phù hợp với brand? Có dùng từ cấm không?
2. topic_relevance (0-100): Bám sát chủ đề "${topic}"?
3. structure (0-100): Cấu trúc logic, rõ ràng?
4. depth (0-100): Nội dung sâu, có giá trị?
5. language_quality (0-100): Ngôn ngữ tự nhiên, không lỗi?
6. platform_fit (0-100): Phù hợp với kênh ${targetChannel || "đa kênh"}?

Trả về JSON:
{
  "brand_voice": <number>,
  "topic_relevance": <number>,
  "structure": <number>,
  "depth": <number>,
  "language_quality": <number>,
  "platform_fit": <number>,
  "feedback": "<1-2 câu nhận xét ngắn>"
}`;

  try {
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Bạn là AI đánh giá chất lượng nội dung. Luôn trả về JSON hợp lệ." },
          { role: "user", content: prompt },
        ],
      }),
    });

    const aiData = await aiRes.json();
    const raw = aiData?.choices?.[0]?.message?.content || "";
    const parsed = parseJsonFromLLM(raw);

    if (!parsed) return null;

    const scores = {
      brand_voice: clamp(parsed.brand_voice || 70),
      topic_relevance: clamp(parsed.topic_relevance || 70),
      structure: clamp(parsed.structure || 70),
      depth: clamp(parsed.depth || 70),
      language_quality: clamp(parsed.language_quality || 70),
      platform_fit: clamp(parsed.platform_fit || 70),
    };

    // Weighted average
    const overall = Math.round(
      scores.brand_voice * 0.20 +
      scores.topic_relevance * 0.25 +
      scores.structure * 0.15 +
      scores.depth * 0.15 +
      scores.language_quality * 0.10 +
      scores.platform_fit * 0.15
    );

    const verdict: "pass" | "revise" | "fail" =
      overall >= 70 ? "pass" : overall >= 50 ? "revise" : "fail";

    return {
      ...scores,
      overall,
      verdict,
      feedback: parsed.feedback || undefined,
    };
  } catch (e) {
    console.warn("[self-review] Failed:", e);
    return null;
  }
}

// ─── Helper: Generate images for channels (max 3 concurrent) ───

async function generateImagesForChannels(
  supabaseUrl: string,
  serviceKey: string,
  contentId: string,
  channels: string[],
  brandTemplateId: string | null | undefined,
): Promise<{ success: string[]; failed: string[] }> {
  const success: string[] = [];
  const failed: string[] = [];
  const batchSize = 3;

  for (let i = 0; i < channels.length; i += batchSize) {
    const batch = channels.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(channel =>
        callFunction(supabaseUrl, serviceKey, "generate-brand-image", {
          contentId,
          channel,
          brandTemplateId: brandTemplateId || undefined,
          imageContentType: "with_text",
        })
      )
    );
    results.forEach((r, idx) => {
      if (r.status === "fulfilled") {
        success.push(batch[idx]);
      } else {
        console.warn(`[multichannel] Image failed for channel ${batch[idx]}:`, r.reason);
        failed.push(batch[idx]);
      }
    });
  }
  return { success, failed };
}

// ─── Helper: Generate carousel images (Phase 2) ───

async function generateCarouselImages(
  supabaseUrl: string,
  serviceKey: string,
  carouselId: string,
  slides: any[],
  brandTemplateId: string | null | undefined,
  visualPreset: string,
  carouselStyle: string,
): Promise<{ success: number; failed: number }> {
  let successCount = 0;
  let failedCount = 0;
  const batchSize = 3;
  let previousSceneDescription = "";

  for (let i = 0; i < slides.length; i += batchSize) {
    const batch = slides.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((slide: any, batchIdx: number) => {
        const slideNumber = i + batchIdx + 1;
        return callFunction(supabaseUrl, serviceKey, "generate-carousel-image", {
          carouselId,
          slideNumber,
          prompt: slide.fullPrompt || slide.designStyle || `Slide ${slideNumber}`,
          brandTemplateId: brandTemplateId || undefined,
          visualPreset,
          carouselStyle,
          totalSlides: slides.length,
          seamlessContext: previousSceneDescription || undefined,
        });
      })
    );
    results.forEach((r, idx) => {
      if (r.status === "fulfilled") {
        successCount++;
        // Capture scene description for seamless continuity
        const output = r.value;
        if (output?.sceneDescription) {
          previousSceneDescription = output.sceneDescription;
        }
      } else {
        const slideNum = i + idx + 1;
        console.warn(`[carousel] Image failed for slide ${slideNum}:`, r.reason);
        failedCount++;
      }
    });
  }
  return { success: successCount, failed: failedCount };
}

// ─── Route A: Multichannel ───

async function routeMultichannel(
  supabaseUrl: string,
  serviceKey: string,
  supabase: any,
  input: CreatorInput,
  brief: BrandBrief
): Promise<CreatorResult> {
  const ctx = input.campaign_context;
  const contentGoal = ctx?.content_role === "harvest" ? "conversion"
    : ctx?.content_role === "sprout" ? "engagement"
    : input.content_goal || "education";
  const contentAngle = ctx?.angle || input.content_angle || undefined;
  const contentRole = (ctx?.content_role || input.content_role || "")?.toLowerCase() || undefined;
  const lengthMode = ctx?.estimated_length || input.length_mode || "medium";

  // Additional context from clarifications + campaign
  let additionalContext = "";
  const clarification = ctx?.clarification_context;
  if (clarification && typeof clarification === "object") {
    additionalContext = Object.entries(clarification).map(([q, a]) => `${q}: ${a}`).join(". ");
  }
  if (ctx) {
    additionalContext += ` [Campaign piece ${ctx.piece_number}/${ctx.total_pieces}. Angle: ${ctx.angle}. Role: ${ctx.content_role}. Channel: ${ctx.target_channel}.]`;
  }

  // ─── Decide: Skip Core Content? ───
  // Skip when: seed role (awareness), no brand template, or single channel target
  const targetChannels = input.target_channels || [];
  const shouldSkipCoreContent =
    contentRole === "seed" ||
    !input.brand_template_id ||
    targetChannels.length <= 1;

  let contentId: string | null = null;
  let coreOutput: any = null;

  if (!shouldSkipCoreContent) {
    // Step 1: Generate core content (optional)
    console.log(`[multichannel] Step 1: Generating core content`);
    coreOutput = await callFunction(supabaseUrl, serviceKey, "generate-core-content", {
      topic: input.topic,
      contentGoal,
      contentAngle: contentAngle || (additionalContext ? additionalContext : undefined),
      contentRole,
      lengthMode,
      organizationId: input.organization_id,
      brandTemplateId: input.brand_template_id,
      campaign_id: input.campaign_id || null,
    });
    contentId = coreOutput?.content_id || coreOutput?.id || null;
    if (!contentId) {
      return { success: false, content_type: "multichannel", error: "No content_id from generate-core-content" };
    }
  } else {
    console.log(`[multichannel] Skipping Core Content (role=${contentRole}, brand=${!!input.brand_template_id}, channels=${targetChannels.length})`);
  }

  const result: CreatorResult = {
    success: true,
    content_type: "multichannel",
    content_id: contentId || undefined,
    title: coreOutput?.title || input.topic,
    output: coreOutput || {},
  };

  // Step 2: Generate multichannel text for each channel
  let multichannelContentId: string | null = null;
  if (targetChannels.length > 0) {
    try {
      // Get org owner for auth context
      let expansionUserId: string | null = null;
      try {
        const { data: owner } = await supabase
          .from("organization_members")
          .select("user_id")
          .eq("organization_id", input.organization_id)
          .eq("role", "owner")
          .limit(1)
          .single();
        expansionUserId = owner?.user_id || null;
      } catch { /* ignore */ }

      console.log(`[multichannel] Step 2: Generating text for ${targetChannels.length} channels`);
      const mcParams: Record<string, unknown> = {
        action: "create",
        topic: input.topic,
        channels: targetChannels,
        contentRole: contentRole || undefined,
        contentGoal,
        organizationId: input.organization_id,
        brandTemplateId: input.brand_template_id,
        userId: expansionUserId,
        campaign_id: input.campaign_id || null,
        qualityMode: "speed",
      };
      // Only pass coreContentId if we created core content
      if (contentId) {
        mcParams.coreContentId = contentId;
      }

      const mcOutput = await callFunction(supabaseUrl, serviceKey, "generate-multichannel", mcParams);
      result.output.multichannel = mcOutput;
      multichannelContentId = mcOutput?.id || mcOutput?.content_id || null;

      // Step 3: Generate images for each channel
      if (multichannelContentId && targetChannels.length > 0) {
        console.log(`[multichannel] Step 3: Generating images for ${targetChannels.length} channels`);
        const imageResults = await generateImagesForChannels(
          supabaseUrl, serviceKey,
          multichannelContentId,
          targetChannels,
          input.brand_template_id,
        );
        result.output.images = imageResults;
        console.log(`[multichannel] Images done: ${imageResults.success.length} ok, ${imageResults.failed.length} failed`);
      }
    } catch (e) {
      console.warn("[multichannel] Generation failed:", e);
      result.output.multichannel = { error: e instanceof Error ? e.message : "Unknown" };
    }
  }

  // Store multichannel_content_id for pipeline
  if (multichannelContentId) {
    (result as any).multichannel_content_id = multichannelContentId;
  }

  // Self-review
  const contentText = coreOutput?.content || coreOutput?.article || "";
  if (contentText) {
    result.self_review = await selfReview(contentText, "multichannel", input.topic, brief, ctx?.target_channel) || undefined;
  }

  return result;
}

// ─── Route B: Video Script ───

async function routeVideoScript(
  supabaseUrl: string,
  serviceKey: string,
  input: CreatorInput,
  brief: BrandBrief
): Promise<CreatorResult> {
  const ctx = input.campaign_context;
  const contentGoal = ctx?.content_role === "harvest" ? "sell"
    : ctx?.content_role === "sprout" ? "engage"
    : "educate";

  // Step 1: Generate script
  const estLength = ctx?.estimated_length || input.length_mode || "medium";
  const duration = estLength === "short" ? 30 : estLength === "long" ? 90 : 60;

  const scriptOutput = await callFunction(supabaseUrl, serviceKey, "generate-script", {
    topic: input.topic,
    duration,
    script_purpose: contentGoal,
    video_type: "talking_head",
    organization_id: input.organization_id,
    brandTemplateId: input.brand_template_id,
  });

  const result: CreatorResult = {
    success: true,
    content_type: "video_script",
    content_id: scriptOutput?.content_id || scriptOutput?.id || undefined,
    title: scriptOutput?.title || input.topic,
    output: scriptOutput,
  };

  const scriptContent = scriptOutput?.script || scriptOutput?.content;
  if (scriptContent) {
    // Step 2: Analyze
    try {
      const analysis = await callFunction(supabaseUrl, serviceKey, "analyze-script", {
        scriptContent: scriptContent,
        topic: input.topic,
        duration,
        videoType: "talking_head",
      });
      result.output.analysis = analysis;

      // Step 3: Improve if score < 70
      if (analysis?.overallScore && analysis.overallScore < 70) {
        try {
          const improved = await callFunction(supabaseUrl, serviceKey, "improve-script", {
            scriptContent: scriptContent,
            suggestions: analysis.suggestions || [],
            weaknesses: analysis.weaknesses || [],
            topic: input.topic,
            duration: "60s",
            videoType: "talking_head",
            scriptPurpose: contentGoal,
          });
          result.output.improved = improved;
          result.output.was_improved = true;
        } catch (e) {
          console.warn("[video_script] Improve failed:", e);
        }
      }
    } catch (e) {
      console.warn("[video_script] Analysis failed:", e);
    }

    // Self-review on final script
    const finalScript = result.output.improved?.improvedScript || scriptContent;
    result.self_review = await selfReview(finalScript, "video_script", input.topic, brief, ctx?.target_channel || "tiktok") || undefined;
  }

  return result;
}

// ─── Route C: Carousel ───

async function routeCarousel(
  supabaseUrl: string,
  serviceKey: string,
  supabase: any,
  input: CreatorInput,
  brief: BrandBrief
): Promise<CreatorResult> {
  const ctx = input.campaign_context;
  const targetChannel = ctx?.target_channel || "instagram";
  const lengthMode = ctx?.estimated_length || input.length_mode || "medium";
  const slideCount = lengthMode === "long" ? 8 : lengthMode === "short" ? 5 : 6;

  // Get org owner userId for auth
  let userId: string | null = null;
  try {
    const { data: owner } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", input.organization_id)
      .eq("role", "owner")
      .limit(1)
      .single();
    userId = owner?.user_id || null;
  } catch { /* ignore */ }

  const visualPreset = "minimalist";
  const carouselStyle = "educational";

  // Phase 1: Generate text prompts for slides
  console.log(`[carousel] Phase 1: Generating text prompts for ${slideCount} slides`);
  const carouselOutput = await callFunction(supabaseUrl, serviceKey, "generate-carousel", {
    topic: input.topic,
    platform: targetChannel,
    carouselStyle,
    visualPreset,
    slideCount,
    aiTool: "ideogram",
    brandName: brief.brand_name || "Brand",
    brandGuideline: brief.unique_value_proposition || "",
    includeLogo: false,
    organization_id: input.organization_id,
    brandTemplateId: input.brand_template_id,
    autoGenerateImages: false,
    userId,
  });

  // generate-carousel returns DB record with slides_content, map to slides
  const slides = carouselOutput?.slides_content || carouselOutput?.slides || [];
  const carouselId = carouselOutput?.id;

  const result: CreatorResult = {
    success: true,
    content_type: "carousel",
    content_id: carouselId || undefined,
    title: carouselOutput?.title || input.topic,
    output: { ...carouselOutput, slides },
  };

  // Phase 2: Generate actual images for each slide
  if (carouselId && slides.length > 0) {
    console.log(`[carousel] Phase 2: Generating images for ${slides.length} slides`);
    const imageResults = await generateCarouselImages(
      supabaseUrl, serviceKey,
      carouselId,
      slides,
      input.brand_template_id,
      visualPreset,
      carouselStyle,
    );
    result.output.carousel_images = imageResults;
    console.log(`[carousel] Images done: ${imageResults.success} ok, ${imageResults.failed} failed`);
  }

  // Self-review on carousel text
  const slidesText = slides
    .map((s: any, i: number) => `Slide ${i + 1}: ${typeof s.textContent === 'string' ? s.textContent : JSON.stringify(s.textContent || s.headline || "")}`)
    .join("\n");

  if (slidesText) {
    result.self_review = await selfReview(slidesText, "carousel", input.topic, brief, targetChannel) || undefined;
  }

  return result;
}

// ─── JSON parsing ───

function parseJsonFromLLM(text: string): any {
  if (!text) return null;
  try { return JSON.parse(text); } catch { /* noop */ }
  const stripped = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  try { return JSON.parse(stripped); } catch { /* noop */ }
  const match = text.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch { /* noop */ } }
  return null;
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

// ─── Main Handler ───

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const rawInput = await req.json();
    
    // Accept both camelCase and snake_case field names
    const input: CreatorInput = {
      ...rawInput,
      organization_id: rawInput.organization_id || rawInput.organizationId,
      brand_template_id: rawInput.brand_template_id || rawInput.brandTemplateId,
      target_channels: rawInput.target_channels || rawInput.targetChannels,
      content_goal: rawInput.content_goal || rawInput.contentGoal,
      content_angle: rawInput.content_angle || rawInput.contentAngle,
      content_role: rawInput.content_role || rawInput.contentRole,
      length_mode: rawInput.length_mode || rawInput.lengthMode,
      campaign_context: rawInput.campaign_context || rawInput.campaignContext,
    };

    if (!input.topic || !input.organization_id || !input.content_type) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: topic, organization_id, content_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate content_type
    const validTypes = ["multichannel", "video_script", "carousel"];
    if (!validTypes.includes(input.content_type)) {
      return new Response(
        JSON.stringify({ success: false, error: `Unknown content_type: ${input.content_type}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[creator-v2] Starting — type: ${input.content_type}, topic: "${input.topic.slice(0, 80)}", org: ${input.organization_id}`);

    // ─── Step 1: Brief Assembly ───
    const brief = await assembleBrief(supabase, input.brand_template_id, input.organization_id);
    console.log(`[creator-v2] Brief assembled — brand: ${brief.brand_name || "N/A"}, industry: ${brief.industry || "N/A"}`);

    // ─── Step 2: Route by content_type ───
    let result: CreatorResult;

    switch (input.content_type) {
      case "video_script":
        result = await routeVideoScript(supabaseUrl, serviceKey, input, brief);
        break;
      case "carousel":
        result = await routeCarousel(supabaseUrl, serviceKey, supabase, input, brief);
        break;
      case "multichannel":
        result = await routeMultichannel(supabaseUrl, serviceKey, supabase, input, brief);
        break;
      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown content_type: ${input.content_type}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    console.log(`[creator-v2] Done — type: ${result.content_type}, content_id: ${result.content_id || "N/A"}, review: ${result.self_review?.verdict || "N/A"} (${result.self_review?.overall || "?"}/100)`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[creator-v2] Error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

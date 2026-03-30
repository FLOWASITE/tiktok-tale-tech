// ============================================
// Agent Creator V2 — Content Router
//
// Routes by content_type and calls existing Edge Functions:
//   multichannel  → generate-core-content + generate-multichannel
//   video_script  → generate-script + analyze-script + improve-script
//   carousel      → generate-carousel
//
// Includes Brief Assembly for brand context
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
  // Agent model config overrides
  model_override?: string;
  temperature?: number;
  max_tokens?: number;
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
  brand_guideline?: string;
  include_logo?: boolean;
  logo_url?: string;
  primary_color?: string;
  secondary_colors?: string[];
}

interface CreatorResult {
  success: boolean;
  content_type: string;
  content_id?: string;
  title?: string;
  output?: any;
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
      "unique_value_proposition, forbidden_words, preferred_words, formality_level, language_style, " +
      "brand_guideline, include_logo, logo_url, primary_color, secondary_colors"
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
    brand_guideline: brand.brand_guideline,
    include_logo: brand.include_logo,
    logo_url: brand.logo_url,
    primary_color: brand.primary_color,
    secondary_colors: brand.secondary_colors,
  };
}

// ─── Helper: Generate images for channels (max 3 concurrent) ───

async function generateImagesForChannels(
  supabaseUrl: string,
  serviceKey: string,
  supabase: any,
  contentId: string,
  channels: string[],
  brandTemplateId: string | null | undefined,
  brief: BrandBrief = {},
): Promise<{ success: string[]; failed: string[] }> {
  const success: string[] = [];
  const failed: string[] = [];
  const batchSize = 3;

  // Fetch content text to provide context for image generation
  let mcContent: Record<string, any> | null = null;
  try {
    const { data } = await supabase
      .from("multi_channel_contents")
      .select("*")
      .eq("id", contentId)
      .single();
    mcContent = data;
  } catch (e) {
    console.warn(`[multichannel] Could not fetch content for image context:`, e);
  }

  const hasLogo = !!(brief.include_logo && brief.logo_url);

  for (let i = 0; i < channels.length; i += batchSize) {
    const batch = channels.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (channel) => {
        const channelText = mcContent?.[`${channel}_content`] || '';
        // Smart content type: short text → with_text (AI renders), long → background_only
        const isShortText = channelText.length > 0 && channelText.length <= 120;
        const imageContentType = isShortText ? "with_text" : "background_only";

        const genResult = await callFunction(supabaseUrl, serviceKey, "generate-brand-image", {
          contentId,
          channel,
          brandTemplateId: brandTemplateId || undefined,
          imageContentType,
          contentSummary: channelText.slice(0, 500),
          contentRole: mcContent?.content_role || undefined,
          contentAngle: mcContent?.content_angle || undefined,
          // Pass text for AI to render when using with_text mode
          ...(isShortText ? { textToInclude: channelText } : {}),
          // Reserve space for logo so AI doesn't draw over it
          ...(hasLogo ? { logoSafeZone: { position: 'bottom-right', sizePercent: 12 } } : {}),
        });

        // Step 2: Overlay logo if brand has one
        const imageUrl = genResult?.imageUrl || genResult?.backgroundUrl;
        if (hasLogo && imageUrl) {
          try {
            const overlayResult = await callFunction(supabaseUrl, serviceKey, "overlay-logo-canvas", {
              baseImageUrl: imageUrl,
              logoUrl: brief.logo_url,
              position: 'bottom-right',
              logoStyle: 'shadow',
              logoSizePercent: 12,
              contentId,
              channel,
            });
            if (overlayResult?.success && overlayResult.imageUrl) {
              // Update channel_images with logo-overlaid URL
              try {
                const { data: content } = await supabase
                  .from('multi_channel_contents')
                  .select('channel_images')
                  .eq('id', contentId)
                  .single();
                const currentImages = (content?.channel_images as Record<string, any>) || {};
                if (currentImages[channel]) {
                  currentImages[channel].url = overlayResult.imageUrl;
                  await supabase
                    .from('multi_channel_contents')
                    .update({ channel_images: currentImages })
                    .eq('id', contentId);
                }
              } catch (dbErr) {
                console.warn(`[multichannel] Failed to update logo URL for ${channel}:`, dbErr);
              }
            }
          } catch (logoErr) {
            console.warn(`[multichannel] Logo overlay failed for ${channel}:`, logoErr);
            // Non-fatal: image still usable without logo
          }
        }

        return genResult;
      })
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
  supabase: any,
  carouselId: string,
  slides: any[],
  brandTemplateId: string | null | undefined,
  visualPreset: string,
  carouselStyle: string,
  organizationId: string,
  createdBy: string | null,
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

    for (let idx = 0; idx < results.length; idx++) {
      const slideNumber = i + idx + 1;
      const slide = batch[idx];
      const result = results[idx];

      if (result.status !== "fulfilled") {
        console.warn(`[carousel] Image failed for slide ${slideNumber}:`, result.reason);
        failedCount++;
        continue;
      }

      const output = result.value;
      const imageUrl = output?.imageUrl || output?.backgroundUrl;
      if (!imageUrl) {
        console.warn(`[carousel] Missing imageUrl for slide ${slideNumber}`);
        failedCount++;
        continue;
      }

      try {
        await supabase
          .from("carousel_images")
          .update({ is_selected: false })
          .eq("carousel_id", carouselId)
          .eq("slide_number", slideNumber)
          .eq("is_selected", true);

        const { error: insertErr } = await supabase
          .from("carousel_images")
          .insert({
            carousel_id: carouselId,
            slide_number: slideNumber,
            image_url: imageUrl,
            prompt: slide?.fullPrompt || slide?.designStyle || null,
            is_selected: true,
            organization_id: organizationId,
            created_by: createdBy || null,
          });

        if (insertErr) {
          throw insertErr;
        }

        successCount++;
        if (output?.sceneDescription) {
          previousSceneDescription = output.sceneDescription;
        }
      } catch (dbErr) {
        console.warn(`[carousel] Failed to persist image for slide ${slideNumber}:`, dbErr);
        failedCount++;
      }
    }
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
  const targetChannels = (input.target_channels || []).flatMap((ch: string) =>
    ch.includes(',') ? ch.split(',').map((s: string) => s.trim()) : [ch]
  ).filter(Boolean).map((ch: string) => ch === 'blog' ? 'website' : ch);
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
      ...(input.model_override && { model_override: input.model_override }),
      ...(input.temperature && { temperature: input.temperature }),
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
        qualityMode: "balanced",
        agentMode: true, // Use plain text generation instead of tool calling — compatible with all models
        // Agent model override — used as fallback when no channel-specific config exists
        ...(input.model_override && { model_override: input.model_override }),
        ...(input.temperature && { temperature: input.temperature }),
      };
      // Only pass coreContentId if we created core content
      if (contentId) {
        mcParams.coreContentId = contentId;
      }

      const mcOutput = await callFunction(supabaseUrl, serviceKey, "generate-multichannel", mcParams);
      result.output.multichannel = mcOutput;
      multichannelContentId = mcOutput?.id || mcOutput?.content_id || null;

      // Validate that target channels actually have content
      if (multichannelContentId && mcOutput) {
        const channelContentKeys = targetChannels.map(ch => `${ch}_content`);
        const emptyChannels = targetChannels.filter(ch => {
          const content = mcOutput[`${ch}_content`];
          return !content || (typeof content === 'string' && content.length < 50);
        });
        if (emptyChannels.length === targetChannels.length) {
          console.error(`[multichannel] ❗ All ${targetChannels.length} target channels have empty content: ${emptyChannels.join(', ')}`);
          result.success = false;
          result.error = `Content generation completed but all channels (${emptyChannels.join(', ')}) returned empty content`;
        } else if (emptyChannels.length > 0) {
          console.warn(`[multichannel] ⚠️ ${emptyChannels.length}/${targetChannels.length} channels have empty content: ${emptyChannels.join(', ')}`);
        }
      }

      // Step 3: Generate images for each channel
      if (multichannelContentId && targetChannels.length > 0) {
        console.log(`[multichannel] Step 3: Generating images for ${targetChannels.length} channels`);
        const imageResults = await generateImagesForChannels(
          supabaseUrl, serviceKey, supabase,
          multichannelContentId,
          targetChannels,
          input.brand_template_id,
          brief,
        );
        result.output.images = imageResults;
        console.log(`[multichannel] Images done: ${imageResults.success.length} ok, ${imageResults.failed.length} failed`);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unknown";
      console.warn("[multichannel] Generation failed:", e);
      result.success = false;
      result.error = `Multichannel generation failed: ${errorMessage}`;
      result.output.multichannel = { error: errorMessage };
    }
  }

  if (targetChannels.length > 0 && !multichannelContentId) {
    result.success = false;
    result.error = result.error || "No multichannel content generated";
    return result;
  }

  // Store multichannel_content_id for pipeline
  if (multichannelContentId) {
    (result as any).multichannel_content_id = multichannelContentId;
    result.content_id = multichannelContentId;
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
    brandGuideline: brief.brand_guideline || brief.unique_value_proposition || "",
    includeLogo: brief.include_logo ?? false,
    logoUrl: brief.logo_url || undefined,
    organization_id: input.organization_id,
    brandTemplateId: input.brand_template_id,
    autoGenerateImages: false,
    userId,
    brandPrimaryColor: brief.primary_color || undefined,
    brandSecondaryColors: brief.secondary_colors || undefined,
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
      supabaseUrl,
      serviceKey,
      supabase,
      carouselId,
      slides,
      input.brand_template_id,
      visualPreset,
      carouselStyle,
      input.organization_id,
      userId,
    );
    result.output.carousel_images = imageResults;
    console.log(`[carousel] Images done: ${imageResults.success} ok, ${imageResults.failed} failed`);

    if (imageResults.success === 0) {
      result.success = false;
      result.error = "Carousel image generation failed for all slides";
    }
  }

  return result;
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

    console.log(`[creator-v2] Done — type: ${result.content_type}, content_id: ${result.content_id || "N/A"}`);

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

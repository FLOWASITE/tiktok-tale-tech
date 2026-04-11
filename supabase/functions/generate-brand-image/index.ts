import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAIConfig } from "../_shared/ai-config.ts";
import { generateImageViaKie, isKieModel, mapAspectRatioToKie } from "../_shared/kie-image-generator.ts";
import { generateImageViaPoyo, isPoyoModel, mapAspectRatioToPoyo } from "../_shared/poyo-image-generator.ts";
import { generateImageViaGeminiGen, isGeminiGenModel, mapAspectRatioToGeminiGen } from "../_shared/geminigen-image-generator.ts";
import { generateTraceId, saveMetrics, estimateTokens, resolveUserId } from "../_shared/logger.ts";
import { estimateImageCost } from "../_shared/cost-estimator.ts";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import {
  buildImagePrompt,
  buildSimpleImagePrompt,
  getChannelAspectRatio,
  computeStyleFromBrand,
  type Channel,
  type BrandImageContext,
  type PersonaContext,
  type ImageStylePreset,
  type ContentRole,
  type ContentAngle,
  type ImageContentType,
  type TextPosition,
  type TypographyStyle,
  type FooterInfo,
  type PromptMode,
} from "../_shared/image-prompt-builder.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GenerateImageRequest {
  contentId: string;
  channel: string;
  contentSummary: string;
  brandTemplateId: string;
  aspectRatio?: "16:9" | "1:1" | "9:16" | "4:5";
  journeyStage?: 'awareness' | 'consideration' | 'decision' | 'retention';
  contentType?: 'promotional' | 'educational' | 'entertainment' | 'inspirational';
  imageStylePreset?: ImageStylePreset;
  negativePrompt?: string;
  // Content Role and Angle for strategic visuals
  contentRole?: ContentRole;
  contentAngle?: ContentAngle;
  // Hook integration
  hookMessage?: string;
  hookType?: string;
  // NEW: Text-in-image params for Social Graphics
  imageContentType?: ImageContentType;
  textToInclude?: string;
  textPosition?: TextPosition;
  typographyStyle?: TypographyStyle;
  // Prompt mode: full | brand_only | raw
  promptMode?: PromptMode;
  // AI Render mode: structured elements for AI to render text directly in image
  structuredElements?: {
    banner?: { text: string; bgColor: string; position: 'top' | 'bottom' };
    heroText?: { text: string; fontSize: string; effect: string };
    cards?: { items: { icon?: string; label: string }[]; layout: string };
    headline?: string;
    cta?: string;
    footer?: { items: { icon?: string; text: string }[] };
  };
  structuredColors?: { primary: string; secondary: string; text: string };
  // Template ID for layout guidance in AI render mode
  structuredTemplate?: string;
  // Logo safe zone for AI render mode — tells AI to keep area clear
  logoSafeZone?: { position: string; sizePercent: number };
}

// Default model fallback (used when config not available)
const DEFAULT_IMAGE_MODELS = {
  primary: "google/gemini-3-pro-image-preview",
  fallback: "google/gemini-2.5-flash-image",
} as const;

// Image quality validation thresholds
const QUALITY_THRESHOLDS = {
  minFileSizeBytes: 10000,    // 10KB minimum
  minDimensionPixels: 256,    // Minimum dimension
  maxRetries: 1, // Reduced from 2: combined with client retry = fewer wasted attempts
} as const;

// Map content_goal to journey stage
function mapContentGoalToJourneyStage(
  contentGoal?: string
): 'awareness' | 'consideration' | 'decision' | 'retention' | undefined {
  const mapping: Record<string, 'awareness' | 'consideration' | 'decision' | 'retention'> = {
    'brand_awareness': 'awareness',
    'engagement': 'awareness',
    'lead_generation': 'consideration',
    'traffic': 'consideration',
    'conversion': 'decision',
    'sales': 'decision',
    'retention': 'retention',
    'loyalty': 'retention',
  };
  return contentGoal ? mapping[contentGoal] : undefined;
}

// Validate image quality after generation
function validateImageQuality(base64Data: string): { valid: boolean; reason?: string; fileSize: number } {
  try {
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    const fileSize = imageBytes.length;
    
    if (fileSize < QUALITY_THRESHOLDS.minFileSizeBytes) {
      return { 
        valid: false, 
        reason: `Image too small (${fileSize} bytes, min ${QUALITY_THRESHOLDS.minFileSizeBytes})`,
        fileSize 
      };
    }
    
    // Basic check for blank/white images (high entropy = good, low = potentially blank)
    // Simple variance check on a sample of bytes
    const sampleSize = Math.min(1000, imageBytes.length);
    let sum = 0;
    let sumSq = 0;
    for (let i = 0; i < sampleSize; i++) {
      const idx = Math.floor(i * imageBytes.length / sampleSize);
      sum += imageBytes[idx];
      sumSq += imageBytes[idx] * imageBytes[idx];
    }
    const mean = sum / sampleSize;
    const variance = (sumSq / sampleSize) - (mean * mean);
    
    // Very low variance might indicate blank/uniform image
    if (variance < 100) {
      return { 
        valid: false, 
        reason: `Image appears blank or uniform (variance: ${variance.toFixed(2)})`,
        fileSize 
      };
    }
    
    return { valid: true, fileSize };
  } catch (err) {
    return { valid: false, reason: `Validation error: ${err}`, fileSize: 0 };
  }
}

// Generate image with smart retry and model fallback
async function generateImageWithRetry(
  prompt: string,
  apiKey: string,
  models: { primary: string; fallback: string } = DEFAULT_IMAGE_MODELS,
  maxRetries: number = QUALITY_THRESHOLDS.maxRetries
): Promise<{ imageData: string; model: string; attempts: number }> {
  let lastError: Error | null = null;
  let attempts = 0;
  
  // Try with primary model first, then fallback
  const modelsToTry = [models.primary, models.fallback];
  
  for (const model of modelsToTry) {
    for (let retry = 0; retry <= maxRetries; retry++) {
      attempts++;
      
      try {
        console.log(`[generate-brand-image] Attempt ${attempts} with model: ${model}`);
        
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }],
            modalities: ["image", "text"],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[generate-brand-image] Model ${model} error:`, response.status, errorText);
          
          // Rate limit or payment errors - throw immediately, no retry
          if (response.status === 429 || response.status === 402) {
            throw new Error(`API_ERROR:${response.status}`);
          }
          
          lastError = new Error(`Model ${model} failed: ${response.status}`);
          continue;
        }

        const aiData = await response.json();
        const imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        
        if (!imageData) {
          lastError = new Error(`No image in response from ${model}`);
          continue;
        }

        // Extract base64 and validate quality
        const base64Data = imageData.replace(/^data:image\/[^;]+;base64,/, "");
        const validation = validateImageQuality(base64Data);
        
        if (!validation.valid) {
          console.warn(`[generate-brand-image] Quality check failed: ${validation.reason}`);
          lastError = new Error(validation.reason || "Quality check failed");
          
          // If failed on primary, try fallback with simplified prompt
          if (model === models.primary && retry === maxRetries) {
            console.log("[generate-brand-image] Primary model exhausted, trying fallback...");
            break; // Move to fallback model
          }
          continue;
        }

        console.log(`[generate-brand-image] Success with ${model}, file size: ${validation.fileSize} bytes`);
        return { imageData, model, attempts };
        
      } catch (err) {
        // Check for API errors that should not be retried
        if (err instanceof Error && err.message.startsWith('API_ERROR:')) {
          throw err;
        }
        
        lastError = err instanceof Error ? err : new Error(String(err));
        console.error(`[generate-brand-image] Attempt ${attempts} failed:`, lastError.message);
        
        // Exponential backoff before retry
        if (retry < maxRetries) {
          const delay = 1000 * Math.pow(2, retry);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }
  }
  
  throw lastError || new Error("All generation attempts failed");
}
/**
 * Convert structured overlay elements into natural language prompt text
 * for AI to render text directly in the generated image.
 */
function structuredElementsToPromptText(
  elements: GenerateImageRequest['structuredElements'],
  colors?: GenerateImageRequest['structuredColors'],
  templateId?: string,
  logoSafeZone?: GenerateImageRequest['logoSafeZone']
): string {
  if (!elements) return '';

  const parts: string[] = [];

  // Template-based layout instruction
  const layoutInstructions: Record<string, string> = {
    poster: 'LAYOUT: Stack layout — bold banner bar at the top edge, large centered headline in the middle, CTA button/text at the bottom. Clean vertical hierarchy.',
    infographic: 'LAYOUT: Split layout — left side (55%) features large hero text/number, right side (45%) contains a 2×2 grid of info cards. Banner bar spans full width at the top.',
    quote_card: 'LAYOUT: Centered large quote text with gradient/glow effect filling the middle of the image. Banner bar at the bottom edge.',
    feature_list: 'LAYOUT: Banner bar at the top edge, followed by a vertical list of feature cards stacked below with even spacing.',
    contact_card: 'LAYOUT: Headline text at the top, contact information (phone, website, address) displayed as a footer section at the bottom.',
  };

  if (templateId && templateId !== 'auto' && layoutInstructions[templateId]) {
    parts.push(`\n\n${layoutInstructions[templateId]}`);
  }

  parts.push('\nIMPORTANT — Render the following text elements DIRECTLY in the image with professional typography:');

  if (elements.banner) {
    const pos = elements.banner.position === 'top' ? 'top of the image' : 'bottom of the image';
    parts.push(`- A bold banner bar at the ${pos} with background color ${elements.banner.bgColor || colors?.primary || '#DC2626'}: "${elements.banner.text}"`);
  }

  if (elements.heroText) {
    const size = elements.heroText.fontSize === '3xl' ? 'very large' : elements.heroText.fontSize === '2xl' ? 'large' : 'medium-large';
    parts.push(`- A ${size} hero number/text displayed prominently: "${elements.heroText.text}"`);
  }

  if (elements.headline) {
    parts.push(`- A clear headline: "${elements.headline}"`);
  }

  if (elements.cards && elements.cards.items.length > 0) {
    const layout = elements.cards.layout === 'grid-2x2' ? 'arranged in a 2×2 grid' : elements.cards.layout === 'horizontal' ? 'arranged horizontally' : 'arranged vertically';
    const cardDescs = elements.cards.items.map(c => `${c.icon ? c.icon + ' ' : ''}${c.label}`).join('; ');
    parts.push(`- ${elements.cards.items.length} info cards ${layout}: ${cardDescs}`);
  }

  if (elements.cta) {
    parts.push(`- A call-to-action button or text: "${elements.cta}"`);
  }

  if (elements.footer && elements.footer.items.length > 0) {
    const footerItems = elements.footer.items
      .map((item) => `${item.icon ? item.icon + ' ' : ''}${item.text}`)
      .join('; ');
    parts.push(`- A bottom footer contact bar with concise contact details: ${footerItems}`);
  }

  if (colors) {
    parts.push(`\nColor scheme: primary ${colors.primary}, secondary ${colors.secondary}, text color ${colors.text}.`);
  }

  parts.push('\nCRITICAL TEXT RENDERING RULES:');
  parts.push('- Vietnamese diacritics (sắc, huyền, hỏi, ngã, nặng) MUST be rendered PERFECTLY — every accent mark matters');
  parts.push('- NEVER substitute similar-looking characters: ă≠a, â≠a, ơ≠o, ô≠o, ư≠u, ê≠e, đ≠d');
  parts.push('- Text must be crisp, high-contrast, and fully readable at social media viewing sizes');
  parts.push('- Use clean sans-serif typography with proper spacing (Noto Sans, Roboto, Be Vietnam Pro)');
  parts.push('- Cards should have subtle background (semi-transparent or frosted glass effect)');
  parts.push('- MINIMUM font size: headlines 48px+, body text 24px+, contact info 18px+');
  parts.push('- Add text shadow or semi-transparent backdrop behind ALL text for guaranteed readability');

  // Text Verification Checklist
  const allTexts: { label: string; text: string; charCount: number }[] = [];
  if (elements.banner?.text) allTexts.push({ label: 'Banner', text: elements.banner.text, charCount: elements.banner.text.length });
  if (elements.heroText?.text) allTexts.push({ label: 'Hero Text', text: elements.heroText.text, charCount: elements.heroText.text.length });
  if (elements.headline) allTexts.push({ label: 'Headline', text: elements.headline, charCount: elements.headline.length });
  if (elements.cta) allTexts.push({ label: 'CTA', text: elements.cta, charCount: elements.cta.length });
  if (elements.cards?.items) {
    elements.cards.items.forEach((c, i) => allTexts.push({ label: `Card ${i + 1}`, text: c.label, charCount: c.label.length }));
  }
  if (elements.footer?.items) {
    elements.footer.items.forEach((f, i) => allTexts.push({ label: `Footer ${i + 1}`, text: f.text, charCount: f.text.length }));
  }

  if (allTexts.length > 0) {
    parts.push('\n## TEXT VERIFICATION CHECKLIST (render each EXACTLY):');
    allTexts.forEach(t => {
      parts.push(`- ${t.label} (${t.charCount} chars): "${t.text}"`);
    });
    parts.push('- If you CANNOT render any text accurately (especially Vietnamese diacritics), LEAVE IT BLANK rather than rendering incorrectly');
    parts.push('- NEVER rephrase, abbreviate, or modify any text above');
  }

  // Logo safe zone instruction
  if (logoSafeZone) {
    const posLabels: Record<string, string> = {
      'top-left': 'top-left corner',
      'top-right': 'top-right corner',
      'bottom-left': 'bottom-left corner',
      'bottom-right': 'bottom-right corner',
      'top-center': 'top-center edge',
      'bottom-center': 'bottom-center edge',
      'center-left': 'center-left edge',
      'center-right': 'center-right edge',
      'center': 'center of the image',
    };
    const posLabel = posLabels[logoSafeZone.position] || logoSafeZone.position;
    const pct = logoSafeZone.sizePercent || 15;
    parts.push(`\n## LOGO SAFE ZONE (CRITICAL — DO NOT place any text, cards, banners, or elements here):`);
    parts.push(`- A brand logo will be overlaid at the ${posLabel} after generation`);
    parts.push(`- Keep that area (~${pct}% of image width/height) COMPLETELY CLEAR`);
    parts.push(`- Shift any overlapping text/cards/CTA AWAY from the logo zone`);
  }

  return parts.join('\n');
}

Deno.serve(withPerf({ functionName: 'generate-brand-image', slowThresholdMs: 30000 }, async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const traceId = generateTraceId();
  const startTime = performance.now();

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Resolve userId for cost tracking
    const userId = await resolveUserId(req, supabase);
    if (!userId) {
      console.warn("[generate-brand-image] WARNING: userId is undefined — image will have NULL created_by!");
    }

    const {
      contentId,
      channel,
      contentSummary,
      brandTemplateId,
      aspectRatio,
      journeyStage,
      contentType,
      imageStylePreset,
      negativePrompt,
      // Params from request
      contentRole: requestedContentRole,
      contentAngle: requestedContentAngle,
      hookMessage: requestedHookMessage,
      hookType: requestedHookType,
      // NEW: Text-in-image params for Social Graphics
      imageContentType,
      textToInclude,
      textPosition,
      typographyStyle,
      // Prompt mode
      promptMode,
      // AI Render mode: structured elements
      structuredElements,
      structuredColors,
      // Template ID for layout guidance
      structuredTemplate,
      // Logo safe zone for AI render mode
      logoSafeZone,
    }: GenerateImageRequest = await req.json();

    console.log(`[generate-brand-image] Generating for channel: ${channel}, content: ${contentId}, promptMode: ${promptMode || 'full (default)'}`);
    console.log(`[generate-brand-image] Image content type: ${imageContentType || 'background_only'}`);
    if (imageContentType === 'with_text' && textToInclude) {
      console.log(`[generate-brand-image] Text to include: "${textToInclude.slice(0, 50)}..."`);
    }

    // === OPTIMIZATION: Parallel DB queries (saves ~1s per channel) ===
    const brandQueryPromise = supabase
      .from("brand_templates")
      .select("primary_color, secondary_colors, image_style, logo_url, brand_name, industry, organization_id, tone_of_voice, formality_level, country_code, footer_info")
      .eq("id", brandTemplateId)
      .single();

    const contentQueryPromise = contentId
      ? supabase
          .from("multi_channel_contents")
          .select("content_goal, content_role, content_angle, selected_hooks, global_hook")
          .eq("id", contentId)
          .single()
      : Promise.resolve({ data: null, error: null });

    const personaQueryPromise = (async () => {
      try {
        const result = await supabase
          .from("product_persona_mappings")
          .select(`
            customer_personas (
              name, age_range, gender, occupation, interests, communication_style
            )
          `)
          .eq("brand_template_id", brandTemplateId)
          .limit(1)
          .maybeSingle();
        return result;
      } catch (err) {
        console.warn("[generate-brand-image] Persona query failed, continuing without:", err);
        return { data: null, error: null };
      }
    })();

    const [brandResult, contentResult, personaResult] = await Promise.all([
      brandQueryPromise,
      contentQueryPromise,
      personaQueryPromise,
    ]);

    const { data: brandTemplate, error: brandError } = brandResult;
    if (brandError || !brandTemplate) {
      console.error("[generate-brand-image] Brand template not found:", brandError);
      throw new Error("Brand template not found");
    }

    // Auto-select style if not provided
    let finalImageStylePreset = imageStylePreset;
    if (!finalImageStylePreset && brandTemplate) {
      finalImageStylePreset = computeStyleFromBrand(
        brandTemplate.industry as string[] | undefined,
        brandTemplate.tone_of_voice as string[] | undefined,
        brandTemplate.image_style as string | undefined,
        brandTemplate.formality_level as string | undefined
      );
      console.log(`[generate-brand-image] Auto-selected style: ${finalImageStylePreset}`);
    }

    // Process content data
    let finalJourneyStage = journeyStage;
    let finalContentRole: ContentRole | undefined = requestedContentRole;
    let finalContentAngle: ContentAngle | undefined = requestedContentAngle;
    let finalHookMessage: string | undefined = requestedHookMessage;
    let finalHookType: string | undefined = requestedHookType;

    const contentData = contentResult.data;
    if (contentData) {
      if (!finalJourneyStage && contentData.content_goal) {
        finalJourneyStage = mapContentGoalToJourneyStage(contentData.content_goal);
        console.log(`[generate-brand-image] Mapped content_goal "${contentData.content_goal}" to journeyStage "${finalJourneyStage}"`);
      }
      if (!finalContentRole && contentData.content_role) {
        finalContentRole = contentData.content_role as ContentRole;
      }
      if (!finalContentAngle && contentData.content_angle) {
        finalContentAngle = contentData.content_angle as ContentAngle;
      }
      if (!finalHookMessage) {
        const selectedHooks = contentData.selected_hooks as any[] | null;
        const channelHook = selectedHooks?.find((h: any) => h.channel === channel);
        if (channelHook?.opening_line) {
          finalHookMessage = channelHook.opening_line;
          finalHookType = channelHook.hook_type || channelHook.framework;
        } else if (contentData.global_hook) {
          const globalHook = contentData.global_hook as any;
          finalHookMessage = globalHook.opening_line;
          finalHookType = globalHook.hook_type || globalHook.framework;
        }
      }
    }

    // Process persona data
    let personaContext: PersonaContext | undefined;
    if (personaResult.data?.customer_personas) {
      const p = personaResult.data.customer_personas as any;
      personaContext = {
        name: p.name,
        ageRange: p.age_range,
        gender: p.gender,
        occupation: p.occupation,
        interests: p.interests,
        communicationStyle: p.communication_style,
      };
      console.log(`[generate-brand-image] Using persona context: ${personaContext.name}`);
    }

    // Determine aspect ratio - use provided or get optimal for channel
    const finalAspectRatio = aspectRatio || getChannelAspectRatio(channel as Channel);

    // Build brand context for enhanced prompt
    const brandContext: BrandImageContext = {
      brandName: brandTemplate.brand_name,
      brandColors: {
        primary: brandTemplate.primary_color || "#6366f1",
        secondary: brandTemplate.secondary_colors || [],
      },
      imageStyle: brandTemplate.image_style || "professional, modern, clean",
      logoUrl: brandTemplate.logo_url,
      industry: brandTemplate.industry || [],
    };

    // Parse footer_info from brand template
    const footerInfo: FooterInfo | undefined = brandTemplate.footer_info 
      ? (typeof brandTemplate.footer_info === 'string' 
          ? JSON.parse(brandTemplate.footer_info) 
          : brandTemplate.footer_info) as FooterInfo
      : undefined;

    // Build enhanced prompt using the shared utility
    let enhancedPrompt = buildImagePrompt({
      channel: channel as Channel,
      contentSummary,
      brand: brandContext,
      aspectRatio: finalAspectRatio,
      journeyStage: finalJourneyStage,
      contentType,
      persona: personaContext,
      imageStylePreset: finalImageStylePreset,  // Use computed style
      negativePrompt,
      // Pass content role, angle, and hook for strategic visuals
      contentRole: finalContentRole,
      contentAngle: finalContentAngle,
      hookMessage: finalHookMessage,
      hookType: finalHookType,
      // NEW: Pass text-in-image params for Social Graphics
      imageContentType,
      textToInclude,
      textPosition,
      typographyStyle,
      // Country-specific character appearance
      countryCode: brandTemplate.country_code as string | undefined,
      // Footer/contact info for structured layout
      footerInfo,
      // Prompt mode (3-layer architecture)
      promptMode,
    });

    // AI Render mode: append structured text instructions to prompt
    if (structuredElements) {
      const structuredText = structuredElementsToPromptText(structuredElements, structuredColors, structuredTemplate, logoSafeZone);
      enhancedPrompt += structuredText;
      console.log(`[generate-brand-image] AI Render mode: appended structured text instructions (${structuredText.length} chars)`);
    }

    // AI Render mode enhancement: when text is included but no structured elements,
    // add Vietnamese text accuracy instructions to ensure correct diacritics
    if (imageContentType === 'with_text' && textToInclude && !structuredElements) {
      enhancedPrompt += `\n\n## CRITICAL TEXT RENDERING RULES:
- Render the following text EXACTLY as provided — DO NOT modify, rephrase, or omit any word
- Vietnamese diacritics (sắc, huyền, hỏi, ngã, nặng) MUST be rendered PERFECTLY — every accent mark matters
- Text to render: "${textToInclude}"
- Use clean sans-serif typography with proper spacing and high contrast
- Text must be crisp, fully readable, and well-positioned within the composition`;
      console.log(`[generate-brand-image] AI Render: added Vietnamese text accuracy rules for "${textToInclude.slice(0, 40)}..."`);
    }

    console.log("[generate-brand-image] Starting image generation...");

    // Read model config from Admin Panel (DB) — falls back to default if not configured
    const aiConfig = await getAIConfig('generate-brand-image', brandTemplate.organization_id);
    const primaryModel = aiConfig.model;
    console.log(`[generate-brand-image] Using model from config: ${primaryModel}`);

    // Variables for result
    let imageData: string = '';
    let imageUrlFromKie: string | null = null;
    let imageUrlFromPoyo: string | null = null;
    let modelUsed: string = primaryModel;
    let totalAttempts: number = 1;

    // Route to PoYo.ai, KIE.ai, or Lovable AI based on model prefix
    if (isPoyoModel(primaryModel)) {
      const POYO_API_KEY = Deno.env.get('POYO_API_KEY');
      if (!POYO_API_KEY) {
        return new Response(
          JSON.stringify({ success: false, error: 'POYO_API_KEY not configured. Please add it in project secrets.' }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[generate-brand-image] Routing to PoYo.ai: ${primaryModel}`);
      try {
        imageUrlFromPoyo = await generateImageViaPoyo({
          prompt: enhancedPrompt,
          model: primaryModel,
          aspectRatio: mapAspectRatioToPoyo(finalAspectRatio),
        }, POYO_API_KEY);
        modelUsed = primaryModel;
      } catch (poyoErr) {
        const poyoErrMsg = poyoErr instanceof Error ? poyoErr.message : String(poyoErr);
        console.error(`[generate-brand-image] PoYo.ai failed: ${poyoErrMsg}`);

        if (poyoErrMsg.includes('POYO_AUTH_ERROR') || poyoErrMsg.includes('POYO_CREDITS_EXHAUSTED') || poyoErrMsg.includes('POYO_RATE_LIMIT')) {
          return new Response(
            JSON.stringify({ success: false, error: poyoErrMsg }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('[generate-brand-image] PoYo failed, falling back to Lovable AI...');
        const fallbackModel = 'google/gemini-2.5-flash-image';
        const result = await generateImageWithRetry(enhancedPrompt, LOVABLE_API_KEY, {
          primary: fallbackModel,
          fallback: 'google/gemini-3-pro-image-preview',
        });
        imageData = result.imageData;
        modelUsed = `${result.model} (fallback from ${primaryModel})`;
        totalAttempts = result.attempts;
      }
    } else if (isGeminiGenModel(primaryModel)) {
      const GEMINIGEN_API_KEY = Deno.env.get('GEMINIGEN_API_KEY');
      if (!GEMINIGEN_API_KEY) {
        return new Response(
          JSON.stringify({ success: false, error: 'GEMINIGEN_API_KEY not configured. Please add it in project secrets.' }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[generate-brand-image] Routing to GeminiGen.ai: ${primaryModel}`);
      try {
        imageUrlFromPoyo = await generateImageViaGeminiGen({
          prompt: enhancedPrompt,
          model: primaryModel,
          aspectRatio: mapAspectRatioToGeminiGen(finalAspectRatio),
        }, GEMINIGEN_API_KEY);
        modelUsed = primaryModel;
      } catch (geminiGenErr) {
        const errMsg = geminiGenErr instanceof Error ? geminiGenErr.message : String(geminiGenErr);
        console.error(`[generate-brand-image] GeminiGen.ai failed: ${errMsg}`);

        if (errMsg.includes('GEMINIGEN_AUTH_ERROR') || errMsg.includes('GEMINIGEN_CREDITS_EXHAUSTED') || errMsg.includes('GEMINIGEN_RATE_LIMIT')) {
          return new Response(
            JSON.stringify({ success: false, error: errMsg }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('[generate-brand-image] GeminiGen failed, falling back to Lovable AI...');
        const fallbackModel = 'google/gemini-2.5-flash-image';
        const result = await generateImageWithRetry(enhancedPrompt, LOVABLE_API_KEY, {
          primary: fallbackModel,
          fallback: 'google/gemini-3-pro-image-preview',
        });
        imageData = result.imageData;
        modelUsed = `${result.model} (fallback from ${primaryModel})`;
        totalAttempts = result.attempts;
      }
    } else if (isKieModel(primaryModel)) {
      const KIE_API_KEY = Deno.env.get('KIE_API_KEY');
      if (!KIE_API_KEY) {
        return new Response(
          JSON.stringify({ success: false, error: 'KIE_API_KEY not configured. Please add it in project secrets.' }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[generate-brand-image] Routing to KIE.ai: ${primaryModel}`);
      try {
        imageUrlFromKie = await generateImageViaKie({
          prompt: enhancedPrompt,
          model: primaryModel,
          aspectRatio: mapAspectRatioToKie(finalAspectRatio),
          outputFormat: 'jpeg',
        }, KIE_API_KEY);
        modelUsed = primaryModel;
      } catch (kieErr) {
        const kieErrMsg = kieErr instanceof Error ? kieErr.message : String(kieErr);
        console.error(`[generate-brand-image] KIE.ai failed: ${kieErrMsg}`);

        if (kieErrMsg.includes('KIE_AUTH_ERROR') || kieErrMsg.includes('KIE_CREDITS_EXHAUSTED') || kieErrMsg.includes('KIE_RATE_LIMIT')) {
          return new Response(
            JSON.stringify({ success: false, error: kieErrMsg }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('[generate-brand-image] KIE failed, falling back to Lovable AI...');
        const fallbackModel = 'google/gemini-2.5-flash-image';
        const result = await generateImageWithRetry(enhancedPrompt, LOVABLE_API_KEY, {
          primary: fallbackModel,
          fallback: 'google/gemini-3-pro-image-preview',
        });
        imageData = result.imageData;
        modelUsed = `${result.model} (fallback from ${primaryModel})`;
        totalAttempts = result.attempts;
      }
    } else {
      // Lovable AI flow (existing)
      const fallbackModel = primaryModel === 'google/gemini-3-pro-image-preview'
        ? 'google/gemini-2.5-flash-image'
        : 'google/gemini-3-pro-image-preview';

      try {
        const result = await generateImageWithRetry(enhancedPrompt, LOVABLE_API_KEY, { primary: primaryModel, fallback: fallbackModel });
        imageData = result.imageData;
        modelUsed = result.model;
        totalAttempts = result.attempts;
      } catch (err) {
        // Handle API errors
        if (err instanceof Error && err.message.startsWith('API_ERROR:')) {
          const statusCode = parseInt(err.message.split(':')[1]);
          if (statusCode === 429) {
            return new Response(
              JSON.stringify({ success: false, error: "Rate limit exceeded. Please try again later." }),
              { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          if (statusCode === 402) {
            return new Response(
              JSON.stringify({ success: false, error: "Payment required. Please add credits to your Lovable AI workspace." }),
              { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
        throw err;
      }
    }

    console.log(`[generate-brand-image] Generated with ${modelUsed} after ${totalAttempts} attempt(s)`);

    // Handle PoYo/KIE URL (already a public URL) vs Lovable AI (base64)
    let imageUrl: string;

    if (imageUrlFromPoyo) {
      // Also covers GeminiGen (reuses imageUrlFromPoyo variable)
      imageUrl = imageUrlFromPoyo;
      console.log(`[generate-brand-image] Using external image URL: ${imageUrl.slice(0, 80)}...`);
    } else if (imageUrlFromKie) {
      imageUrl = imageUrlFromKie;
      console.log(`[generate-brand-image] Using KIE image URL: ${imageUrl.slice(0, 80)}...`);
    } else {
      // Lovable AI returns base64 — detect format and upload to storage
      const contentTypeMatch = imageData.match(/^data:image\/([^;]+);base64,/);
      const detectedFormat = contentTypeMatch ? contentTypeMatch[1] : 'png';
      const imageMimeType = `image/${detectedFormat}`;
      const fileExtension = detectedFormat === 'jpeg' ? 'jpg' : detectedFormat;
      
      console.log(`[generate-brand-image] Detected image format: ${detectedFormat}`);

      const base64Data = imageData.replace(/^data:image\/[^;]+;base64,/, "");
      const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
      console.log(`[generate-brand-image] Image bytes: ${imageBytes.length}`);

      const fileName = `${contentId}/${channel}-${Date.now()}.${fileExtension}`;
      
      const { error: uploadError } = await supabase.storage
        .from("carousel-images")
        .upload(fileName, imageBytes, {
          contentType: imageMimeType,
          upsert: true,
        });

      if (uploadError) {
        console.error("[generate-brand-image] Upload error:", uploadError);
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage
        .from("carousel-images")
        .getPublicUrl(fileName);

      imageUrl = publicUrlData.publicUrl;
      console.log("[generate-brand-image] Image uploaded:", imageUrl);
    }

    // === OPTIMIZATION: Non-blocking history save (fire-and-forget, saves ~300ms) ===
    // History is non-critical; don't block response on it
    const historySavePromise = (async () => {
      try {
        await supabase
          .from("channel_image_history")
          .update({ is_selected: false })
          .eq("content_id", contentId)
          .eq("channel", channel);

        await supabase
          .from("channel_image_history")
          .insert({
            content_id: contentId,
            channel: channel,
            image_url: imageUrl,
            prompt: enhancedPrompt,
            aspect_ratio: finalAspectRatio,
            is_selected: true,
            organization_id: brandTemplate.organization_id,
            created_by: userId,
          });
        console.log("[generate-brand-image] Saved to channel_image_history");

        // Sync channel_images JSON column so MultiChannelViewer can display the image
        if (contentId && channel) {
          try {
            const { data: currentContent } = await supabase
              .from("multi_channel_contents")
              .select("channel_images")
              .eq("id", contentId)
              .single();

            const currentImages = (currentContent?.channel_images as Record<string, any>) || {};
            currentImages[channel] = {
              url: imageUrl,
              provider: modelUsed,
              aspectRatio: finalAspectRatio,
            };

            await supabase
              .from("multi_channel_contents")
              .update({ channel_images: JSON.parse(JSON.stringify(currentImages)) })
              .eq("id", contentId);

            console.log(`[generate-brand-image] Synced channel_images for ${channel}`);
          } catch (syncErr) {
            console.warn("[generate-brand-image] channel_images sync error:", syncErr);
          }
        }
      } catch (historyErr) {
        console.error("[generate-brand-image] History save error:", historyErr);
      }
    })();

    // Use waitUntil pattern: respond immediately, let history save finish in background
    // Deno edge functions keep running after response is sent
    historySavePromise.catch(() => {});

    // Non-blocking metrics save
    const totalDurationMs = Math.round(performance.now() - startTime);
    const estimatedCostUsd = estimateImageCost(modelUsed.split(' ')[0]);
    saveMetrics(supabase, {
      traceId,
      functionName: 'generate-brand-image',
      organizationId: brandTemplate.organization_id,
      userId,
      totalDurationMs,
      aiCallDurationMs: totalDurationMs,
      inputTokensEstimated: estimateTokens(enhancedPrompt),
      outputTokensEstimated: 0,
      estimatedCostUsd,
      modelsUsed: { image: modelUsed },
      hadError: false,
      contextSources: personaContext ? ['persona', 'brand'] : ['brand'],
      channels: [channel],
      contentId,
      actionType: 'image_generation',
      retryCount: totalAttempts - 1,
    }).catch(() => {});

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl,
        prompt: enhancedPrompt,
        aspectRatio: finalAspectRatio,
        brandColors: {
          primary: brandContext.brandColors?.primary,
          secondary: brandContext.brandColors?.secondary,
        },
        modelUsed,
        attempts: totalAttempts,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[generate-brand-image] Error:", error);

    // Save error metrics
    const totalDurationMs = Math.round(performance.now() - startTime);
    try {
      const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      saveMetrics(sb, {
        traceId,
        functionName: 'generate-brand-image',
        totalDurationMs,
        hadError: true,
        errorType: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        contextSources: [],
        actionType: 'image_generation',
      }).catch(() => {});
    } catch {}

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}));

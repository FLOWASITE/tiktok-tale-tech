// ============================================================
// Branded Image Composer — shared helper
// MIRRORS the manual /multichannel pipeline (useAutoImageGeneration) bit-for-bit:
//   STEP A — decompose-image-request → backgroundPrompt + overlayConfig
//   STEP B — applyTemplate (auto-select) → structuredElements/colors/template
//   STEP C — generate-brand-image with imageContentType='with_text' + structuredElements
//            (generate-brand-image's overlayMode is implicitly ai_render when structured*
//             fields are present — AI bakes headline + footer + cards into the image)
//   STEP D — overlay-logo-canvas
//
// No more `background_only` fallback. No more "footer DEFERRED". No bespoke logic.
// Used by Telegram webhook (and any future server-side flow that needs the
// same visual output as App /multichannel).
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  applyTemplate,
  autoSelectTemplate,
  buildFooterItemsFromBrand,
  decomposeRequest,
  type DecomposedRequest,
  type StructuredOverlayConfig,
} from "./hybrid-image-utils.ts";

export type LogoPosition =
  | "top-left" | "top-center" | "top-right"
  | "center-left" | "center" | "center-right"
  | "bottom-left" | "bottom-center" | "bottom-right";

export type LogoStyle = "clean" | "shadow" | "glass" | "pill" | "subtle";

export interface ComposeBrandedImageParams {
  supabaseUrl: string;
  serviceKey: string;
  contentId: string;
  channel: string;
  brandTemplateId: string | null;
  channelText: string;
  channelTitle?: string;
  /** Override timeout for the AI generation step. Default 120s. */
  generateTimeoutMs?: number;
  /** Override timeout for the logo overlay step. Default 30s. */
  overlayTimeoutMs?: number;
  /** Override timeout for the decompose step. Default 30s. */
  decomposeTimeoutMs?: number;
}

export interface ComposeStepResult {
  step: "decompose" | "generate" | "overlay-logo" | "overlay-footer";
  ok: boolean;
  durationMs: number;
  errorCode?: string;
  error?: string;
  imageUrl?: string;
  meta?: Record<string, unknown>;
}

export interface ComposeBrandedImageResult {
  success: boolean;
  imageUrl?: string;
  errorCode?: "CREDITS_EXHAUSTED" | "PROVIDER_ERROR" | "UNKNOWN";
  error?: string;
  steps: ComposeStepResult[];
}

interface BrandRow {
  id: string;
  brand_name?: string | null;
  logo_url?: string | null;
  logo_position?: string | null;
  logo_size_percent?: number | null;
  logo_style?: string | null;
  logo_opacity?: number | null;
  image_style_preset?: string | null;
  footer_info?: any;
  primary_color?: string | null;
  secondary_color?: string | null;
}

const VALID_POSITIONS = new Set<LogoPosition>([
  "top-left", "top-center", "top-right",
  "center-left", "center", "center-right",
  "bottom-left", "bottom-center", "bottom-right",
]);

const VALID_STYLES = new Set<LogoStyle>(["clean", "shadow", "glass", "pill", "subtle"]);

/** Channel → optimal aspect ratio (mirrors useAutoImageGeneration getAspectRatioForChannel) */
function aspectRatioForChannel(channel: string): "16:9" | "1:1" | "9:16" | "4:5" {
  if (channel === "tiktok") return "9:16";
  if (channel === "instagram" || channel === "threads") return "1:1";
  if (channel === "youtube") return "16:9";
  return "16:9"; // facebook, linkedin, default
}

function autoLogoPosition(channel: string): LogoPosition {
  if (channel === "tiktok") return "top-right";
  if (channel === "instagram") return "bottom-right";
  if (channel === "facebook") return "bottom-right";
  if (channel === "linkedin") return "bottom-right";
  return "bottom-right";
}

function normalizePosition(raw: string | null | undefined, channel: string): LogoPosition {
  if (!raw || raw === "auto") return autoLogoPosition(channel);
  return VALID_POSITIONS.has(raw as LogoPosition) ? (raw as LogoPosition) : autoLogoPosition(channel);
}

function normalizeStyle(raw: string | null | undefined): LogoStyle {
  if (!raw) return "shadow";
  return VALID_STYLES.has(raw as LogoStyle) ? (raw as LogoStyle) : "shadow";
}

/** First sentence (≤80 chars) — used as headline & textToInclude */
function extractHeadline(text: string): string {
  const trimmed = (text || "").trim();
  if (!trimmed) return "";
  // Split on sentence-ending punctuation or newline.
  const firstChunk = trimmed.split(/[.!?\n]/)[0]?.trim() || trimmed;
  return firstChunk.slice(0, 80);
}

async function fetchBrand(
  supabaseUrl: string,
  serviceKey: string,
  brandTemplateId: string,
): Promise<BrandRow | null> {
  try {
    const supabase = createClient(supabaseUrl, serviceKey);
    const { data, error } = await supabase
      .from("brand_templates")
      .select("id, brand_name, logo_url, logo_position, logo_size_percent, logo_style, logo_opacity, image_style_preset, footer_info, primary_color, secondary_color")
      .eq("id", brandTemplateId)
      .maybeSingle();
    if (error) {
      console.warn("[branded-image-composer] fetchBrand error:", error.message);
      return null;
    }
    return (data as BrandRow) ?? null;
  } catch (e) {
    console.warn("[branded-image-composer] fetchBrand threw:", e);
    return null;
  }
}

/**
 * STEP A — call decompose-image-request via service-key. Falls back to local regex
 * decomposeRequest on any failure (mirrors decomposeRequestWithAI's catch path).
 */
async function decomposeViaEdge(params: {
  supabaseUrl: string;
  serviceKey: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  topic?: string;
  imageStyle?: string;
  timeoutMs: number;
}): Promise<{ result: DecomposedRequest; usedFallback: boolean; durationMs: number; error?: string }> {
  const t0 = Date.now();
  const fallback = (errMsg?: string) => ({
    result: decomposeRequest(params.description, params.primaryColor, params.secondaryColor),
    usedFallback: true,
    durationMs: Date.now() - t0,
    error: errMsg,
  });

  try {
    const res = await fetch(`${params.supabaseUrl}/functions/v1/decompose-image-request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${params.serviceKey}`,
        "apikey": params.serviceKey,
      },
      body: JSON.stringify({
        description: params.description,
        primaryColor: params.primaryColor,
        secondaryColor: params.secondaryColor,
        context: {
          contentRole: "sprout",
          topic: params.topic,
          textToInclude: params.description,
        },
        imageStyle: params.imageStyle,
      }),
      signal: AbortSignal.timeout(params.timeoutMs),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return fallback(`HTTP ${res.status}: ${txt.slice(0, 200)}`);
    }

    const data: any = await res.json().catch(() => null);
    if (!data || data.errorCode || (data.error && !data.backgroundPrompt) || !data.backgroundPrompt?.description || !data.overlayConfig) {
      return fallback(data?.errorCode || data?.error || "incomplete decompose response");
    }

    const overlayConfig: StructuredOverlayConfig = {
      colors: data.overlayConfig.colors || { primary: params.primaryColor, secondary: params.secondaryColor, text: "#FFFFFF" },
      ...(data.overlayConfig.banner ? { banner: data.overlayConfig.banner } : {}),
      ...(data.overlayConfig.heroText ? { heroText: data.overlayConfig.heroText } : {}),
      ...(data.overlayConfig.headline ? { headline: data.overlayConfig.headline } : {}),
      ...(data.overlayConfig.cards ? { cards: data.overlayConfig.cards } : {}),
      ...(data.overlayConfig.cta ? { cta: data.overlayConfig.cta } : {}),
      ...(data.overlayConfig.footer ? { footer: data.overlayConfig.footer } : {}),
      ...(data.overlayConfig.summaryRibbon ? { summaryRibbon: data.overlayConfig.summaryRibbon } : {}),
    };

    return {
      result: {
        backgroundPrompt: {
          description: data.backgroundPrompt.description,
          colorScheme: data.backgroundPrompt.colorScheme || `Primary: ${params.primaryColor}, Secondary: ${params.secondaryColor}`,
          mood: data.backgroundPrompt.mood || "professional, modern",
          elements: data.backgroundPrompt.elements || [],
        },
        overlayConfig,
        suggestedLayout: data.suggestedLayout || undefined,
      },
      usedFallback: false,
      durationMs: Date.now() - t0,
    };
  } catch (e) {
    return fallback(e instanceof Error ? e.message : String(e));
  }
}

export async function composeBrandedImage(
  params: ComposeBrandedImageParams,
): Promise<ComposeBrandedImageResult> {
  const {
    supabaseUrl, serviceKey, contentId, channel, brandTemplateId, channelText, channelTitle,
    generateTimeoutMs = 120_000,
    overlayTimeoutMs = 30_000,
    decomposeTimeoutMs = 30_000,
  } = params;

  const steps: ComposeStepResult[] = [];

  // 0) Fetch brand
  const brand = brandTemplateId
    ? await fetchBrand(supabaseUrl, serviceKey, brandTemplateId)
    : null;

  const logoUrl = brand?.logo_url || null;
  const logoPosition = normalizePosition(brand?.logo_position, channel);
  const logoStyle = normalizeStyle(brand?.logo_style);
  const logoSizePercent = typeof brand?.logo_size_percent === "number" && brand.logo_size_percent > 0
    ? brand.logo_size_percent
    : 15;
  const logoOpacity = typeof brand?.logo_opacity === "number" && brand.logo_opacity > 0
    ? brand.logo_opacity
    : 100;

  const primaryColor = brand?.primary_color || "#DC2626";
  const secondaryColor = brand?.secondary_color || "#FFFFFF";

  // ===== STEP A — Decompose =====
  const decompose = await decomposeViaEdge({
    supabaseUrl, serviceKey,
    description: channelText,
    primaryColor, secondaryColor,
    topic: channelTitle,
    imageStyle: brand?.image_style_preset || undefined,
    timeoutMs: decomposeTimeoutMs,
  });
  steps.push({
    step: "decompose",
    ok: !decompose.usedFallback,
    durationMs: decompose.durationMs,
    error: decompose.error,
    meta: { usedFallback: decompose.usedFallback },
  });

  let decomposed = decompose.result;

  // Inject brand footer_info if AI/regex didn't surface one
  const brandFooterItems = buildFooterItemsFromBrand(brand?.footer_info);
  if (brandFooterItems.length > 0) {
    const existing = decomposed.overlayConfig.footer?.items || [];
    if (existing.length === 0) {
      decomposed = {
        ...decomposed,
        overlayConfig: {
          ...decomposed.overlayConfig,
          footer: { items: brandFooterItems },
        },
      };
    }
  }

  // ===== STEP B — Apply template (auto-select) =====
  const overlayTemplate = autoSelectTemplate(channelText, decomposed.overlayConfig);
  const templated = applyTemplate(overlayTemplate, decomposed, channelText, primaryColor);

  // After template-apply, re-inject brand footer if applyTemplate left a placeholder
  let overlayConfig = templated.overlayConfig;
  if (brandFooterItems.length > 0) {
    const currentItems = overlayConfig.footer?.items || [];
    const onlyPlaceholder = currentItems.length === 1 && /Liên hệ để được tư vấn/i.test(currentItems[0]?.text || "");
    if (currentItems.length === 0 || onlyPlaceholder) {
      overlayConfig = { ...overlayConfig, footer: { items: brandFooterItems } };
    }
  }

  // ===== STEP C — Generate base image with full structured payload =====
  const headline = extractHeadline(channelText);
  const channelAspectRatio = aspectRatioForChannel(channel);

  const genBody: Record<string, unknown> = {
    contentId,
    channel,
    brandTemplateId: brandTemplateId || undefined,
    contentSummary: decomposed.backgroundPrompt.description,
    aspectRatio: channelAspectRatio,
    imageStylePreset: brand?.image_style_preset || undefined,
    contentRole: "sprout",
    contentAngle: "educational",
    hookMessage: headline || undefined,
    imageContentType: "with_text",
    textToInclude: headline || undefined,
    textPosition: "center",
    typographyStyle: "modern",
    promptMode: "full",
    // Structured payload (triggers AI bake-in inside generate-brand-image)
    structuredElements: {
      ...(overlayConfig.banner ? { banner: overlayConfig.banner } : {}),
      ...(overlayConfig.heroText ? { heroText: overlayConfig.heroText } : {}),
      ...(overlayConfig.cards ? { cards: overlayConfig.cards } : {}),
      ...(overlayConfig.headline ? { headline: overlayConfig.headline } : {}),
      ...(overlayConfig.cta ? { cta: overlayConfig.cta } : {}),
      ...(overlayConfig.footer ? { footer: overlayConfig.footer } : {}),
      ...(overlayConfig.summaryRibbon ? { summaryRibbon: overlayConfig.summaryRibbon } : {}),
    },
    structuredColors: overlayConfig.colors,
    structuredTemplate: overlayTemplate,
  };
  if (logoUrl) {
    genBody.logoSafeZone = { position: logoPosition, sizePercent: logoSizePercent };
  }

  const t1 = Date.now();
  let baseImageUrl: string | undefined;
  let genErrorCode: ComposeBrandedImageResult["errorCode"] | undefined;
  let genErrorMsg: string | undefined;

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/generate-brand-image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
        "apikey": serviceKey,
      },
      body: JSON.stringify(genBody),
      signal: AbortSignal.timeout(generateTimeoutMs),
    });
    const dur = Date.now() - t1;
    if (!res.ok) {
      const errTxt = await res.text().catch(() => "");
      genErrorCode = "UNKNOWN";
      genErrorMsg = `HTTP ${res.status}: ${errTxt.slice(0, 200)}`;
      steps.push({ step: "generate", ok: false, durationMs: dur, errorCode: genErrorCode, error: genErrorMsg });
    } else {
      const data: any = await res.json().catch(() => ({}));
      if (data?.success === true && data?.imageUrl) {
        baseImageUrl = data.imageUrl;
        steps.push({
          step: "generate",
          ok: true,
          durationMs: dur,
          imageUrl: baseImageUrl,
          meta: {
            template: overlayTemplate,
            hasFooter: !!overlayConfig.footer,
            footerItems: overlayConfig.footer?.items?.length || 0,
            cards: overlayConfig.cards?.items?.length || 0,
            headlineLen: headline.length,
          },
        });
      } else {
        const code = (data?.errorCode || "UNKNOWN") as string;
        genErrorCode = code === "CREDITS_EXHAUSTED" ? "CREDITS_EXHAUSTED"
          : code === "PROVIDER_ERROR" ? "PROVIDER_ERROR"
          : "UNKNOWN";
        genErrorMsg = (data?.error || "unknown error").toString();
        steps.push({ step: "generate", ok: false, durationMs: dur, errorCode: genErrorCode, error: genErrorMsg });
      }
    }
  } catch (e) {
    const dur = Date.now() - t1;
    genErrorCode = "UNKNOWN";
    genErrorMsg = e instanceof Error ? e.message : String(e);
    steps.push({ step: "generate", ok: false, durationMs: dur, errorCode: genErrorCode, error: genErrorMsg });
  }

  if (!baseImageUrl) {
    return { success: false, errorCode: genErrorCode || "UNKNOWN", error: genErrorMsg, steps };
  }

  let finalImageUrl = baseImageUrl;

  // ===== STEP D — Overlay logo (canvas) — non-blocking =====
  if (logoUrl) {
    const t2 = Date.now();
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/overlay-logo-canvas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceKey}`,
          "apikey": serviceKey,
        },
        body: JSON.stringify({
          baseImageUrl: finalImageUrl,
          logoUrl,
          position: logoPosition,
          logoStyle,
          logoSizePercent,
          logoOpacity,
          padding: 20,
          contentId,
          channel,
        }),
        signal: AbortSignal.timeout(overlayTimeoutMs),
      });
      const dur = Date.now() - t2;
      if (!res.ok) {
        const errTxt = await res.text().catch(() => "");
        steps.push({ step: "overlay-logo", ok: false, durationMs: dur, error: `HTTP ${res.status}: ${errTxt.slice(0, 200)}` });
        console.warn(`[branded-image-composer] logo overlay non-OK ${res.status}, keeping base image`);
      } else {
        const data: any = await res.json().catch(() => ({}));
        if (data?.success && data?.imageUrl) {
          finalImageUrl = data.imageUrl;
          steps.push({ step: "overlay-logo", ok: true, durationMs: dur, imageUrl: finalImageUrl });
        } else {
          steps.push({ step: "overlay-logo", ok: false, durationMs: dur, error: data?.error || "no imageUrl returned" });
          console.warn(`[branded-image-composer] logo overlay returned no imageUrl, keeping base image`);
        }
      }
    } catch (e) {
      const dur = Date.now() - t2;
      const msg = e instanceof Error ? e.message : String(e);
      steps.push({ step: "overlay-logo", ok: false, durationMs: dur, error: msg });
      console.warn(`[branded-image-composer] logo overlay threw, keeping base image:`, msg);
    }
  } else {
    console.log("[branded-image-composer] no brand.logo_url, skipping logo overlay");
  }

  // Persist final URL onto multi_channel_contents.image_url
  if (finalImageUrl !== baseImageUrl) {
    try {
      const supabase = createClient(supabaseUrl, serviceKey);
      const { error: updErr } = await supabase
        .from("multi_channel_contents")
        .update({ image_url: finalImageUrl, updated_at: new Date().toISOString() })
        .eq("id", contentId);
      if (updErr) {
        console.warn("[branded-image-composer] failed to persist final imageUrl:", updErr.message);
      }
    } catch (e) {
      console.warn("[branded-image-composer] persist final imageUrl threw:", e);
    }
  }

  return { success: true, imageUrl: finalImageUrl, steps };
}

// ============================================================
// Branded Image Composer — shared helper
// Pipeline: generate-brand-image → overlay-logo-canvas → (footer TBD)
// Used by Telegram webhook (and reusable for other server-side flows)
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
}

export interface ComposeStepResult {
  step: "generate" | "overlay-logo" | "overlay-footer";
  ok: boolean;
  durationMs: number;
  errorCode?: string;
  error?: string;
  imageUrl?: string;
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

function autoLogoPosition(channel: string): LogoPosition {
  // Match autoSelectLogoPosition heuristics from useAutoImageGeneration
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

export async function composeBrandedImage(
  params: ComposeBrandedImageParams,
): Promise<ComposeBrandedImageResult> {
  const {
    supabaseUrl, serviceKey, contentId, channel, brandTemplateId, channelText,
    generateTimeoutMs = 120_000,
    overlayTimeoutMs = 30_000,
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

  // 1) STEP 1 — generate base image with full params
  const isShortText = channelText.length > 0 && channelText.length <= 120;
  const imageContentType = isShortText ? "with_text" : "background_only";

  const genBody: Record<string, unknown> = {
    contentId,
    channel,
    brandTemplateId: brandTemplateId || undefined,
    contentSummary: channelText.slice(0, 500),
    imageContentType,
    promptMode: "full",
    contentRole: "sprout",
  };
  if (isShortText) {
    genBody.textToInclude = channelText;
    genBody.textPosition = "center";
    genBody.typographyStyle = "modern";
  }
  if (brand?.image_style_preset) {
    genBody.imageStylePreset = brand.image_style_preset;
  }
  if (logoUrl) {
    genBody.logoSafeZone = {
      position: logoPosition,
      sizePercent: logoSizePercent,
    };
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
        steps.push({ step: "generate", ok: true, durationMs: dur, imageUrl: baseImageUrl });
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

  // 2) STEP 2 — overlay logo (canvas) — non-blocking
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

  // 3) STEP 3 — footer overlay (DEFERRED: no standalone server-side footer SVG function exists yet)
  // Manual flow uses a client-side Canvas/Satori path that is not portable to edge runtime.
  // Phase 2: extract that into `overlay-footer-canvas` edge function and wire it here.
  if (brand?.footer_info && Object.keys(brand.footer_info || {}).length > 0) {
    console.log("[branded-image-composer] footer_info present but server-side footer overlay is not yet implemented — deferred");
  }

  // Persist final URL onto multi_channel_contents.image_url so Mini App reads correct asset
  // generate-brand-image already wrote step1 URL; overlay-logo-canvas may also persist its own.
  // To be safe, upsert again if the URL changed in step 2.
  if (finalImageUrl !== baseImageUrl) {
    try {
      const supabase = createClient(supabaseUrl, serviceKey);
      // Update the channel-specific image in multi_channel_contents.channel_versions if structured that way,
      // OR fall back to the legacy image_url column.
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

// ============================================
// Shared helpers to build payload for `generate-carousel-images-batch`.
// Mirrors logic in `src/lib/carouselImageBatch.ts` so that BOTH the
// manual flow (frontend) and the AI Agent flow (edge functions) hit
// the same batch pipeline with identical inputs → same visual quality.
// ============================================

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

export interface BrandColors {
  textColor?: string;
  backgroundColor?: string;
}

/**
 * Resolve brand colors from (in order):
 *  1) explicit primary/secondary passed in
 *  2) parsed brand_guideline JSON / hex sniff
 *  3) brand_templates row lookup (primary_color + secondary_colors[0])
 */
export async function extractBrandColorsFromTemplate(
  supabase: SupabaseClient,
  opts: {
    brandTemplateId?: string | null;
    brandGuideline?: string | null;
    primaryColor?: string | null;
    secondaryColors?: string[] | null;
    brandName?: string | null;
  },
): Promise<BrandColors | undefined> {
  // 1) Direct values from caller (agent already has them in brief)
  if (opts.primaryColor) {
    return {
      textColor: opts.primaryColor,
      backgroundColor: (opts.secondaryColors && opts.secondaryColors[0]) || undefined,
    };
  }

  // 2) Try to parse brand_guideline (JSON or hex blob)
  if (opts.brandGuideline) {
    try {
      const parsed =
        typeof opts.brandGuideline === "string"
          ? JSON.parse(opts.brandGuideline)
          : opts.brandGuideline;
      if (parsed?.primaryColor) {
        return {
          textColor: parsed.primaryColor,
          backgroundColor: parsed.secondaryColors?.[0] || parsed.backgroundColor,
        };
      }
      if (parsed?.colors || parsed?.textColor) {
        return {
          textColor:
            parsed.textColor || parsed.colors?.text || parsed.colors?.primary,
          backgroundColor:
            parsed.backgroundColor ||
            parsed.colors?.background ||
            parsed.colors?.secondary,
        };
      }
    } catch {
      const hex = opts.brandGuideline.match(/#[0-9A-Fa-f]{3,8}/g);
      if (hex && hex.length >= 2) return { textColor: hex[0], backgroundColor: hex[1] };
      if (hex && hex.length === 1) return { textColor: hex[0] };
    }
  }

  // 3) DB fallback via brand_templates
  try {
    let tpl: any = null;
    if (opts.brandTemplateId) {
      const { data } = await supabase
        .from("brand_templates")
        .select("primary_color, secondary_colors")
        .eq("id", opts.brandTemplateId)
        .single();
      tpl = data;
    }
    if (!tpl && opts.brandName) {
      const { data } = await supabase
        .from("brand_templates")
        .select("primary_color, secondary_colors")
        .eq("brand_name", opts.brandName)
        .limit(1)
        .maybeSingle();
      tpl = data;
    }
    if (tpl?.primary_color) {
      return {
        textColor: tpl.primary_color,
        backgroundColor: (tpl.secondary_colors as string[])?.[0],
      };
    }
  } catch (err) {
    console.warn("[carousel-image-batch-payload] brand template lookup failed:", err);
  }
  return undefined;
}

export function buildSeriesBibleFromSlides(slides: any[]): string {
  const consistencyParts: string[] = [];
  slides.forEach((s) => {
    const m = s?.fullPrompt?.match(/consistent with (?:previous slides|series):\s*(.+?)$/im);
    if (m) consistencyParts.push(m[1].trim());
  });
  const uniqueParts = [...new Set(consistencyParts)];
  const slide1Prompt = slides[0]?.fullPrompt || "";
  return [
    `SERIES VISUAL BIBLE (applies to ALL slides):`,
    uniqueParts.length > 0
      ? `Visual world: ${uniqueParts.join(". ")}.`
      : `Visual world: ${slides[0]?.designStyle || "professional photography"}.`,
    `Total slides in series: ${slides.length}.`,
    `All slides share the SAME: lighting direction, color temperature, photography style, environment/setting, and visual mood.`,
    `DIFFERENTIATION: Each slide MUST use a DIFFERENT camera angle (wide/medium/close-up/overhead/side), focal subject, and composition while staying in the same visual world. No two slides should look alike.`,
    `Reference scene (slide 1): "${slide1Prompt.slice(0, 200)}..."`,
  ].join("\n");
}

export function buildSiblingsSummary(slides: any[]): string {
  return slides
    .map((s, i) => `Slide ${s?.slideNumber ?? i + 1}: ${s?.objective ?? ""}`)
    .join(" | ");
}

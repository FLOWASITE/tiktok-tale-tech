// ============================================
// LAYER 7: CREATIVE DIRECTOR STEP
// 1 LLM call/carousel → metaphor + mood arc + typography role per slide.
// Fail-soft: any error returns null, batch falls back to Layer 4-6 pipeline.
// ============================================

import { getAIConfig } from "./ai-config.ts";

export type SlideRole = 'hook' | 'explain' | 'data' | 'support' | 'cta';
export type TypographyArchetype =
  | 'editorial-hero'
  | 'data-display'
  | 'supporting-body'
  | 'cta-poster'
  | 'caption-only';

export interface MoodArcEntry {
  slideNumber: number;
  role: SlideRole;
  contrast: 'high' | 'mid' | 'low';
  saturation: 'bold' | 'muted' | 'accent';
  focalIntent: string;
}

export interface TypographyRoleEntry {
  slideNumber: number;
  archetype: TypographyArchetype;
}

export interface CreativeDirection {
  metaphor: { chosen: string; rejected: string[]; reasoning: string };
  moodArc: MoodArcEntry[];
  typographyRole: TypographyRoleEntry[];
}

interface SlideHint {
  slideNumber: number;
  objective?: string;
  textContent?: any;
}

export interface CreativeDirectionInput {
  topic: string;
  carouselStyle?: string;
  visualPreset?: string;
  slides: SlideHint[];
  brandColors?: { backgroundColor?: string; textColor?: string } | null;
  organizationId?: string;
  traceId: string;
}

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "set_creative_direction",
    description: "Return the locked creative direction for this carousel.",
    parameters: {
      type: "object",
      properties: {
        metaphor: {
          type: "object",
          properties: {
            chosen: { type: "string", description: "1-2 sentence abstract visual metaphor. NO arrows, charts, gears, light bulbs, neon, circuit boards." },
            rejected: { type: "array", items: { type: "string" }, description: "2 rejected metaphors that were too literal." },
            reasoning: { type: "string", description: "1 sentence why chosen wins." },
          },
          required: ["chosen", "rejected", "reasoning"],
          additionalProperties: false,
        },
        moodArc: {
          type: "array",
          items: {
            type: "object",
            properties: {
              slideNumber: { type: "integer" },
              role: { type: "string", enum: ["hook", "explain", "data", "support", "cta"] },
              contrast: { type: "string", enum: ["high", "mid", "low"] },
              saturation: { type: "string", enum: ["bold", "muted", "accent"] },
              focalIntent: { type: "string", description: "1 short sentence: what this slide makes the viewer feel/do." },
            },
            required: ["slideNumber", "role", "contrast", "saturation", "focalIntent"],
            additionalProperties: false,
          },
        },
        typographyRole: {
          type: "array",
          items: {
            type: "object",
            properties: {
              slideNumber: { type: "integer" },
              archetype: { type: "string", enum: ["editorial-hero", "data-display", "supporting-body", "cta-poster", "caption-only"] },
            },
            required: ["slideNumber", "archetype"],
            additionalProperties: false,
          },
        },
      },
      required: ["metaphor", "moodArc", "typographyRole"],
      additionalProperties: false,
    },
  },
};

export async function runCreativeDirection(
  input: CreativeDirectionInput,
): Promise<CreativeDirection | null> {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableKey) return null;

  let model = 'google/gemini-2.5-flash';
  let maxTokens = 1200;
  try {
    const cfg = await getAIConfig('carousel-creative-direction', input.organizationId);
    if (cfg?.model_override) model = cfg.model_override;
    if (cfg?.max_tokens) maxTokens = cfg.max_tokens;
  } catch { /* defaults */ }

  const slideCount = input.slides.length;
  const slideSummary = input.slides.map((s) => {
    const tc = s.textContent;
    const head = typeof tc === 'object' && tc?.headline ? tc.headline : (typeof tc === 'string' ? tc.split('\n')[0] : '');
    return `  - Slide ${s.slideNumber}: objective=${s.objective || 'n/a'} | text="${(head || '').toString().slice(0, 80)}"`;
  }).join('\n');

  const brandLine = input.brandColors?.backgroundColor
    ? `Brand primary color: ${input.brandColors.backgroundColor}${input.brandColors.textColor ? `, secondary: ${input.brandColors.textColor}` : ''}.`
    : 'No brand colors specified — choose a palette aligned with mood.';

  const systemPrompt = `You are an award-winning Art Director / Creative Director for a top editorial design studio (think Pentagram, Apple Marcom, Dezeen). You direct carousels for social media that look museum-grade — never generic AI imagery.

Your job has 3 outputs:
1. METAPHOR — pick 1 abstract, lateral visual metaphor for the topic. STRICTLY FORBIDDEN: arrows pointing up, bar/line charts, gears, light bulbs, circuit boards, neon grids, brain icons, handshakes, target+dart, rocket launching, generic "growth" plants. Think materials, natural phenomena, architecture, fabric, light, weight, gravity, scale shifts, negative space, time-lapse. Output the chosen metaphor + 2 metaphors you REJECTED for being too literal.
2. MOOD ARC — assign each slide a role and a contrast/saturation/focalIntent so the series tells a story (typically: hook = high contrast bold tension → explain = mid muted clarity → data = high accent focus → support = mid muted texture → cta = low/mid bold resolution). Adapt to actual slide count.
3. TYPOGRAPHY ROLE — map each slide to ONE archetype:
   - editorial-hero: serif display, generous, narrative (best for hook/opening)
   - data-display: massive numeral + tiny label (best for stat/data slides)
   - supporting-body: clean sans body, comfortable measure (best for explain/support)
   - cta-poster: huge condensed sans, all-caps, single line (best for CTA/closing)
   - caption-only: ghost caption, no big text (best for purely visual slides)
Return strictly via the tool call.`;

  const userPrompt = `Topic: ${input.topic}
Carousel style: ${input.carouselStyle || 'educational'}
Visual preset: ${input.visualPreset || 'minimalist'}
${brandLine}
Slide count: ${slideCount}
Slides:
${slideSummary}

Direct this carousel.`;

  try {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 12_000);
    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${lovableKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [TOOL_SCHEMA],
        tool_choice: { type: 'function', function: { name: 'set_creative_direction' } },
        max_tokens: maxTokens,
      }),
      signal: ctl.signal,
    }).catch((e) => {
      console.warn(`[creative-direction] fetch failed traceId=${input.traceId}:`, String(e));
      return null;
    });
    clearTimeout(to);

    if (!resp || !resp.ok) {
      if (resp) {
        const t = await resp.text().catch(() => '');
        if (resp.status === 402) {
          console.info(`[creative-direction] Lovable Gateway 402 (no credits) → skipping creative direction, batch continues with fallback prompts. traceId=${input.traceId}`);
        } else {
          console.warn(`[creative-direction] non-ok status=${resp.status} traceId=${input.traceId}: ${t.slice(0, 200)}`);
        }
      }
      return null;
    }

    const json = await resp.json().catch(() => null);
    const toolCall = json?.choices?.[0]?.message?.tool_calls?.[0];
    const argsRaw = toolCall?.function?.arguments;
    if (!argsRaw) {
      console.warn(`[creative-direction] no tool_calls returned traceId=${input.traceId}`);
      return null;
    }

    let parsed: any;
    try {
      parsed = typeof argsRaw === 'string' ? JSON.parse(argsRaw) : argsRaw;
    } catch (e) {
      console.warn(`[creative-direction] JSON parse fail traceId=${input.traceId}:`, e);
      return null;
    }

    if (!parsed?.metaphor?.chosen || !Array.isArray(parsed?.moodArc) || !Array.isArray(parsed?.typographyRole)) {
      console.warn(`[creative-direction] schema validation fail traceId=${input.traceId}`);
      return null;
    }

    // Pad/trim arrays to slide count to be safe
    const moodArc: MoodArcEntry[] = [];
    const typoRole: TypographyRoleEntry[] = [];
    for (let i = 1; i <= slideCount; i++) {
      const m = parsed.moodArc.find((x: any) => x.slideNumber === i) || parsed.moodArc[i - 1];
      const t = parsed.typographyRole.find((x: any) => x.slideNumber === i) || parsed.typographyRole[i - 1];
      moodArc.push({
        slideNumber: i,
        role: (m?.role || (i === 1 ? 'hook' : i === slideCount ? 'cta' : 'explain')) as SlideRole,
        contrast: (m?.contrast || 'mid') as any,
        saturation: (m?.saturation || 'muted') as any,
        focalIntent: m?.focalIntent || '',
      });
      typoRole.push({
        slideNumber: i,
        archetype: (t?.archetype || (i === 1 ? 'editorial-hero' : i === slideCount ? 'cta-poster' : 'supporting-body')) as TypographyArchetype,
      });
    }

    const result: CreativeDirection = {
      metaphor: {
        chosen: parsed.metaphor.chosen,
        rejected: Array.isArray(parsed.metaphor.rejected) ? parsed.metaphor.rejected.slice(0, 3) : [],
        reasoning: parsed.metaphor.reasoning || '',
      },
      moodArc,
      typographyRole: typoRole,
    };

    const usage = json?.usage;
    console.log(`[creative-direction] OK traceId=${input.traceId} model=${model} metaphor="${result.metaphor.chosen.slice(0, 100)}" tokens=${usage?.total_tokens || '?'}`);
    return result;
  } catch (e) {
    console.warn(`[creative-direction] unexpected error traceId=${input.traceId}:`, e);
    return null;
  }
}

// ===== Typography archetype → prompt directives =====

interface ArchetypeSpec {
  displayFont: string;
  bodyFont: string;
  ratio: string;
  composition: string;
  kerningRule: string;
}

const ARCHETYPE_SPECS: Record<TypographyArchetype, ArchetypeSpec> = {
  'editorial-hero': {
    displayFont: 'Playfair Display or Fraunces (high-contrast modern serif with delicate brackets)',
    bodyFont: 'Inter or Söhne (clean geometric sans)',
    ratio: '8:1',
    composition: 'Left-aligned hanging from upper-left third, headline breaks across 2-3 lines with intentional line breaks at phrase boundaries, generous leading 1.4, hanging quotation if any.',
    kerningRule: 'Optical kerning on display; numerals oldstyle if mixed in body.',
  },
  'data-display': {
    displayFont: 'Archivo Black or Bebas Neue (condensed bold) for the numeral',
    bodyFont: 'IBM Plex Mono or Söhne Mono (monospace) for label',
    ratio: '12:1',
    composition: 'Numeral centered or hard-anchored to grid, label sits directly beneath in UPPERCASE with 0.15em tracking. Massive scale jump between number and label.',
    kerningRule: 'Tabular numerals, tight tracking on numeral (-0.02em), wide tracking on label.',
  },
  'supporting-body': {
    displayFont: 'Inter Bold or Söhne Bold',
    bodyFont: 'Inter Regular or Söhne Regular',
    ratio: '3:1',
    composition: 'Left-aligned, comfortable measure (~45 characters per line), leading 1.6, body breaks naturally — never centered body text.',
    kerningRule: 'Default kerning; widows/orphans avoided.',
  },
  'cta-poster': {
    displayFont: 'Druk Wide, Anton, or Knockout (massive condensed sans)',
    bodyFont: 'Inter Medium',
    ratio: '6:1',
    composition: 'Single line of headline ALL-CAPS centered with 0.05em tracking, optical horizontal centering, supporting line below in small sentence-case.',
    kerningRule: 'Tight tracking on caps headline; no decorative flourish.',
  },
  'caption-only': {
    displayFont: 'Inter Medium (no display)',
    bodyFont: 'Inter Medium',
    ratio: '1:1',
    composition: 'Tiny ghost caption in bottom-left corner, low-contrast against background, lots of empty space — image carries the meaning.',
    kerningRule: 'Tracking 0.1em on caption.',
  },
};

export function buildTypographyDirective(
  archetype: TypographyArchetype,
  textParts: { dataValue?: string; dataLabel?: string; headline?: string; subtitle?: string; caption?: string },
  positionDesc: string,
  bgTreatment: string,
  textColorDesc: string,
): string {
  const spec = ARCHETYPE_SPECS[archetype];
  const hierarchy: string[] = [];
  if (textParts.dataValue) {
    hierarchy.push(`  1. Numeral "${textParts.dataValue}" — display weight, ${spec.ratio.split(':')[0]}× base size, ${spec.kerningRule}`);
    if (textParts.dataLabel) hierarchy.push(`  2. Label "${textParts.dataLabel}" — body weight UPPERCASE, base × 0.6, tracking 0.15em`);
  }
  if (textParts.headline) {
    const idx = hierarchy.length + 1;
    hierarchy.push(`  ${idx}. Headline "${textParts.headline}" — display weight, base × 4, leading 1.2`);
  }
  if (textParts.subtitle) {
    const idx = hierarchy.length + 1;
    hierarchy.push(`  ${idx}. Subtitle "${textParts.subtitle}" — body regular, base × 1.5, leading 1.5, color at 70% opacity`);
  }
  if (textParts.caption) {
    const idx = hierarchy.length + 1;
    hierarchy.push(`  ${idx}. Caption "${textParts.caption}" — body medium UPPERCASE, base × 0.6, tracking 0.15em`);
  }

  return `

TYPOGRAPHIC SYSTEM (museum-grade — execute as a master typographer would, NOT a generic AI text overlay):
Archetype: ${archetype}
Display font character: ${spec.displayFont} — or any visually identical alternative. NO Helvetica, NO Arial, NO default web sans.
Body font character: ${spec.bodyFont}
Display:body size ratio: ${spec.ratio}
Composition rule: ${spec.composition}
Position context: ${positionDesc}.
Text color: ${textColorDesc}.
${bgTreatment}

Hierarchy (top to bottom, EXACT text — do not change, translate, or rephrase):
${hierarchy.join('\n')}

Optical adjustments (mandatory):
- Kern manually for each character pair; no machine-flat spacing.
- Numerals: tabular alignment for data, oldstyle when inline with body.
- Quotation marks must be typographic (" " ' ') — never straight (" ').
- No widows or orphans on multi-line text.
- If text is in Vietnamese, render diacritics correctly: ă â ê ô ơ ư đ + tone marks (sắc huyền hỏi ngã nặng).
- Text must be sharp, high-contrast, perfectly readable.

FORBIDDEN:
- Generic "modern sans" fallback — commit to the archetype font character.
- Centering text when composition rule says left-aligned (or vice versa).
- Adding any extra labels, watermarks, badges, or UI chrome not listed above.
`;
}

export function archetypeForFallback(slideNum: number, totalSlides: number, visualPreset?: string): TypographyArchetype {
  if (slideNum === 1) {
    if (visualPreset === 'gradient' || visualPreset === 'corporate') return 'cta-poster';
    return 'editorial-hero';
  }
  if (slideNum === totalSlides) return 'cta-poster';
  return 'supporting-body';
}

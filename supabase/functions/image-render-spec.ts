export type RatioRenderVariant = 'wide' | 'square' | 'tall';
export type DensityMode = 'minimal' | 'balanced' | 'dense';
export type TextStrategy = 'hero_first' | 'headline_first' | 'card_first';
export type FooterStrategy = 'none' | 'compact' | 'contact_bar';
export type CtaStrategy = 'hidden' | 'inline' | 'primary_button';
export type LogoProtection = 'low' | 'medium' | 'high';
export type AiLayoutMode = 'hero-led' | 'stacked-cards' | 'split-editorial' | 'footer-contact' | 'stat-focus';
export type RecommendedOverlayMode = 'ai_render' | 'hybrid_footer' | 'satori';
export type FallbackHint = 'none' | 'hybrid_footer' | 'renderer_full';

export interface RenderSpecSummary {
  channel: string;
  aspectRatio: string;
  ratioVariant: RatioRenderVariant;
  textDensityBudget: number;
  headlineBudget: number;
  ctaBudget: number;
  footerBudget: number;
  safeZones: { top: number; right: number; bottom: number; left: number };
  preferredLogoPositions: string[];
  layoutBias: AiLayoutMode;
}

export interface LayoutBehaviorPlan {
  densityMode: DensityMode;
  textStrategy: TextStrategy;
  footerStrategy: FooterStrategy;
  ctaStrategy: CtaStrategy;
  logoProtection: LogoProtection;
  aiLayoutMode: AiLayoutMode;
  recommendedOverlayMode: RecommendedOverlayMode;
  fallbackHint: FallbackHint;
  confidenceScore: number;
}

interface OverlayLike {
  banner?: { text?: string };
  heroText?: { text?: string };
  headline?: string;
  cards?: { items?: Array<{ label?: string; description?: string }> };
  cta?: string;
  footer?: { items?: Array<{ text?: string }> };
}

interface BuildPlanInput {
  channel?: string;
  aspectRatio?: string;
  suggestedLayout?: string | null;
  overlay?: OverlayLike;
  logoSafeZone?: { position?: string; sizePercent?: number } | null;
}

const CHANNEL_BASE_SPEC: Record<string, Omit<RenderSpecSummary, 'channel' | 'aspectRatio' | 'ratioVariant'>> = {
  tiktok: {
    textDensityBudget: 0.42,
    headlineBudget: 42,
    ctaBudget: 18,
    footerBudget: 44,
    safeZones: { top: 0.1, right: 0.08, bottom: 0.22, left: 0.08 },
    preferredLogoPositions: ['top-right', 'top-left'],
    layoutBias: 'stacked-cards',
  },
  instagram: {
    textDensityBudget: 0.52,
    headlineBudget: 54,
    ctaBudget: 22,
    footerBudget: 58,
    safeZones: { top: 0.08, right: 0.08, bottom: 0.14, left: 0.08 },
    preferredLogoPositions: ['bottom-right', 'top-right'],
    layoutBias: 'hero-led',
  },
  facebook: {
    textDensityBudget: 0.66,
    headlineBudget: 70,
    ctaBudget: 26,
    footerBudget: 74,
    safeZones: { top: 0.06, right: 0.06, bottom: 0.1, left: 0.06 },
    preferredLogoPositions: ['bottom-right', 'top-left'],
    layoutBias: 'split-editorial',
  },
  linkedin: {
    textDensityBudget: 0.64,
    headlineBudget: 68,
    ctaBudget: 24,
    footerBudget: 78,
    safeZones: { top: 0.06, right: 0.06, bottom: 0.1, left: 0.06 },
    preferredLogoPositions: ['bottom-right', 'top-left'],
    layoutBias: 'split-editorial',
  },
  threads: {
    textDensityBudget: 0.5,
    headlineBudget: 50,
    ctaBudget: 20,
    footerBudget: 52,
    safeZones: { top: 0.08, right: 0.08, bottom: 0.14, left: 0.08 },
    preferredLogoPositions: ['bottom-right', 'top-right'],
    layoutBias: 'stacked-cards',
  },
  telegram: {
    textDensityBudget: 0.5,
    headlineBudget: 50,
    ctaBudget: 20,
    footerBudget: 52,
    safeZones: { top: 0.08, right: 0.08, bottom: 0.14, left: 0.08 },
    preferredLogoPositions: ['bottom-right', 'top-right'],
    layoutBias: 'stacked-cards',
  },
  default: {
    textDensityBudget: 0.58,
    headlineBudget: 60,
    ctaBudget: 22,
    footerBudget: 60,
    safeZones: { top: 0.08, right: 0.08, bottom: 0.12, left: 0.08 },
    preferredLogoPositions: ['bottom-right', 'top-right'],
    layoutBias: 'hero-led',
  },
};

const TEMPLATE_BIAS: Record<string, AiLayoutMode> = {
  comparison_card: 'split-editorial',
  timeline_steps: 'stacked-cards',
  checklist_card: 'stacked-cards',
  product_spotlight: 'hero-led',
  problem_solution: 'split-editorial',
  testimonial_card: 'hero-led',
  stat_spotlight: 'stat-focus',
  contact_card: 'footer-contact',
  editorial_cover: 'hero-led',
  education_infographic: 'stacked-cards',
  infographic: 'split-editorial',
  feature_list: 'stacked-cards',
  poster: 'hero-led',
  quote_card: 'hero-led',
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function resolveRatioVariant(aspectRatio?: string): RatioRenderVariant {
  if (aspectRatio === '16:9') return 'wide';
  if (aspectRatio === '1:1') return 'square';
  return 'tall';
}

export function getRenderSpec(channel?: string, aspectRatio?: string): RenderSpecSummary {
  const normalizedChannel = channel || 'default';
  const base = CHANNEL_BASE_SPEC[normalizedChannel] || CHANNEL_BASE_SPEC.default;
  const ratioVariant = resolveRatioVariant(aspectRatio);
  const ratioAdjustments = ratioVariant === 'wide'
    ? { textDensityBudget: 0.08, headlineBudget: 10, ctaBudget: 4, footerBudget: 12, bottomSafe: -0.02 }
    : ratioVariant === 'square'
      ? { textDensityBudget: -0.04, headlineBudget: -6, ctaBudget: -2, footerBudget: -6, bottomSafe: 0.02 }
      : { textDensityBudget: -0.12, headlineBudget: -14, ctaBudget: -6, footerBudget: -16, bottomSafe: 0.08 };

  return {
    channel: normalizedChannel,
    aspectRatio: aspectRatio || '16:9',
    ratioVariant,
    textDensityBudget: clamp(base.textDensityBudget + ratioAdjustments.textDensityBudget, 0.28, 0.8),
    headlineBudget: Math.max(28, base.headlineBudget + ratioAdjustments.headlineBudget),
    ctaBudget: Math.max(12, base.ctaBudget + ratioAdjustments.ctaBudget),
    footerBudget: Math.max(28, base.footerBudget + ratioAdjustments.footerBudget),
    safeZones: {
      ...base.safeZones,
      bottom: clamp(base.safeZones.bottom + ratioAdjustments.bottomSafe, 0.08, 0.28),
    },
    preferredLogoPositions: base.preferredLogoPositions,
    layoutBias: base.layoutBias,
  };
}

function truncateAtWord(text: string | undefined, maxChars: number): string | undefined {
  if (!text) return text;
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  const sliced = trimmed.slice(0, maxChars);
  const lastSpace = sliced.lastIndexOf(' ');
  return (lastSpace > maxChars * 0.55 ? sliced.slice(0, lastSpace) : sliced).trim();
}

export function applyTextBudgetsToOverlay<T extends OverlayLike>(overlay: T, spec: RenderSpecSummary): T {
  const next = structuredClone(overlay);
  if (next.banner?.text) next.banner.text = truncateAtWord(next.banner.text, Math.min(32, spec.headlineBudget - 18));
  if (next.heroText?.text) next.heroText.text = truncateAtWord(next.heroText.text, Math.min(20, Math.round(spec.headlineBudget * 0.42)));
  if (next.headline) next.headline = truncateAtWord(next.headline, spec.headlineBudget);
  if (next.cta) next.cta = truncateAtWord(next.cta, spec.ctaBudget);
  if (next.cards?.items) {
    const labelBudget = spec.ratioVariant === 'wide' ? 38 : spec.ratioVariant === 'square' ? 30 : 24;
    const descBudget = spec.ratioVariant === 'wide' ? 64 : spec.ratioVariant === 'square' ? 46 : 34;
    next.cards.items = next.cards.items.slice(0, spec.ratioVariant === 'wide' ? 4 : 3).map((item) => ({
      ...item,
      label: truncateAtWord(item.label, labelBudget),
      description: truncateAtWord(item.description, descBudget),
    }));
  }
  if (next.footer?.items) {
    const itemBudget = Math.max(18, Math.round(spec.footerBudget / Math.max(next.footer.items.length, 1)));
    next.footer.items = next.footer.items.slice(0, 4).map((item) => ({
      ...item,
      text: truncateAtWord(item.text, itemBudget),
    }));
  }
  return next;
}

export function buildAiRenderPlan(input: BuildPlanInput): { renderSpec: RenderSpecSummary; layoutBehavior: LayoutBehaviorPlan } {
  const renderSpec = getRenderSpec(input.channel, input.aspectRatio);
  const overlay = input.overlay || {};
  const templateBias = TEMPLATE_BIAS[input.suggestedLayout || ''] || renderSpec.layoutBias;
  const cardsCount = overlay.cards?.items?.length || 0;
  const headlineLength = overlay.headline?.trim().length || 0;
  const heroLength = overlay.heroText?.text?.trim().length || 0;
  const ctaLength = overlay.cta?.trim().length || 0;
  const footerLength = overlay.footer?.items?.reduce((sum, item) => sum + (item.text?.trim().length || 0), 0) || 0;
  const hasCardDescriptions = !!overlay.cards?.items?.some((item) => (item.description?.trim().length || 0) > 0);
  const densityScore = headlineLength + heroLength + ctaLength + footerLength + (cardsCount * 18) + (hasCardDescriptions ? cardsCount * 20 : 0);
  const densityMode: DensityMode = densityScore > 210 ? 'dense' : densityScore > 120 ? 'balanced' : 'minimal';
  const logoPosition = input.logoSafeZone?.position || '';
  const logoProtection: LogoProtection = /bottom-center|center/.test(logoPosition)
    ? 'high'
    : /top-center|bottom-left|bottom-right/.test(logoPosition)
      ? 'medium'
      : 'low';
  const footerStrategy: FooterStrategy = footerLength === 0
    ? 'none'
    : renderSpec.ratioVariant === 'tall' || densityMode === 'dense'
      ? 'compact'
      : 'contact_bar';
  const ctaStrategy: CtaStrategy = !overlay.cta
    ? 'hidden'
    : renderSpec.ratioVariant === 'wide' && densityMode !== 'dense'
      ? 'primary_button'
      : 'inline';
  const textStrategy: TextStrategy = input.suggestedLayout === 'stat_spotlight' || heroLength > headlineLength
    ? 'hero_first'
    : cardsCount >= 3
      ? 'card_first'
      : 'headline_first';

  const riskyBottomCenter = logoPosition === 'bottom-center' && !!overlay.cta && footerLength > 0;
  const tallDense = renderSpec.ratioVariant === 'tall' && (densityMode === 'dense' || footerLength > renderSpec.footerBudget);
  const comparisonDense = input.suggestedLayout === 'comparison_card' && hasCardDescriptions && renderSpec.ratioVariant !== 'wide';
  const recommendedOverlayMode: RecommendedOverlayMode = riskyBottomCenter || tallDense || comparisonDense
    ? 'satori'
    : footerStrategy !== 'none' || logoProtection === 'high'
      ? 'hybrid_footer'
      : 'ai_render';
  const fallbackHint: FallbackHint = recommendedOverlayMode === 'satori'
    ? 'renderer_full'
    : recommendedOverlayMode === 'hybrid_footer'
      ? 'hybrid_footer'
      : 'none';

  let confidenceScore = 0.9;
  if (densityMode === 'balanced') confidenceScore -= 0.12;
  if (densityMode === 'dense') confidenceScore -= 0.26;
  if (footerStrategy !== 'none') confidenceScore -= 0.12;
  if (logoProtection === 'high') confidenceScore -= 0.12;
  if (renderSpec.ratioVariant === 'tall' && cardsCount >= 3) confidenceScore -= 0.1;
  if (riskyBottomCenter) confidenceScore -= 0.1;

  return {
    renderSpec,
    layoutBehavior: {
      densityMode,
      textStrategy,
      footerStrategy,
      ctaStrategy,
      logoProtection,
      aiLayoutMode: templateBias,
      recommendedOverlayMode,
      fallbackHint,
      confidenceScore: clamp(Number(confidenceScore.toFixed(2)), 0.35, 0.95),
    },
  };
}

export function formatRenderSpecBrief(spec: RenderSpecSummary): string {
  return [
    `SOCIAL RENDER SPEC: ${spec.channel} ${spec.aspectRatio}`,
    `- Ratio behavior: ${spec.ratioVariant}`,
    `- Layout bias: ${spec.layoutBias}`,
    `- Text density budget: ${Math.round(spec.textDensityBudget * 100)}% canvas`,
    `- Headline budget: ${spec.headlineBudget} chars`,
    `- CTA budget: ${spec.ctaBudget} chars`,
    `- Footer budget: ${spec.footerBudget} chars`,
    `- Safe zones: top ${Math.round(spec.safeZones.top * 100)}%, bottom ${Math.round(spec.safeZones.bottom * 100)}%, left ${Math.round(spec.safeZones.left * 100)}%, right ${Math.round(spec.safeZones.right * 100)}%`,
    `- Preferred logo positions: ${spec.preferredLogoPositions.join(', ')}`,
  ].join('\n');
}
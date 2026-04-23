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

export interface TemplateInstructionContract {
  id: string;
  semanticPurpose: string;
  visualPriority: string[];
  sectionOrder: string[];
  ratioAdaptation: Record<RatioRenderVariant, string>;
  maxCardsByRatio: Record<RatioRenderVariant, number>;
  heroPolicy: 'none' | 'optional' | 'required';
  heroHeadlineRule: string;
  ctaPolicy: 'none' | 'optional' | 'required';
  ctaRule: string;
  footerPolicy: FooterStrategy;
  footerRule: string;
  textReductionOrder: string[];
  logoAvoidanceRule: string;
  defaultLayoutMode: AiLayoutMode;
  narrowAdaptation: 'stack' | 'compact' | 'reduce_cards';
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
  maxCards: number;
  stackPreference: 'split' | 'stack' | 'compact';
  textReductionOrder: string[];
  templateInstructionId: string;
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

export const TEMPLATE_INSTRUCTION_LIBRARY: Record<string, TemplateInstructionContract> = {
  poster: {
    id: 'poster',
    semanticPurpose: 'Conversion-led poster with a dominant headline and direct CTA.',
    visualPriority: ['banner', 'headline', 'cta'],
    sectionOrder: ['banner', 'headline', 'cta'],
    ratioAdaptation: {
      wide: 'Use a clean hero field with headline and CTA aligned on a single visual path; avoid over-framing.',
      square: 'Compress spacing and keep the headline above a compact CTA block.',
      tall: 'Use a compact vertical stack, shorten headline aggressively, and keep CTA off the bottom UI zone.',
    },
    maxCardsByRatio: { wide: 1, square: 1, tall: 0 },
    heroPolicy: 'none',
    heroHeadlineRule: 'Do not add hero numerics; let the headline carry the message.',
    ctaPolicy: 'required',
    ctaRule: 'CTA must stay short, isolated, and visually stronger than secondary text.',
    footerPolicy: 'none',
    footerRule: 'Avoid footer unless contact info is the primary task.',
    textReductionOrder: ['description', 'footer', 'headline'],
    logoAvoidanceRule: 'Leave the logo zone clean and do not let the CTA touch that area.',
    defaultLayoutMode: 'hero-led',
    narrowAdaptation: 'compact',
  },
  infographic: {
    id: 'infographic',
    semanticPurpose: 'Educational split layout mixing a hero insight with structured support cards.',
    visualPriority: ['banner', 'heroText', 'cards'],
    sectionOrder: ['banner', 'heroText', 'cards'],
    ratioAdaptation: {
      wide: 'Keep a true split-editorial layout: hero insight on one side, cards on the opposite side.',
      square: 'Reduce the split tension and allow hero above a compact 2x2 card block.',
      tall: 'Abandon the wide split and stack hero above fewer cards.',
    },
    maxCardsByRatio: { wide: 4, square: 3, tall: 2 },
    heroPolicy: 'required',
    heroHeadlineRule: 'Hero text should dominate; headline becomes optional support only when clarity is needed.',
    ctaPolicy: 'optional',
    ctaRule: 'CTA should be hidden unless the brief is explicitly conversion-oriented.',
    footerPolicy: 'none',
    footerRule: 'Do not add footer unless contact information is essential and very short.',
    textReductionOrder: ['card_description', 'card_count', 'footer'],
    logoAvoidanceRule: 'Keep split edge and card columns away from the logo zone.',
    defaultLayoutMode: 'split-editorial',
    narrowAdaptation: 'reduce_cards',
  },
  quote_card: {
    id: 'quote_card',
    semanticPurpose: 'Emotion-first quote or keyword composition with minimal supporting UI.',
    visualPriority: ['heroText', 'banner'],
    sectionOrder: ['heroText', 'banner'],
    ratioAdaptation: {
      wide: 'Center the quote with generous whitespace and a restrained banner edge.',
      square: 'Keep the quote centered and reduce banner weight.',
      tall: 'Use a single dominant text block and avoid extra elements.',
    },
    maxCardsByRatio: { wide: 0, square: 0, tall: 0 },
    heroPolicy: 'required',
    heroHeadlineRule: 'Use either hero quote text or headline, never both as equal-weight blocks.',
    ctaPolicy: 'none',
    ctaRule: 'No CTA unless the user explicitly requests a conversion variant.',
    footerPolicy: 'none',
    footerRule: 'Avoid footer entirely.',
    textReductionOrder: ['banner'],
    logoAvoidanceRule: 'Do not let quote text collide with the logo clear zone.',
    defaultLayoutMode: 'hero-led',
    narrowAdaptation: 'compact',
  },
  feature_list: {
    id: 'feature_list',
    semanticPurpose: 'Scan-friendly vertical or stacked list for benefits and tips.',
    visualPriority: ['banner', 'cards'],
    sectionOrder: ['banner', 'cards', 'cta'],
    ratioAdaptation: {
      wide: 'Cards can sit in a neat row or compact grid, but keep scanning direction obvious.',
      square: 'Prefer a short vertical list with equal rhythm.',
      tall: 'Use a compact checklist-style column and reduce card count early.',
    },
    maxCardsByRatio: { wide: 4, square: 4, tall: 3 },
    heroPolicy: 'optional',
    heroHeadlineRule: 'Hero is optional and must not compete with the list.',
    ctaPolicy: 'optional',
    ctaRule: 'CTA can appear only after the list and must stay brief.',
    footerPolicy: 'none',
    footerRule: 'No footer in dense list layouts.',
    textReductionOrder: ['card_description', 'card_count', 'cta'],
    logoAvoidanceRule: 'Keep top/bottom list edges outside the logo zone.',
    defaultLayoutMode: 'stacked-cards',
    narrowAdaptation: 'stack',
  },
  contact_card: {
    id: 'contact_card',
    semanticPurpose: 'Trust-first contact layout where footer/contact information becomes a primary region.',
    visualPriority: ['headline', 'footer', 'cta'],
    sectionOrder: ['headline', 'cta', 'footer'],
    ratioAdaptation: {
      wide: 'Allow headline and CTA above a full-width contact bar.',
      square: 'Use a centered headline and a compact two-row contact area.',
      tall: 'Promote footer to a compact stacked contact bar and shorten every item.',
    },
    maxCardsByRatio: { wide: 0, square: 0, tall: 0 },
    heroPolicy: 'optional',
    heroHeadlineRule: 'If hero exists, it must support the contact offer and stay smaller than headline.',
    ctaPolicy: 'optional',
    ctaRule: 'CTA should sit above the contact bar and never merge into footer styling.',
    footerPolicy: 'contact_bar',
    footerRule: 'Footer is primary; shorten contact fields before touching headline.',
    textReductionOrder: ['footer_item_length', 'footer_item_count', 'cta'],
    logoAvoidanceRule: 'Bottom-center logo requires extra clearance above the contact bar.',
    defaultLayoutMode: 'footer-contact',
    narrowAdaptation: 'compact',
  },
  education_infographic: {
    id: 'education_infographic',
    semanticPurpose: 'Dense educational canvas with numbered cards, summary ribbon, CTA, and compact contact context.',
    visualPriority: ['banner', 'cards', 'summaryRibbon', 'cta', 'footer'],
    sectionOrder: ['banner', 'cards', 'summaryRibbon', 'cta', 'footer'],
    ratioAdaptation: {
      wide: 'Use a structured educational board with roomy card spacing and an anchored summary ribbon.',
      square: 'Keep 3-4 numbered cards with a short ribbon and compact CTA.',
      tall: 'Limit cards, shorten ribbon, and use a compact footer only.',
    },
    maxCardsByRatio: { wide: 4, square: 3, tall: 3 },
    heroPolicy: 'optional',
    heroHeadlineRule: 'Hero should only appear if it is a short stat; otherwise cards remain primary.',
    ctaPolicy: 'required',
    ctaRule: 'CTA must remain compact and separated from footer with safe padding.',
    footerPolicy: 'contact_bar',
    footerRule: 'Footer should stay concise and never overwhelm educational cards.',
    textReductionOrder: ['card_description', 'summary_ribbon', 'footer_item_length', 'card_count'],
    logoAvoidanceRule: 'Keep ribbon and footer away from the logo zone, especially bottom-center.',
    defaultLayoutMode: 'stacked-cards',
    narrowAdaptation: 'reduce_cards',
  },
  comparison_card: {
    id: 'comparison_card',
    semanticPurpose: 'A/B or before/after comparison with clear contrast between two states.',
    visualPriority: ['banner', 'cards', 'cta'],
    sectionOrder: ['banner', 'cards', 'cta'],
    ratioAdaptation: {
      wide: 'Use a true split comparison with two balanced columns.',
      square: 'Use stacked comparison cards with equal visual weight.',
      tall: 'Switch to compact vertical comparison and remove long descriptions first.',
    },
    maxCardsByRatio: { wide: 2, square: 2, tall: 2 },
    heroPolicy: 'none',
    heroHeadlineRule: 'Do not add hero blocks in comparison layouts.',
    ctaPolicy: 'required',
    ctaRule: 'CTA should be secondary to the comparison itself and stay short.',
    footerPolicy: 'none',
    footerRule: 'Avoid footer unless contact is mission-critical.',
    textReductionOrder: ['card_description', 'footer', 'cta'],
    logoAvoidanceRule: 'Do not let comparison columns or CTA enter the logo zone.',
    defaultLayoutMode: 'split-editorial',
    narrowAdaptation: 'stack',
  },
  timeline_steps: {
    id: 'timeline_steps',
    semanticPurpose: 'Step-by-step process layout optimized for sequential scanning.',
    visualPriority: ['banner', 'cards', 'cta'],
    sectionOrder: ['banner', 'cards', 'cta'],
    ratioAdaptation: {
      wide: 'Allow breathing room between numbered steps while preserving left-to-right or top-down flow.',
      square: 'Use a balanced vertical stack of numbered steps.',
      tall: 'Compact the timeline, reduce to fewer steps, and shorten labels.',
    },
    maxCardsByRatio: { wide: 4, square: 4, tall: 3 },
    heroPolicy: 'none',
    heroHeadlineRule: 'Do not compete with the steps using a large hero block.',
    ctaPolicy: 'required',
    ctaRule: 'CTA belongs after the sequence, never between steps.',
    footerPolicy: 'none',
    footerRule: 'Footer only when there is space after CTA.',
    textReductionOrder: ['card_description', 'card_count', 'cta'],
    logoAvoidanceRule: 'Keep the step spine and CTA clear of the logo area.',
    defaultLayoutMode: 'stacked-cards',
    narrowAdaptation: 'reduce_cards',
  },
  stat_spotlight: {
    id: 'stat_spotlight',
    semanticPurpose: 'Stat-led composition with one unforgettable number and a single supporting line.',
    visualPriority: ['banner', 'heroText', 'headline'],
    sectionOrder: ['banner', 'heroText', 'headline', 'footer'],
    ratioAdaptation: {
      wide: 'Use an oversized stat with supportive headline aligned nearby.',
      square: 'Center the stat and keep the headline short beneath it.',
      tall: 'Maximize stat dominance and reduce headline to one concise supporting line.',
    },
    maxCardsByRatio: { wide: 0, square: 0, tall: 0 },
    heroPolicy: 'required',
    heroHeadlineRule: 'Hero numeric stays primary; headline may not exceed support role.',
    ctaPolicy: 'optional',
    ctaRule: 'CTA should be inline only, never a large button in stat-first layouts.',
    footerPolicy: 'compact',
    footerRule: 'If footer exists, keep it tiny and informational.',
    textReductionOrder: ['footer', 'headline'],
    logoAvoidanceRule: 'Preserve open space around the stat and logo zone.',
    defaultLayoutMode: 'stat-focus',
    narrowAdaptation: 'compact',
  },
  testimonial_card: {
    id: 'testimonial_card',
    semanticPurpose: 'Trust-building review or quote-led composition with restrained CTA.',
    visualPriority: ['heroText', 'headline', 'cta'],
    sectionOrder: ['heroText', 'headline', 'cta'],
    ratioAdaptation: {
      wide: 'Let the quote breathe with trust accents and a restrained CTA.',
      square: 'Use centered quote-plus-headline with short supporting CTA.',
      tall: 'Quote first, headline second, CTA tiny and separated from the bottom edge.',
    },
    maxCardsByRatio: { wide: 0, square: 0, tall: 0 },
    heroPolicy: 'required',
    heroHeadlineRule: 'Hero quote or rating stays dominant; headline supports credibility.',
    ctaPolicy: 'optional',
    ctaRule: 'CTA must stay gentle and trust-oriented, not sales-heavy.',
    footerPolicy: 'none',
    footerRule: 'Avoid footer unless contact detail is minimal.',
    textReductionOrder: ['cta', 'headline'],
    logoAvoidanceRule: 'Quote block must not touch the logo clear zone.',
    defaultLayoutMode: 'hero-led',
    narrowAdaptation: 'compact',
  },
  product_spotlight: {
    id: 'product_spotlight',
    semanticPurpose: 'Feature-driven product highlight with benefits and strong CTA.',
    visualPriority: ['banner', 'headline', 'cards', 'cta'],
    sectionOrder: ['banner', 'headline', 'cards', 'cta', 'footer'],
    ratioAdaptation: {
      wide: 'Keep product focus strong and benefits aligned horizontally or in a disciplined row.',
      square: 'Headline first, then a compact benefit stack and CTA.',
      tall: 'Reduce benefits count and let CTA sit above any footer or contact area.',
    },
    maxCardsByRatio: { wide: 3, square: 3, tall: 2 },
    heroPolicy: 'optional',
    heroHeadlineRule: 'Hero only if it is a short product claim or stat; otherwise headline stays primary.',
    ctaPolicy: 'required',
    ctaRule: 'CTA may be button-like on wide canvases, compact inline on narrow ones.',
    footerPolicy: 'compact',
    footerRule: 'Footer is allowed only as short trust/contact reinforcement.',
    textReductionOrder: ['card_description', 'footer', 'card_count'],
    logoAvoidanceRule: 'Do not place benefit chips or CTA inside the logo keep-clear region.',
    defaultLayoutMode: 'hero-led',
    narrowAdaptation: 'stack',
  },
  editorial_cover: {
    id: 'editorial_cover',
    semanticPurpose: 'Minimal editorial cover with refined hierarchy and restrained text density.',
    visualPriority: ['headline'],
    sectionOrder: ['headline', 'banner'],
    ratioAdaptation: {
      wide: 'Use editorial asymmetry with a bold but minimal headline lockup.',
      square: 'Center or corner-anchor one headline block with generous negative space.',
      tall: 'Keep only the strongest headline and optional tiny eyebrow text.',
    },
    maxCardsByRatio: { wide: 0, square: 0, tall: 0 },
    heroPolicy: 'optional',
    heroHeadlineRule: 'If hero exists, it must behave like a small editorial kicker, not a second headline.',
    ctaPolicy: 'none',
    ctaRule: 'No CTA in editorial mode.',
    footerPolicy: 'none',
    footerRule: 'No footer in editorial mode.',
    textReductionOrder: ['banner'],
    logoAvoidanceRule: 'Logo zone should feel intentionally empty and premium.',
    defaultLayoutMode: 'hero-led',
    narrowAdaptation: 'compact',
  },
  problem_solution: {
    id: 'problem_solution',
    semanticPurpose: 'Structure a pain point and the resolution into a persuasive, readable transformation.',
    visualPriority: ['headline', 'cards', 'cta'],
    sectionOrder: ['headline', 'cards', 'cta', 'footer'],
    ratioAdaptation: {
      wide: 'A split editorial layout can separate problem and solution clearly.',
      square: 'Use a stacked before/after problem-to-solution rhythm.',
      tall: 'Compact the cards into a short vertical diagnosis-to-action flow.',
    },
    maxCardsByRatio: { wide: 3, square: 3, tall: 2 },
    heroPolicy: 'optional',
    heroHeadlineRule: 'Use hero only if it is a short problem label or result claim.',
    ctaPolicy: 'required',
    ctaRule: 'CTA should resolve the problem clearly and stay visually distinct from cards.',
    footerPolicy: 'compact',
    footerRule: 'Footer must stay subordinate to the CTA.',
    textReductionOrder: ['card_description', 'footer', 'card_count'],
    logoAvoidanceRule: 'Problem/solution cards and CTA must route around the logo zone.',
    defaultLayoutMode: 'split-editorial',
    narrowAdaptation: 'stack',
  },
  checklist_card: {
    id: 'checklist_card',
    semanticPurpose: 'Quick-scan checklist with high save value and clean sequential reading.',
    visualPriority: ['banner', 'cards', 'cta'],
    sectionOrder: ['banner', 'cards', 'cta'],
    ratioAdaptation: {
      wide: 'Use a disciplined grid or tidy column with obvious checklist markers.',
      square: 'Prefer a compact vertical checklist with even spacing.',
      tall: 'Aggressively reduce item count and keep CTA compact and separate.',
    },
    maxCardsByRatio: { wide: 4, square: 4, tall: 3 },
    heroPolicy: 'none',
    heroHeadlineRule: 'Checklist layouts should not introduce a competing hero block.',
    ctaPolicy: 'required',
    ctaRule: 'CTA should feel like a save/share reminder, not a giant button.',
    footerPolicy: 'none',
    footerRule: 'Avoid footer in checklist mode unless absolutely necessary.',
    textReductionOrder: ['card_description', 'card_count', 'cta'],
    logoAvoidanceRule: 'Checklist spine and CTA must stay outside the logo keep-clear area.',
    defaultLayoutMode: 'stacked-cards',
    narrowAdaptation: 'reduce_cards',
  },
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

export function getTemplateInstruction(templateId?: string | null): TemplateInstructionContract {
  return TEMPLATE_INSTRUCTION_LIBRARY[templateId || ''] || TEMPLATE_INSTRUCTION_LIBRARY.poster;
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

export function buildAiRenderPlan(input: BuildPlanInput): { renderSpec: RenderSpecSummary; layoutBehavior: LayoutBehaviorPlan; templateInstruction: TemplateInstructionContract } {
  const renderSpec = getRenderSpec(input.channel, input.aspectRatio);
  const overlay = input.overlay || {};
  const templateInstruction = getTemplateInstruction(input.suggestedLayout);
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

  const maxCards = templateInstruction.maxCardsByRatio[renderSpec.ratioVariant];
  const footerStrategy: FooterStrategy = footerLength === 0
    ? 'none'
    : renderSpec.ratioVariant === 'tall' || densityMode === 'dense'
      ? 'compact'
      : templateInstruction.footerPolicy;
  const ctaStrategy: CtaStrategy = !overlay.cta
    ? 'hidden'
    : renderSpec.ratioVariant === 'wide' && densityMode !== 'dense' && templateInstruction.ctaPolicy === 'required'
      ? 'primary_button'
      : 'inline';
  const textStrategy: TextStrategy = input.suggestedLayout === 'stat_spotlight' || heroLength > headlineLength
    ? 'hero_first'
    : cardsCount >= 3
      ? 'card_first'
      : 'headline_first';

  const aiLayoutMode = renderSpec.ratioVariant === 'wide'
    ? templateInstruction.defaultLayoutMode
    : renderSpec.ratioVariant === 'square'
      ? (templateInstruction.defaultLayoutMode === 'split-editorial' ? 'stacked-cards' : templateInstruction.defaultLayoutMode)
      : templateInstruction.defaultLayoutMode === 'stat-focus'
        ? 'stat-focus'
        : templateInstruction.defaultLayoutMode === 'footer-contact'
          ? 'footer-contact'
          : 'stacked-cards';

  const stackPreference: LayoutBehaviorPlan['stackPreference'] = renderSpec.ratioVariant === 'wide'
    ? 'split'
    : templateInstruction.narrowAdaptation === 'compact'
      ? 'compact'
      : 'stack';

  const riskyBottomCenter = logoPosition === 'bottom-center' && !!overlay.cta && footerLength > 0;
  const tallDense = renderSpec.ratioVariant === 'tall' && (densityMode === 'dense' || footerLength > renderSpec.footerBudget);
  const comparisonDense = input.suggestedLayout === 'comparison_card' && hasCardDescriptions && renderSpec.ratioVariant !== 'wide';
  const overCardBudget = cardsCount > maxCards;
  const recommendedOverlayMode: RecommendedOverlayMode = riskyBottomCenter || tallDense || comparisonDense || overCardBudget
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
  if (overCardBudget) confidenceScore -= 0.12;

  return {
    renderSpec,
    templateInstruction,
    layoutBehavior: {
      densityMode,
      textStrategy,
      footerStrategy,
      ctaStrategy,
      logoProtection,
      aiLayoutMode,
      recommendedOverlayMode,
      fallbackHint,
      confidenceScore: clamp(Number(confidenceScore.toFixed(2)), 0.35, 0.95),
      maxCards,
      stackPreference,
      textReductionOrder: templateInstruction.textReductionOrder,
      templateInstructionId: templateInstruction.id,
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
  ].join('
');
}

export function formatTemplateInstructionBrief(templateInstruction: TemplateInstructionContract, ratioVariant: RatioRenderVariant): string {
  return [
    `TEMPLATE INSTRUCTION: ${templateInstruction.id}`,
    `- Purpose: ${templateInstruction.semanticPurpose}`,
    `- Visual priority: ${templateInstruction.visualPriority.join(' → ')}`,
    `- Section order: ${templateInstruction.sectionOrder.join(' → ')}`,
    `- Ratio adaptation: ${templateInstruction.ratioAdaptation[ratioVariant]}`,
    `- Max cards for this ratio: ${templateInstruction.maxCardsByRatio[ratioVariant]}`,
    `- Hero/headline rule: ${templateInstruction.heroHeadlineRule}`,
    `- CTA rule: ${templateInstruction.ctaRule}`,
    `- Footer rule: ${templateInstruction.footerRule}`,
    `- Logo avoidance: ${templateInstruction.logoAvoidanceRule}`,
  ].join('
');
}

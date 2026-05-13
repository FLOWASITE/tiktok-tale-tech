// ============================================
// CAROUSEL PRESET DNA
// Định nghĩa màu sắc + typography + reference editorial cho từng visual preset.
// Một nơi duy nhất — dùng bởi prompt builder, creative direction, và UI swatch.
// ============================================

export type VisualPresetKey =
  | 'minimalist'
  | 'flat_design'
  | 'gradient'
  | 'geometric'
  | 'illustration'
  | 'product_only';

export interface PresetDNA {
  key: VisualPresetKey;
  /** Tên hiển thị editorial (ngắn, để inject vào prompt) */
  signature: string;
  /** Tonal palette cụ thể — 3-5 hex codes với role */
  palette: {
    role: string;          // 'paper' / 'ink' / 'accent' / ...
    hex: string;
    coverage: string;      // '60%' / '5%'
  }[];
  /** Display font character (cho headline) */
  displayFont: string;
  /** Body font character */
  bodyFont: string;
  /** 1-2 dòng composition rule */
  composition: string;
  /** Editorial reference (1 dòng "in the language of …") */
  reference: string;
  /** Negative — cấm tuyệt đối */
  forbidden: string[];
}

export const PRESET_DNA: Record<VisualPresetKey, PresetDNA> = {
  minimalist: {
    key: 'minimalist',
    signature: 'Editorial Minimalism (Aesop / Kinfolk school)',
    palette: [
      { role: 'paper background', hex: '#F8F6F2', coverage: '55-65%' },
      { role: 'ink (text + key forms)', hex: '#1A1A1A', coverage: '20-25%' },
      { role: 'warm grey (secondary text + dividers)', hex: '#8A8A87', coverage: '8-12%' },
      { role: 'brand accent (single moment)', hex: 'BRAND_PRIMARY', coverage: '≤5%' },
    ],
    displayFont: 'Fraunces or GT Sectra — high-contrast modern serif with optical sizing, oldstyle figures',
    bodyFont: 'Söhne or GT America — neo-grotesk with refined letter spacing (NOT Inter UI, NOT Helvetica)',
    composition: 'Swiss 12-column grid, hairline 0.5px dividers, baseline grid 8px, hanging upper-left third, generous negative space.',
    reference: 'In the editorial language of Aesop product pages, Kinfolk magazine spreads, Apple Notes 2024, and Muji catalogues.',
    forbidden: [
      'Inter UI', 'Helvetica', 'Arial', 'PowerPoint aesthetic',
      'centered body text', 'gradient backgrounds', 'tech UI mockup',
      'drop shadows on text', 'pure white #FFFFFF background',
      'neon', 'saturated jewel tones',
    ],
  },

  flat_design: {
    key: 'flat_design',
    signature: 'Bold Editorial Flat (Stripe / Linear / Vercel school)',
    palette: [
      { role: 'primary block', hex: 'BRAND_PRIMARY', coverage: '40-50%' },
      { role: 'contrast block', hex: '#0A0A0A', coverage: '25-35%' },
      { role: 'paper accent', hex: '#FAFAF7', coverage: '15-20%' },
      { role: 'saturated highlight', hex: '#FF5722 or brand accent', coverage: '≤8%' },
    ],
    displayFont: 'Archivo Black or Druk Wide — condensed bold geometric, tight tracking',
    bodyFont: 'IBM Plex Sans or Söhne Breit — rational sans, tabular numerals',
    composition: 'Hard-edge color blocks, no gradients, geometric shapes intersecting at 90°/45°, flat overlapping planes.',
    reference: 'In the visual language of Stripe marketing pages, Linear changelog graphics, Vercel landing posters.',
    forbidden: [
      'pastel colors', 'soft shadows', '3D depth', 'gradient meshes',
      'photorealism', 'Inter font', 'rounded squishy shapes',
    ],
  },

  gradient: {
    key: 'gradient',
    signature: 'Aurora Mesh (Linear / Arc browser / Rauno school)',
    palette: [
      { role: 'gradient stop 1 (brand)', hex: 'BRAND_PRIMARY', coverage: '30%' },
      { role: 'gradient stop 2 (analogous)', hex: 'analogous +30° hue', coverage: '30%' },
      { role: 'gradient stop 3 (deep)', hex: '#0F0F23', coverage: '25%' },
      { role: 'glass / bloom highlight', hex: '#FFFFFF @ 8% alpha', coverage: '≤10%' },
    ],
    displayFont: 'Migra or Editorial New — contemporary high-contrast serif, slim italic accent',
    bodyFont: 'Inter Display or Geist — geometric grotesk optimised for headlines, NOT Inter UI',
    composition: 'Mesh gradient background with 3-4 anchor stops, glassmorphism cards (16px blur, 1px white border @ 20%), centered hero subject.',
    reference: 'In the visual language of Linear changelog hero, Arc browser launch graphics, Rauno.me case studies.',
    forbidden: [
      'rainbow gradient', 'cyan-magenta cliché', 'circuit board background',
      'matrix binary text', 'holographic UI panels', 'tech mockup screens',
    ],
  },

  geometric: {
    key: 'geometric',
    signature: 'Editorial Corporate (Pentagram / NYT Magazine school)',
    palette: [
      { role: 'navy authority', hex: '#0B1F3A', coverage: '45-55%' },
      { role: 'ivory paper', hex: '#F4EFE6', coverage: '30-40%' },
      { role: 'gold accent', hex: '#C9A961', coverage: '5-10%' },
      { role: 'brand accent (rare)', hex: 'BRAND_PRIMARY', coverage: '≤5%' },
    ],
    displayFont: 'Domaine Display or Canela — refined transitional serif with sharp brackets',
    bodyFont: 'Söhne or Söhne Breit — serif body acceptable too (Tiempos Text)',
    composition: 'Strict 8-column grid, classical hierarchy, justified text optional, hairline gold rule under headlines, generous side margins.',
    reference: 'In the visual language of Pentagram identity work, NYT Magazine cover spreads, Aesthete journals.',
    forbidden: [
      'casual fonts', 'rounded shapes', 'pastel palette', 'illustration style',
      'organic blobs', 'hand-drawn elements', 'neon accents',
    ],
  },

  illustration: {
    key: 'illustration',
    signature: 'Warm Editorial Illustration (Notion / Headspace / Recoleta school)',
    palette: [
      { role: 'cream paper', hex: '#FDF6EC', coverage: '40-50%' },
      { role: 'terracotta warmth', hex: '#E07A5F', coverage: '20-25%' },
      { role: 'sage calm', hex: '#83A275', coverage: '15-20%' },
      { role: 'ink linework', hex: '#2D2A26', coverage: '10-15%' },
      { role: 'brand accent', hex: 'BRAND_PRIMARY', coverage: '≤5%' },
    ],
    displayFont: 'Recoleta or Tiempos Headline — friendly modern serif with rounded terminals',
    bodyFont: 'Outfit or Nunito — humanist rounded sans, warm but legible',
    composition: 'Hand-drawn linework with controlled imperfection, organic shapes anchored to invisible grid, cream paper texture, soft contact shadows.',
    reference: 'In the visual language of Notion empty-state illustrations, Headspace app art, Wonderbly storybook spreads.',
    forbidden: [
      'photorealism', '3D render', 'corporate stiffness', 'flat vector cliché',
      'Memphis pattern', 'cartoon child-style', 'thick black outlines like comic',
    ],
  },

  product_only: {
    key: 'product_only',
    signature: 'Studio Product (Aesop / Apple Store school)',
    palette: [
      { role: 'studio paper backdrop', hex: '#F2EFE9', coverage: '60-70%' },
      { role: 'contact shadow', hex: '#1A1A1A @ 20% alpha', coverage: '5-10%' },
      { role: 'product-native colors', hex: 'PRODUCT_NATIVE', coverage: '20-25%' },
      { role: 'brand accent on label only', hex: 'BRAND_PRIMARY', coverage: '≤3%' },
    ],
    displayFont: 'Tiempos Headline or Editorial New — elegant editorial serif',
    bodyFont: 'Söhne or GT America — neo-grotesk for caption sizes',
    composition: 'Single product hero, off-center on rule-of-thirds, soft directional studio lighting from upper-left, soft contact shadow, paper-textured backdrop, no props that compete.',
    reference: 'In the visual language of Aesop product pages, Apple Store hero shots, Byredo lookbook stills.',
    forbidden: [
      'people', 'hands holding product', 'lifestyle scenes',
      'busy backgrounds', 'multiple products', 'stylized illustration',
      'gradient backdrop', 'neon lighting', 'colored gels',
    ],
  },
};

/** Lấy DNA an toàn — fallback minimalist nếu key không hợp lệ. */
export function getPresetDNA(key?: string | null): PresetDNA {
  const k = (key || '').toLowerCase() as VisualPresetKey;
  return PRESET_DNA[k] || PRESET_DNA.minimalist;
}

/**
 * Build directive block để inject vào prompt image generation.
 * Thay token BRAND_PRIMARY bằng màu thật của brand (nếu có).
 */
export function buildPresetDirective(
  presetKey: string | null | undefined,
  brandPrimary?: string | null,
): string {
  const dna = getPresetDNA(presetKey);
  const brand = (brandPrimary || '').trim();

  const paletteLines = dna.palette
    .map((p) => {
      const hex = p.hex === 'BRAND_PRIMARY'
        ? (brand || '#3B5BDB')
        : p.hex;
      return `  • ${p.role}: ${hex} (~${p.coverage})`;
    })
    .join('\n');

  return `
PRESET DNA — ${dna.signature}

Palette (mandatory ratios — do not invent other colors):
${paletteLines}

Typography character (render text faithful to these archetypes — NOT generic web fonts):
  • Display: ${dna.displayFont}
  • Body: ${dna.bodyFont}

Composition: ${dna.composition}

Editorial reference: ${dna.reference}

Forbidden in this preset (hard rules):
  ${dna.forbidden.map((f) => `• ${f}`).join('\n  ')}
`.trim();
}

/**
 * Lấy nhanh display/body font cho creative-direction archetype override.
 */
export function getPresetFonts(presetKey?: string | null): { display: string; body: string } {
  const dna = getPresetDNA(presetKey);
  return { display: dna.displayFont, body: dna.bodyFont };
}

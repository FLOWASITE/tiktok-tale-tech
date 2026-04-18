// ============================================
// Color Utilities — OKLCH-based perceptual lightening
// ============================================
// RGB linear interpolation washes saturated brand colors (purple, magenta,
// cyan) to gray when lightened. OKLCH is perceptually uniform: lightening
// preserves hue, gives natural pastels for pastel-leaning brand work
// (F&B, beauty, aesthetic verticals).
//
// We avoid pulling culori into edge runtime cold-start cost by inlining
// minimal sRGB <-> Oklab conversions (~120 LOC). Math from:
//   https://bottosson.github.io/posts/oklab/
// ============================================

function srgbToLinear(c: number): number {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(v * 255)));
}

interface Oklch { L: number; C: number; h: number; }

function hexToOklch(hex: string): Oklch | null {
  const clean = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  const num = parseInt(clean, 16);
  const r = srgbToLinear((num >> 16) & 0xff);
  const g = srgbToLinear((num >> 8) & 0xff);
  const b = srgbToLinear(num & 0xff);

  // Linear sRGB -> LMS
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  // LMS -> Oklab
  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;

  // Oklab -> Oklch
  const C = Math.sqrt(a * a + bb * bb);
  let h = Math.atan2(bb, a) * 180 / Math.PI;
  if (h < 0) h += 360;

  return { L, C, h };
}

function oklchToHex({ L, C, h }: Oklch): string {
  const hr = h * Math.PI / 180;
  const a = C * Math.cos(hr);
  const bb = C * Math.sin(hr);

  // Oklab -> LMS
  const l_ = L + 0.3963377774 * a + 0.2158037573 * bb;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * bb;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * bb;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  // LMS -> linear sRGB
  const r =  4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const b = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  const R = linearToSrgb(r);
  const G = linearToSrgb(g);
  const B = linearToSrgb(b);

  return `#${((R << 16) | (G << 8) | B).toString(16).padStart(6, '0')}`;
}

/**
 * Perceptually lighten a hex color by a percentage (0-100).
 *
 * - amount=0 → original color
 * - amount=100 → very near white, hue preserved
 * - chroma is gently reduced as we lift L (avoids neon pastels)
 *
 * Falls back to original hex on parse failure.
 */
export function lightenHex(hex: string, percent: number): string {
  const ok = hexToOklch(hex);
  if (!ok) return hex;
  const amount = Math.max(0, Math.min(100, percent)) / 100;
  const newL = ok.L + (1 - ok.L) * amount;
  // Reduce chroma slightly as we lighten (natural pastel behavior).
  // At amount=1 chroma drops by 30% — stops the "neon haze" failure mode.
  const newC = ok.C * (1 - amount * 0.3);
  return oklchToHex({ L: newL, C: newC, h: ok.h });
}

/**
 * Perceptually darken a hex color by a percentage (0-100).
 */
export function darkenHex(hex: string, percent: number): string {
  const ok = hexToOklch(hex);
  if (!ok) return hex;
  const amount = Math.max(0, Math.min(100, percent)) / 100;
  const newL = ok.L * (1 - amount);
  return oklchToHex({ L: newL, C: ok.C, h: ok.h });
}

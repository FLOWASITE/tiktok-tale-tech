/**
 * Allowlist of image models that consistently render legible, accurate text
 * baked into the image. When such a model is used, we skip the canvas overlay
 * pipeline (overlay-text-canvas) unless backend explicitly requests Satori
 * fallback, to avoid double-rendering text on top of already-good output.
 *
 * Triggered by user complaint: "Ảnh vẫn còn hiện tượng bị overlay-text-canvas
 * ko cần thiết vì AI đã render rất tốt text".
 */
const TRUSTED_TEXT_BAKING_PATTERNS = [
  /gemini-3.*image/i,           // gemini-3-pro-image-preview, gemini-3.1-flash-image-preview
  /gemini-3-flash-image/i,
  /imagen/i,                     // Google Imagen
  /seedream/i,                   // ByteDance Seedream
  /poyo/i,                       // PoYo (high-quality text rendering)
  /flux-kontext/i,               // KIE flux-kontext (text-aware)
  /gpt-image/i,                  // OpenAI gpt-image-1
];

/**
 * Returns true when the model used has trusted text-baking quality.
 * Strips "(fallback from ...)" suffix before matching.
 */
export function isTrustedTextBakingModel(modelUsed?: string | null): boolean {
  if (!modelUsed) return false;
  const cleaned = modelUsed.replace(/\s*\(fallback from .+?\)$/, '').trim();
  return TRUSTED_TEXT_BAKING_PATTERNS.some((re) => re.test(cleaned));
}

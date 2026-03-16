import type { PromptMode } from '@/types/simpleImageGenerator';

export const NEGATIVE_PROMPT_DEFAULTS: Record<PromptMode, string> = {
  full: 'watermark, blurry, low quality, distorted face, extra fingers, deformed hands, ugly, amateur',
  brand_only: 'watermark, blurry, low quality, distorted face, extra fingers, deformed hands, ugly, text artifacts',
  raw: 'watermark, blurry, low quality, distorted face, extra fingers, deformed hands',
};

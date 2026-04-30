// ============================================
// SOCIAL FORMAT PRESETS
// Maps platform × format → duration + aspect ratio + tone hint
// Used by Video Script creation flow (purpose='ai_video')
// ============================================

import type { Duration } from './script';

export type SocialPlatform =
  | 'tiktok'
  | 'reels'
  | 'shorts'
  | 'facebook'
  | 'linkedin'
  | 'youtube';

export type SocialFormatLength = 'short' | 'standard' | 'long';

export type AspectRatio = '9:16' | '16:9' | '1:1';

export interface SocialFormatPreset {
  id: string;
  platform: SocialPlatform;
  format: SocialFormatLength;
  label: string;
  shortLabel: string;
  duration: Duration;
  aspectRatio: AspectRatio;
  toneHint: string;
  /** Channel key passed to generate-video-prompt edge function */
  channelKey: 'tiktok' | 'reels' | 'shorts' | 'facebook' | 'youtube' | 'generic';
  description: string;
}

export const SOCIAL_PLATFORM_LABELS: Record<SocialPlatform, { label: string; tagline: string }> = {
  tiktok: { label: 'TikTok', tagline: 'Vertical 9:16 · Hook 1.5s đầu' },
  reels: { label: 'Reels (IG)', tagline: 'Vertical 9:16 · Cinematic polish' },
  shorts: { label: 'YT Shorts', tagline: 'Vertical 9:16 · Punchy' },
  facebook: { label: 'Facebook', tagline: '1:1 hoặc 9:16 · Caption-friendly' },
  linkedin: { label: 'LinkedIn', tagline: '1:1 · Professional' },
  youtube: { label: 'YouTube Long', tagline: '16:9 · High production' },
};

export const SOCIAL_FORMAT_PRESETS: SocialFormatPreset[] = [
  // TikTok
  { id: 'tiktok-short', platform: 'tiktok', format: 'short', label: 'TikTok Short', shortLabel: '15s', duration: 15, aspectRatio: '9:16', toneHint: 'punchy, hook-1.5s', channelKey: 'tiktok', description: 'Hook nhanh, fast cut, trending text' },
  { id: 'tiktok-standard', platform: 'tiktok', format: 'standard', label: 'TikTok Standard', shortLabel: '30s', duration: 30, aspectRatio: '9:16', toneHint: 'engaging, mid-tempo', channelKey: 'tiktok', description: 'Tutorial ngắn, story arc nhỏ' },
  { id: 'tiktok-long', platform: 'tiktok', format: 'long', label: 'TikTok Long', shortLabel: '60s', duration: 60, aspectRatio: '9:16', toneHint: 'detailed, narrative', channelKey: 'tiktok', description: 'Storytelling đầy đủ' },

  // Reels
  { id: 'reels-short', platform: 'reels', format: 'short', label: 'Reels Short', shortLabel: '15s', duration: 15, aspectRatio: '9:16', toneHint: 'aesthetic, smooth', channelKey: 'reels', description: 'Aesthetic loop, smooth glide' },
  { id: 'reels-standard', platform: 'reels', format: 'standard', label: 'Reels Standard', shortLabel: '30s', duration: 30, aspectRatio: '9:16', toneHint: 'cinematic, polished', channelKey: 'reels', description: 'Cinematic polish, color grade' },
  { id: 'reels-long', platform: 'reels', format: 'long', label: 'Reels Long', shortLabel: '60s', duration: 60, aspectRatio: '9:16', toneHint: 'narrative, brand-led', channelKey: 'reels', description: 'Brand storytelling đầy đủ' },

  // Shorts
  { id: 'shorts-short', platform: 'shorts', format: 'short', label: 'Shorts Short', shortLabel: '15s', duration: 15, aspectRatio: '9:16', toneHint: 'punchy hook', channelKey: 'shorts', description: 'Punchy, clean composition' },
  { id: 'shorts-standard', platform: 'shorts', format: 'standard', label: 'Shorts Standard', shortLabel: '30s', duration: 30, aspectRatio: '9:16', toneHint: 'tutorial pace', channelKey: 'shorts', description: 'Quick tutorial' },
  { id: 'shorts-long', platform: 'shorts', format: 'long', label: 'Shorts Long', shortLabel: '60s', duration: 60, aspectRatio: '9:16', toneHint: 'mini-story', channelKey: 'shorts', description: 'Mini-story dài' },

  // Facebook
  { id: 'facebook-short', platform: 'facebook', format: 'short', label: 'FB Short', shortLabel: '30s', duration: 30, aspectRatio: '1:1', toneHint: 'attention-first-frame', channelKey: 'facebook', description: 'Hook frame đầu tiên' },
  { id: 'facebook-standard', platform: 'facebook', format: 'standard', label: 'FB Standard', shortLabel: '60s', duration: 60, aspectRatio: '1:1', toneHint: 'square, captions-first', channelKey: 'facebook', description: 'Square layout, captions-first' },
  { id: 'facebook-long', platform: 'facebook', format: 'long', label: 'FB Long', shortLabel: '90s', duration: 90, aspectRatio: '1:1', toneHint: 'storytelling', channelKey: 'facebook', description: 'Storytelling dài hơn' },

  // LinkedIn
  { id: 'linkedin-short', platform: 'linkedin', format: 'short', label: 'LinkedIn Short', shortLabel: '30s', duration: 30, aspectRatio: '1:1', toneHint: 'professional, insight', channelKey: 'generic', description: 'Insight ngắn, professional' },
  { id: 'linkedin-standard', platform: 'linkedin', format: 'standard', label: 'LinkedIn Standard', shortLabel: '60s', duration: 60, aspectRatio: '1:1', toneHint: 'thought-leadership', channelKey: 'generic', description: 'Thought leadership' },
  { id: 'linkedin-long', platform: 'linkedin', format: 'long', label: 'LinkedIn Long', shortLabel: '90s', duration: 90, aspectRatio: '1:1', toneHint: 'case-study, data', channelKey: 'generic', description: 'Case study + data' },

  // YouTube Long
  { id: 'youtube-short', platform: 'youtube', format: 'short', label: 'YT Standard', shortLabel: '60s', duration: 60, aspectRatio: '16:9', toneHint: 'cinematic intro', channelKey: 'youtube', description: 'Cinematic intro' },
  { id: 'youtube-standard', platform: 'youtube', format: 'standard', label: 'YT Mid', shortLabel: '3 phút', duration: 180, aspectRatio: '16:9', toneHint: 'wide shots, slow', channelKey: 'youtube', description: 'Wide shots, deep dive' },
  { id: 'youtube-long', platform: 'youtube', format: 'long', label: 'YT Long', shortLabel: '10 phút', duration: 600, aspectRatio: '16:9', toneHint: 'high production, multi-segment', channelKey: 'youtube', description: 'Long-form, multi segment' },
];

export function getPresetById(id: string | undefined): SocialFormatPreset | undefined {
  if (!id) return undefined;
  return SOCIAL_FORMAT_PRESETS.find((p) => p.id === id);
}

export function getPresetByPlatformFormat(
  platform: SocialPlatform,
  format: SocialFormatLength,
): SocialFormatPreset | undefined {
  return SOCIAL_FORMAT_PRESETS.find((p) => p.platform === platform && p.format === format);
}

/** Best-effort match từ duration + aspect → preset gần nhất (cho backward compat) */
export function inferPreset(duration: number, aspectRatio?: string): SocialFormatPreset | undefined {
  return (
    SOCIAL_FORMAT_PRESETS.find((p) => p.duration === duration && p.aspectRatio === aspectRatio) ??
    SOCIAL_FORMAT_PRESETS.find((p) => p.duration === duration)
  );
}

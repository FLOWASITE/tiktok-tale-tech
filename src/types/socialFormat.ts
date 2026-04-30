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
  | 'pinterest'
  | 'threads'
  | 'facebook'
  | 'linkedin'
  | 'x'
  | 'youtube';

export type SocialFormatLength = 'short' | 'standard' | 'long';

export type AspectRatio = '9:16' | '16:9' | '1:1';

export type SocialGroup = 'short-form' | 'long-form';

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
  /** True if this is the platform's most-used format (default = standard) */
  recommended?: boolean;
}

export const SOCIAL_PLATFORM_LABELS: Record<SocialPlatform, { label: string; tagline: string }> = {
  tiktok:    { label: 'TikTok',     tagline: 'Vertical 9:16 · Hook 1.5s đầu' },
  reels:     { label: 'Reels (IG)', tagline: 'Vertical 9:16 · Cinematic polish' },
  shorts:    { label: 'YT Shorts',  tagline: 'Vertical 9:16 · Punchy' },
  pinterest: { label: 'Pinterest',  tagline: '9:16 · Visual discovery, beauty fit' },
  threads:   { label: 'Threads',    tagline: '9:16 · Conversation-first' },
  facebook:  { label: 'Facebook',   tagline: '1:1 hoặc 9:16 · Caption-friendly' },
  linkedin:  { label: 'LinkedIn',   tagline: '1:1 · Professional' },
  x:         { label: 'X (Twitter)', tagline: '1:1 · Punchy, text-overlay' },
  youtube:   { label: 'YouTube Long', tagline: '16:9 · High production' },
};

export const SOCIAL_PLATFORM_GROUP: Record<SocialPlatform, SocialGroup> = {
  tiktok: 'short-form',
  reels: 'short-form',
  shorts: 'short-form',
  pinterest: 'short-form',
  threads: 'short-form',
  facebook: 'long-form',
  linkedin: 'long-form',
  x: 'long-form',
  youtube: 'long-form',
};

export const SOCIAL_GROUP_LABELS: Record<SocialGroup, { label: string; description: string }> = {
  'short-form': { label: 'Short-form Video', description: 'Vertical 9:16 · Hook nhanh · ≤ 60s' },
  'long-form':  { label: 'Standard / Long-form', description: 'Square 1:1 hoặc 16:9 · Storytelling' },
};

export const SOCIAL_FORMAT_PRESETS: SocialFormatPreset[] = [
  // ===== Short-form =====
  // TikTok
  { id: 'tiktok-short',    platform: 'tiktok', format: 'short',    label: 'TikTok Short',    shortLabel: '15s', duration: 15, aspectRatio: '9:16', toneHint: 'punchy, hook-1.5s',  channelKey: 'tiktok', description: 'Hook nhanh, fast cut, trending text' },
  { id: 'tiktok-standard', platform: 'tiktok', format: 'standard', label: 'TikTok Standard', shortLabel: '30s', duration: 30, aspectRatio: '9:16', toneHint: 'engaging, mid-tempo', channelKey: 'tiktok', description: 'Tutorial ngắn, story arc nhỏ' },
  { id: 'tiktok-long',     platform: 'tiktok', format: 'long',     label: 'TikTok Long',     shortLabel: '60s', duration: 60, aspectRatio: '9:16', toneHint: 'detailed, narrative',channelKey: 'tiktok', description: 'Storytelling đầy đủ' },

  // Reels
  { id: 'reels-short',    platform: 'reels', format: 'short',    label: 'Reels Short',    shortLabel: '15s', duration: 15, aspectRatio: '9:16', toneHint: 'aesthetic, smooth',     channelKey: 'reels', description: 'Aesthetic loop, smooth glide' },
  { id: 'reels-standard', platform: 'reels', format: 'standard', label: 'Reels Standard', shortLabel: '30s', duration: 30, aspectRatio: '9:16', toneHint: 'cinematic, polished',   channelKey: 'reels', description: 'Cinematic polish, color grade' },
  { id: 'reels-long',     platform: 'reels', format: 'long',     label: 'Reels Long',     shortLabel: '60s', duration: 60, aspectRatio: '9:16', toneHint: 'narrative, brand-led',  channelKey: 'reels', description: 'Brand storytelling đầy đủ' },

  // Shorts
  { id: 'shorts-short',    platform: 'shorts', format: 'short',    label: 'Shorts Short',    shortLabel: '15s', duration: 15, aspectRatio: '9:16', toneHint: 'punchy hook',  channelKey: 'shorts', description: 'Punchy, clean composition' },
  { id: 'shorts-standard', platform: 'shorts', format: 'standard', label: 'Shorts Standard', shortLabel: '30s', duration: 30, aspectRatio: '9:16', toneHint: 'tutorial pace',channelKey: 'shorts', description: 'Quick tutorial' },
  { id: 'shorts-long',     platform: 'shorts', format: 'long',     label: 'Shorts Long',     shortLabel: '60s', duration: 60, aspectRatio: '9:16', toneHint: 'mini-story',   channelKey: 'shorts', description: 'Mini-story dài' },

  // Pinterest (Idea Pins / Video Pins) — ưu tiên beauty discovery
  { id: 'pinterest-short',    platform: 'pinterest', format: 'short',    label: 'Pinterest Short',    shortLabel: '15s', duration: 15, aspectRatio: '9:16', toneHint: 'visual hook, lifestyle',  channelKey: 'generic', description: 'Idea Pin nhanh, visual-first' },
  { id: 'pinterest-standard', platform: 'pinterest', format: 'standard', label: 'Pinterest Standard', shortLabel: '30s', duration: 30, aspectRatio: '9:16', toneHint: 'tutorial, before-after',  channelKey: 'generic', description: 'Tutorial / before-after, search-engine copy' },
  { id: 'pinterest-long',     platform: 'pinterest', format: 'long',     label: 'Pinterest Long',     shortLabel: '60s', duration: 60, aspectRatio: '9:16', toneHint: 'how-to, deep visual',     channelKey: 'generic', description: 'How-to dài, save-worthy' },

  // Threads (Meta) — conversation-first video
  { id: 'threads-short',    platform: 'threads', format: 'short',    label: 'Threads Short',    shortLabel: '15s', duration: 15, aspectRatio: '9:16', toneHint: 'conversational hook',  channelKey: 'generic', description: 'Hook đối thoại ngắn' },
  { id: 'threads-standard', platform: 'threads', format: 'standard', label: 'Threads Standard', shortLabel: '30s', duration: 30, aspectRatio: '9:16', toneHint: 'opinion, take',        channelKey: 'generic', description: 'Take / opinion ngắn' },
  { id: 'threads-long',     platform: 'threads', format: 'long',     label: 'Threads Long',     shortLabel: '60s', duration: 60, aspectRatio: '9:16', toneHint: 'thread storytelling',  channelKey: 'generic', description: 'Thread story 1 phút' },

  // ===== Long-form =====
  // Facebook
  { id: 'facebook-short',    platform: 'facebook', format: 'short',    label: 'FB Short',    shortLabel: '30s', duration: 30, aspectRatio: '1:1', toneHint: 'attention-first-frame', channelKey: 'facebook', description: 'Hook frame đầu tiên' },
  { id: 'facebook-standard', platform: 'facebook', format: 'standard', label: 'FB Standard', shortLabel: '60s', duration: 60, aspectRatio: '1:1', toneHint: 'square, captions-first',channelKey: 'facebook', description: 'Square layout, captions-first' },
  { id: 'facebook-long',     platform: 'facebook', format: 'long',     label: 'FB Long',     shortLabel: '90s', duration: 90, aspectRatio: '1:1', toneHint: 'storytelling',         channelKey: 'facebook', description: 'Storytelling dài hơn' },

  // LinkedIn
  { id: 'linkedin-short',    platform: 'linkedin', format: 'short',    label: 'LinkedIn Short',    shortLabel: '30s', duration: 30, aspectRatio: '1:1', toneHint: 'professional, insight', channelKey: 'generic', description: 'Insight ngắn, professional' },
  { id: 'linkedin-standard', platform: 'linkedin', format: 'standard', label: 'LinkedIn Standard', shortLabel: '60s', duration: 60, aspectRatio: '1:1', toneHint: 'thought-leadership',    channelKey: 'generic', description: 'Thought leadership' },
  { id: 'linkedin-long',     platform: 'linkedin', format: 'long',     label: 'LinkedIn Long',     shortLabel: '90s', duration: 90, aspectRatio: '1:1', toneHint: 'case-study, data',      channelKey: 'generic', description: 'Case study + data' },

  // X / Twitter
  { id: 'x-short',    platform: 'x', format: 'short',    label: 'X Short',    shortLabel: '30s',  duration: 30,  aspectRatio: '1:1', toneHint: 'punchy, text-overlay',  channelKey: 'generic', description: 'Punchy clip, text-overlay rõ' },
  { id: 'x-standard', platform: 'x', format: 'standard', label: 'X Standard', shortLabel: '60s',  duration: 60,  aspectRatio: '1:1', toneHint: 'opinion, hot-take',    channelKey: 'generic', description: 'Hot-take 1 phút' },
  { id: 'x-long',     platform: 'x', format: 'long',     label: 'X Long',     shortLabel: '2:20', duration: 140, aspectRatio: '1:1', toneHint: 'detailed thread video', channelKey: 'generic', description: 'Max free-tier 2:20, deep take' },

  // YouTube Long
  { id: 'youtube-short',    platform: 'youtube', format: 'short',    label: 'YT Standard', shortLabel: '60s',    duration: 60,  aspectRatio: '16:9', toneHint: 'cinematic intro',              channelKey: 'youtube', description: 'Cinematic intro' },
  { id: 'youtube-standard', platform: 'youtube', format: 'standard', label: 'YT Mid',      shortLabel: '3 phút', duration: 180, aspectRatio: '16:9', toneHint: 'wide shots, slow',             channelKey: 'youtube', description: 'Wide shots, deep dive' },
  { id: 'youtube-long',     platform: 'youtube', format: 'long',     label: 'YT Long',     shortLabel: '10 phút',duration: 600, aspectRatio: '16:9', toneHint: 'high production, multi-segment',channelKey: 'youtube', description: 'Long-form, multi segment' },
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

/** Trả về danh sách platform theo group, giữ thứ tự gốc */
export function getPlatformsByGroup(group: SocialGroup): SocialPlatform[] {
  return (Object.keys(SOCIAL_PLATFORM_GROUP) as SocialPlatform[]).filter(
    (p) => SOCIAL_PLATFORM_GROUP[p] === group,
  );
}

/** Default preset khi user vào step Social Format mà chưa chọn gì */
export const DEFAULT_PRESET_ID = 'tiktok-standard';

/** 3 preset nhanh hiển thị quick-pick chips ở đầu step */
export const QUICK_PICK_PRESET_IDS = ['tiktok-standard', 'reels-short', 'youtube-short'] as const;

export function getQuickPickPresets(): SocialFormatPreset[] {
  return QUICK_PICK_PRESET_IDS
    .map((id) => SOCIAL_FORMAT_PRESETS.find((p) => p.id === id))
    .filter((p): p is SocialFormatPreset => Boolean(p));
}

/** Một preset là "recommended" nếu format='standard' (per platform default) */
export function isRecommendedPreset(preset: SocialFormatPreset): boolean {
  return preset.recommended === true || preset.format === 'standard';
}

/** Số scene 10s sẽ chia khi duration > 60 (giới hạn AI video model) */
export function getEstimatedScenes(duration: number): number {
  return Math.max(1, Math.ceil(duration / 10));
}

/** Ước tính phút render dựa số scenes (~30s/scene avg) */
export function getEstimatedRenderMinutes(scenes: number): number {
  return Math.max(1, Math.round((scenes * 30) / 60));
}


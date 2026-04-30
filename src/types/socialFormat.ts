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
  | 'fb-reels'
  | 'pinterest'
  | 'threads'
  | 'bluesky'
  | 'whatsapp'
  | 'facebook'
  | 'linkedin'
  | 'x'
  | 'youtube';

export type SocialFormatLength = 'short' | 'standard' | 'long';

export type AspectRatio = '9:16' | '16:9' | '1:1' | '2:3' | '4:5';

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

/** Hard upper-limit (seconds) per platform — dùng cho validation + UI cảnh báo */
export const PLATFORM_MAX_DURATION: Record<SocialPlatform, number> = {
  tiktok: 600,      // TikTok cho phép tới 10 phút (2026)
  reels: 90,        // IG Reels max 90s
  shorts: 60,       // YT Shorts max 60s
  'fb-reels': 90,   // FB Reels max 90s
  pinterest: 60,    // Pin Video / Idea Pin
  threads: 300,     // Threads video max 5 phút
  bluesky: 60,      // Bluesky video max 60s
  whatsapp: 60,     // WhatsApp Status max 60s (1 segment)
  facebook: 240,    // FB Feed video — giới hạn thực tế cho social
  linkedin: 600,    // LinkedIn video max 10 phút (organic)
  x: 140,           // X free-tier max 2:20
  youtube: 3600,    // YouTube long
};

export const SOCIAL_PLATFORM_LABELS: Record<SocialPlatform, { label: string; tagline: string }> = {
  tiktok:    { label: 'TikTok',     tagline: 'Vertical 9:16 · Hook 1.5s đầu' },
  reels:     { label: 'Reels (IG)', tagline: 'Vertical 9:16 · Cinematic, max 90s' },
  shorts:    { label: 'YT Shorts',  tagline: 'Vertical 9:16 · Punchy, max 60s' },
  'fb-reels':{ label: 'FB Reels',   tagline: 'Vertical 9:16 · Meta cross-post' },
  pinterest: { label: 'Pinterest',  tagline: '2:3 Pin · Visual discovery' },
  threads:   { label: 'Threads',    tagline: '9:16 · Conversation-first, max 5 phút' },
  bluesky:   { label: 'Bluesky',    tagline: '1:1 · Open social, max 60s' },
  whatsapp:  { label: 'WhatsApp',   tagline: '9:16 Status · 60s/segment' },
  facebook:  { label: 'Facebook',   tagline: '1:1 Feed · Caption-friendly' },
  linkedin:  { label: 'LinkedIn',   tagline: '16:9 · Professional' },
  x:         { label: 'X (Twitter)', tagline: '1:1 · Punchy, text-overlay' },
  youtube:   { label: 'YouTube Long', tagline: '16:9 · High production' },
};

export const SOCIAL_PLATFORM_GROUP: Record<SocialPlatform, SocialGroup> = {
  tiktok: 'short-form',
  reels: 'short-form',
  shorts: 'short-form',
  'fb-reels': 'short-form',
  pinterest: 'short-form',
  threads: 'short-form',
  bluesky: 'short-form',
  whatsapp: 'short-form',
  facebook: 'long-form',
  linkedin: 'long-form',
  x: 'long-form',
  youtube: 'long-form',
};

export const SOCIAL_GROUP_LABELS: Record<SocialGroup, { label: string; description: string }> = {
  'short-form': { label: 'Short-form Video', description: 'Vertical / Square ngắn · Hook nhanh · ≤ 5 phút' },
  'long-form':  { label: 'Standard / Long-form', description: 'Square 1:1 hoặc 16:9 · Storytelling' },
};

export const SOCIAL_FORMAT_PRESETS: SocialFormatPreset[] = [
  // ===== Short-form =====
  // TikTok
  { id: 'tiktok-short',    platform: 'tiktok', format: 'short',    label: 'TikTok Short',    shortLabel: '15s', duration: 15, aspectRatio: '9:16', toneHint: 'punchy, hook-1.5s',  channelKey: 'tiktok', description: 'Hook nhanh, fast cut, trending text' },
  { id: 'tiktok-standard', platform: 'tiktok', format: 'standard', label: 'TikTok Standard', shortLabel: '30s', duration: 30, aspectRatio: '9:16', toneHint: 'engaging, mid-tempo', channelKey: 'tiktok', description: 'Tutorial ngắn, story arc nhỏ' },
  { id: 'tiktok-long',     platform: 'tiktok', format: 'long',     label: 'TikTok Long',     shortLabel: '60s', duration: 60, aspectRatio: '9:16', toneHint: 'detailed, narrative',channelKey: 'tiktok', description: 'Storytelling đầy đủ' },

  // Reels (IG) — Meta đã nâng max lên 90s (2026)
  { id: 'reels-short',    platform: 'reels', format: 'short',    label: 'Reels Short',    shortLabel: '15s', duration: 15, aspectRatio: '9:16', toneHint: 'aesthetic, smooth',     channelKey: 'reels', description: 'Aesthetic loop, smooth glide' },
  { id: 'reels-standard', platform: 'reels', format: 'standard', label: 'Reels Standard', shortLabel: '30s', duration: 30, aspectRatio: '9:16', toneHint: 'cinematic, polished',   channelKey: 'reels', description: 'Cinematic polish, color grade' },
  { id: 'reels-long',     platform: 'reels', format: 'long',     label: 'Reels Long',     shortLabel: '90s', duration: 90, aspectRatio: '9:16', toneHint: 'narrative, brand-led',  channelKey: 'reels', description: 'Brand storytelling đầy đủ (max 90s 2026)' },

  // Shorts (YouTube) — vẫn cap 60s
  { id: 'shorts-short',    platform: 'shorts', format: 'short',    label: 'Shorts Short',    shortLabel: '15s', duration: 15, aspectRatio: '9:16', toneHint: 'punchy hook',  channelKey: 'shorts', description: 'Punchy, clean composition' },
  { id: 'shorts-standard', platform: 'shorts', format: 'standard', label: 'Shorts Standard', shortLabel: '30s', duration: 30, aspectRatio: '9:16', toneHint: 'tutorial pace',channelKey: 'shorts', description: 'Quick tutorial' },
  { id: 'shorts-long',     platform: 'shorts', format: 'long',     label: 'Shorts Long',     shortLabel: '60s', duration: 60, aspectRatio: '9:16', toneHint: 'mini-story',   channelKey: 'shorts', description: 'Mini-story dài' },

  // Facebook Reels (9:16) — tách riêng khỏi FB Feed (1:1)
  { id: 'fb-reels-short',    platform: 'fb-reels', format: 'short',    label: 'FB Reels Short',    shortLabel: '15s', duration: 15, aspectRatio: '9:16', toneHint: 'punchy, meta cross-post', channelKey: 'facebook', description: 'Vertical Meta cross-post' },
  { id: 'fb-reels-standard', platform: 'fb-reels', format: 'standard', label: 'FB Reels Standard', shortLabel: '30s', duration: 30, aspectRatio: '9:16', toneHint: 'engaging, vertical',     channelKey: 'facebook', description: 'Reels chuẩn, vertical-first' },
  { id: 'fb-reels-long',     platform: 'fb-reels', format: 'long',     label: 'FB Reels Long',     shortLabel: '90s', duration: 90, aspectRatio: '9:16', toneHint: 'narrative vertical',     channelKey: 'facebook', description: 'Storytelling vertical đầy đủ' },

  // Pinterest — Native Pin = 2:3 (1000×1500), search-engine copy. Idea Pin riêng = 9:16.
  { id: 'pinterest-short',    platform: 'pinterest', format: 'short',    label: 'Pin Short',     shortLabel: '15s', duration: 15, aspectRatio: '2:3', toneHint: 'visual hook, lifestyle',  channelKey: 'generic', description: 'Pin Video 2:3, visual-first' },
  { id: 'pinterest-standard', platform: 'pinterest', format: 'standard', label: 'Pin Standard',  shortLabel: '30s', duration: 30, aspectRatio: '2:3', toneHint: 'tutorial, before-after',  channelKey: 'generic', description: 'Pin Video tutorial / before-after' },
  { id: 'pinterest-long',     platform: 'pinterest', format: 'long',     label: 'Idea Pin',      shortLabel: '60s', duration: 60, aspectRatio: '9:16', toneHint: 'how-to, deep visual',     channelKey: 'generic', description: 'Idea Pin 9:16, save-worthy' },

  // Threads (Meta) — conversation-first video, hỗ trợ tới 5 phút
  { id: 'threads-short',    platform: 'threads', format: 'short',    label: 'Threads Short',    shortLabel: '15s', duration: 15, aspectRatio: '9:16', toneHint: 'conversational hook',  channelKey: 'generic', description: 'Hook đối thoại ngắn' },
  { id: 'threads-standard', platform: 'threads', format: 'standard', label: 'Threads Standard', shortLabel: '30s', duration: 30, aspectRatio: '9:16', toneHint: 'opinion, take',        channelKey: 'generic', description: 'Take / opinion ngắn' },
  { id: 'threads-long',     platform: 'threads', format: 'long',     label: 'Threads Long',     shortLabel: '5 phút', duration: 300, aspectRatio: '9:16', toneHint: 'thread storytelling',  channelKey: 'generic', description: 'Thread story dài (max 5 phút 2026)' },

  // Bluesky — open social, max 60s, 1:1 chuẩn
  { id: 'bluesky-short',    platform: 'bluesky', format: 'short',    label: 'Bluesky Short',    shortLabel: '15s', duration: 15, aspectRatio: '1:1', toneHint: 'punchy hook, open-social', channelKey: 'generic', description: 'Hook ngắn cho Bluesky' },
  { id: 'bluesky-standard', platform: 'bluesky', format: 'standard', label: 'Bluesky Standard', shortLabel: '30s', duration: 30, aspectRatio: '1:1', toneHint: 'opinion, take',           channelKey: 'generic', description: 'Take / opinion 30s' },
  { id: 'bluesky-long',     platform: 'bluesky', format: 'long',     label: 'Bluesky Long',     shortLabel: '60s', duration: 60, aspectRatio: '1:1', toneHint: 'thread-style',            channelKey: 'generic', description: 'Story 1 phút (max)' },

  // WhatsApp Status — vertical 9:16, mỗi segment 60s
  { id: 'whatsapp-short',    platform: 'whatsapp', format: 'short',    label: 'Status Short',    shortLabel: '15s', duration: 15, aspectRatio: '9:16', toneHint: 'quick announce',     channelKey: 'generic', description: 'Status nhanh, hook đầu' },
  { id: 'whatsapp-standard', platform: 'whatsapp', format: 'standard', label: 'Status Standard', shortLabel: '30s', duration: 30, aspectRatio: '9:16', toneHint: 'announcement',       channelKey: 'generic', description: 'Status chuẩn 1 segment' },
  { id: 'whatsapp-long',     platform: 'whatsapp', format: 'long',     label: 'Status Long',     shortLabel: '60s', duration: 60, aspectRatio: '9:16', toneHint: 'mini-story status', channelKey: 'generic', description: 'Status full segment 60s' },

  // ===== Long-form =====
  // Facebook
  { id: 'facebook-short',    platform: 'facebook', format: 'short',    label: 'FB Short',    shortLabel: '30s', duration: 30, aspectRatio: '1:1', toneHint: 'attention-first-frame', channelKey: 'facebook', description: 'Hook frame đầu tiên' },
  { id: 'facebook-standard', platform: 'facebook', format: 'standard', label: 'FB Standard', shortLabel: '60s', duration: 60, aspectRatio: '1:1', toneHint: 'square, captions-first',channelKey: 'facebook', description: 'Square layout, captions-first' },
  { id: 'facebook-long',     platform: 'facebook', format: 'long',     label: 'FB Long',     shortLabel: '90s', duration: 90, aspectRatio: '1:1', toneHint: 'storytelling',         channelKey: 'facebook', description: 'Storytelling dài hơn' },

  // LinkedIn
  // LinkedIn — 16:9 là chuẩn professional video (2026)
  { id: 'linkedin-short',    platform: 'linkedin', format: 'short',    label: 'LinkedIn Short',    shortLabel: '30s', duration: 30, aspectRatio: '16:9', toneHint: 'professional, insight', channelKey: 'generic', description: 'Insight ngắn, professional' },
  { id: 'linkedin-standard', platform: 'linkedin', format: 'standard', label: 'LinkedIn Standard', shortLabel: '60s', duration: 60, aspectRatio: '16:9', toneHint: 'thought-leadership',    channelKey: 'generic', description: 'Thought leadership' },
  { id: 'linkedin-long',     platform: 'linkedin', format: 'long',     label: 'LinkedIn Long',     shortLabel: '90s', duration: 90, aspectRatio: '16:9', toneHint: 'case-study, data',      channelKey: 'generic', description: 'Case study + data' },

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

/** Trả về max duration (giây) cho 1 platform — fallback 600 nếu lạ */
export function getPlatformMaxDuration(platform: SocialPlatform): number {
  return PLATFORM_MAX_DURATION[platform] ?? 600;
}

/**
 * Kiểm tra duration có vượt giới hạn platform không.
 * @returns { ok, max, overBy } — overBy = số giây vượt (0 nếu hợp lệ)
 */
export function validatePresetDuration(
  platform: SocialPlatform,
  duration: number,
): { ok: boolean; max: number; overBy: number } {
  const max = getPlatformMaxDuration(platform);
  const overBy = Math.max(0, duration - max);
  return { ok: overBy === 0, max, overBy };
}

/** Ước tính phút render dựa số scenes (~30s/scene avg) */
export function getEstimatedRenderMinutes(scenes: number): number {
  return Math.max(1, Math.round((scenes * 30) / 60));
}


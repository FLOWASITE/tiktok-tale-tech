/**
 * Video model capability map — single source of truth cho cả admin panel
 * (`/admin/ai`) và user-facing badge (`AdminModelBadge` trong VideoGeneratorPanel).
 *
 * Khi thêm model video mới vào `MODELS_BY_TYPE.video` (useAIConfig.ts), cập nhật
 * caps tương ứng tại đây để UI hiển thị đúng aspect ratios + max duration.
 */

export type VideoProviderKey = 'geminigen' | 'poyo' | 'minimax';

export interface VideoModelCaps {
  provider: VideoProviderKey;
  /** Aspect ratio strings model hỗ trợ (UI sẽ filter theo đây) */
  aspectRatios: string[];
  /** Duration tối đa (giây) */
  maxDuration: number;
  /** Duration choices admin có thể đặt làm mặc định */
  durationChoices: number[];
  /** Resolution choices */
  resolutionChoices: string[];
  /** Hiển thị label gọn */
  shortName: string;
}

const COMMON_DURATIONS = [5, 10];
const COMMON_RES = ['480p', '720p', '1080p'];

const VEO_FAMILY_CAPS: Omit<VideoModelCaps, 'shortName'> = {
  provider: 'geminigen',
  aspectRatios: ['16:9', '9:16', '1:1'],
  maxDuration: 10,
  durationChoices: COMMON_DURATIONS,
  resolutionChoices: ['720p', '1080p'],
};

export const VIDEO_MODEL_CAPS: Record<string, VideoModelCaps> = {
  // ── GeminiGen Veo / Sora ─────────────────────────────────────────────
  'geminigen/veo-3': { ...VEO_FAMILY_CAPS, shortName: 'Veo 3' },
  'geminigen/veo-3-fast': { ...VEO_FAMILY_CAPS, shortName: 'Veo 3 Fast' },
  'geminigen/veo-3.1': { ...VEO_FAMILY_CAPS, shortName: 'Veo 3.1' },
  'geminigen/veo-3.1-fast': { ...VEO_FAMILY_CAPS, shortName: 'Veo 3.1 Fast' },
  'geminigen/veo-2': {
    ...VEO_FAMILY_CAPS,
    shortName: 'Veo 2',
    aspectRatios: ['16:9', '9:16'],
  },
  'geminigen/sora-2': {
    provider: 'geminigen',
    aspectRatios: ['16:9', '9:16', '1:1'],
    maxDuration: 10,
    durationChoices: COMMON_DURATIONS,
    resolutionChoices: ['720p', '1080p'],
    shortName: 'Sora 2',
  },
  'geminigen/sora-2-pro': {
    provider: 'geminigen',
    aspectRatios: ['16:9', '9:16', '1:1'],
    maxDuration: 10,
    durationChoices: COMMON_DURATIONS,
    resolutionChoices: ['720p', '1080p'],
    shortName: 'Sora 2 Pro',
  },
  'geminigen/sora-2-hd': {
    provider: 'geminigen',
    aspectRatios: ['16:9', '9:16'],
    maxDuration: 10,
    durationChoices: COMMON_DURATIONS,
    resolutionChoices: ['1080p'],
    shortName: 'Sora 2 HD',
  },

  // ── PoYo.ai video ────────────────────────────────────────────────────
  'poyo/veo-3': {
    provider: 'poyo',
    aspectRatios: ['16:9', '9:16', '1:1'],
    maxDuration: 10,
    durationChoices: COMMON_DURATIONS,
    resolutionChoices: COMMON_RES,
    shortName: 'PoYo Veo 3',
  },
  'poyo/veo-3-fast': {
    provider: 'poyo',
    aspectRatios: ['16:9', '9:16', '1:1'],
    maxDuration: 10,
    durationChoices: COMMON_DURATIONS,
    resolutionChoices: COMMON_RES,
    shortName: 'PoYo Veo 3 Fast',
  },
  'poyo/veo-3.1': {
    provider: 'poyo',
    aspectRatios: ['16:9', '9:16', '1:1'],
    maxDuration: 10,
    durationChoices: COMMON_DURATIONS,
    resolutionChoices: COMMON_RES,
    shortName: 'PoYo Veo 3.1',
  },
  'poyo/veo-3.1-fast': {
    provider: 'poyo',
    aspectRatios: ['16:9', '9:16', '1:1'],
    maxDuration: 10,
    durationChoices: COMMON_DURATIONS,
    resolutionChoices: COMMON_RES,
    shortName: 'PoYo Veo 3.1 Fast',
  },
  'poyo/sora-2': {
    provider: 'poyo',
    aspectRatios: ['16:9', '9:16', '1:1'],
    maxDuration: 10,
    durationChoices: COMMON_DURATIONS,
    resolutionChoices: ['720p', '1080p'],
    shortName: 'PoYo Sora 2',
  },
  'poyo/sora-2-pro': {
    provider: 'poyo',
    aspectRatios: ['16:9', '9:16', '1:1'],
    maxDuration: 10,
    durationChoices: COMMON_DURATIONS,
    resolutionChoices: ['720p', '1080p'],
    shortName: 'PoYo Sora 2 Pro',
  },
  'poyo/kling-2.1': {
    provider: 'poyo',
    aspectRatios: ['16:9', '9:16', '1:1'],
    maxDuration: 10,
    durationChoices: COMMON_DURATIONS,
    resolutionChoices: ['720p', '1080p'],
    shortName: 'PoYo Kling 2.1',
  },
  'poyo/kling-2.1-pro': {
    provider: 'poyo',
    aspectRatios: ['16:9', '9:16', '1:1'],
    maxDuration: 10,
    durationChoices: COMMON_DURATIONS,
    resolutionChoices: ['720p', '1080p'],
    shortName: 'PoYo Kling 2.1 Pro',
  },
  'poyo/hailuo-02': {
    provider: 'poyo',
    aspectRatios: ['16:9', '9:16', '1:1'],
    maxDuration: 10,
    durationChoices: [6, 10],
    resolutionChoices: ['720p', '1080p'],
    shortName: 'PoYo Hailuo 02',
  },
  'poyo/seedance-1-pro': {
    provider: 'poyo',
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'],
    maxDuration: 10,
    durationChoices: [5, 10],
    resolutionChoices: ['480p', '720p', '1080p'],
    shortName: 'PoYo Seedance 1 Pro',
  },
  'poyo/seedance-2': {
    provider: 'poyo',
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9', '2:3'],
    maxDuration: 10,
    durationChoices: [5, 10],
    resolutionChoices: ['480p', '720p', '1080p'],
    shortName: 'PoYo Seedance 2',
  },

  // ── Minimax (legacy) ─────────────────────────────────────────────────
  'minimax/video-01': {
    provider: 'minimax',
    aspectRatios: ['16:9', '9:16', '1:1'],
    maxDuration: 6,
    durationChoices: [5, 6],
    resolutionChoices: ['720p'],
    shortName: 'Minimax Video-01',
  },
};

const FALLBACK_CAPS: VideoModelCaps = {
  provider: 'geminigen',
  aspectRatios: ['16:9', '9:16', '1:1'],
  maxDuration: 10,
  durationChoices: COMMON_DURATIONS,
  resolutionChoices: ['720p', '1080p'],
  shortName: 'Unknown',
};

export function getVideoModelCaps(modelId: string | null | undefined): VideoModelCaps {
  if (!modelId) return FALLBACK_CAPS;
  return VIDEO_MODEL_CAPS[modelId] ?? FALLBACK_CAPS;
}

export const VIDEO_PROVIDER_LABEL: Record<VideoProviderKey, string> = {
  geminigen: 'GeminiGen.ai',
  poyo: 'PoYo.ai',
  minimax: 'Minimax',
};

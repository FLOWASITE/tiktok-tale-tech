export type VideoProvider = 'geminigen' | 'lovable' | 'minimax' | 'runway';

export const GEMINIGEN_VIDEO_MODELS = [
  { id: 'geminigen/veo-3', label: 'Veo 3', maxDuration: 10 },
  { id: 'geminigen/veo-3-fast', label: 'Veo 3 Fast', maxDuration: 10 },
  { id: 'geminigen/veo-3.1', label: 'Veo 3.1', maxDuration: 10 },
  { id: 'geminigen/veo-3.1-fast', label: 'Veo 3.1 Fast', maxDuration: 10 },
  { id: 'geminigen/veo-2', label: 'Veo 2', maxDuration: 8 },
  { id: 'geminigen/sora-2', label: 'Sora 2', maxDuration: 10 },
] as const;

export type GeminiGenVideoModelId = typeof GEMINIGEN_VIDEO_MODELS[number]['id'];
export type VideoGenerationStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface VideoGeneration {
  id: string;
  script_id?: string;
  storyboard_id?: string;
  scene_number?: number;
  
  provider: VideoProvider;
  model_used?: string;
  
  prompt: string;
  starting_frame_url?: string;
  duration_seconds: number;
  aspect_ratio: string;
  resolution: string;
  
  video_url?: string;
  thumbnail_url?: string;
  
  status: VideoGenerationStatus;
  progress: number;
  error_message?: string;
  
  cost_estimate?: number;
  generation_time_ms?: number;
  
  user_id: string;
  organization_id?: string;
  
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface VideoGenerationRequest {
  provider: VideoProvider;
  prompt: string;
  model?: string;
  duration?: number;
  aspect_ratio?: string;
  resolution?: string;
  starting_frame_url?: string;
  negative_prompt?: string;
  script_id?: string;
  storyboard_id?: string;
  scene_number?: number;
}

export const VIDEO_PROVIDER_CONFIG: Record<VideoProvider, {
  label: string;
  description: string;
  icon: string;
  requiresApiKey: boolean;
  maxDuration: number;
  aspectRatios: string[];
  supportsModelSelect?: boolean;
}> = {
  geminigen: {
    label: 'GeminiGen (Veo / Sora)',
    description: 'Veo 3, Veo 3 Fast, Veo 3.1, Sora 2 — cần GEMINIGEN_API_KEY',
    icon: '🎥',
    requiresApiKey: true,
    maxDuration: 10,
    aspectRatios: ['16:9', '9:16', '1:1'],
    supportsModelSelect: true,
  },
  lovable: {
    label: 'Lovable AI',
    description: 'Tích hợp sẵn, không cần API key',
    icon: '✨',
    requiresApiKey: false,
    maxDuration: 10,
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'],
  },
  minimax: {
    label: 'Minimax/Hailuo',
    description: 'Video AI chất lượng cao, cần API key',
    icon: '🎬',
    requiresApiKey: true,
    maxDuration: 6,
    aspectRatios: ['16:9', '9:16', '1:1'],
  },
  runway: {
    label: 'Runway Gen-3',
    description: 'Video AI cao cấp (Coming soon)',
    icon: '🚀',
    requiresApiKey: true,
    maxDuration: 10,
    aspectRatios: ['16:9', '9:16', '1:1'],
  },
};

export const ASPECT_RATIO_CONFIG: Record<string, { label: string; width: number; height: number }> = {
  '16:9': { label: 'Landscape (16:9)', width: 1920, height: 1080 },
  '9:16': { label: 'Portrait (9:16)', width: 1080, height: 1920 },
  '1:1': { label: 'Square (1:1)', width: 1080, height: 1080 },
  '4:3': { label: 'Standard (4:3)', width: 1440, height: 1080 },
  '3:4': { label: 'Tall (3:4)', width: 1080, height: 1440 },
  '21:9': { label: 'Cinematic (21:9)', width: 2560, height: 1080 },
};

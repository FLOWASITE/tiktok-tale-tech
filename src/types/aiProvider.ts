export type AIProviderType = 'gemini' | 'openai' | 'replicate' | 'custom' | 'openrouter' | 'kie' | 'poyo' | 'dashscope' | 'geminigen';

export interface AIProviderConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export interface AIProvidersConfig {
  selectedProvider: AIProviderType;
  providers: {
    gemini?: AIProviderConfig;
    openai?: AIProviderConfig;
    replicate?: AIProviderConfig;
    custom?: AIProviderConfig;
  };
}

export interface AIProviderInfo {
  id: AIProviderType;
  name: string;
  description: string;
  getKeyUrl: string | null;
  models: string[];
  icon: string;
}

export const AI_PROVIDERS: AIProviderInfo[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'gemini-2.0-flash-exp-image-generation',
    getKeyUrl: 'https://aistudio.google.com/apikey',
    models: ['gemini-2.0-flash-exp-image-generation'],
    icon: '✨',
  },
  {
    id: 'openai',
    name: 'OpenAI DALL-E',
    description: 'DALL-E 3, gpt-image-1',
    getKeyUrl: 'https://platform.openai.com/api-keys',
    models: ['dall-e-3', 'gpt-image-1'],
    icon: '🤖',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'GPT-5.4, Grok 4.20, Claude 4.6, Gemini 3.1, DeepSeek V3.2, MiniMax, Mercury...',
    getKeyUrl: 'https://openrouter.ai/keys',
    models: [
      'openai/gpt-5.4',
      'openai/gpt-5.4-pro',
      'openai/gpt-5.3-codex',
      'openai/gpt-5.3-chat',
      'openai/gpt-5.2',
      'x-ai/grok-4.20-beta',
      'x-ai/grok-4.20-multi-agent-beta',
      'anthropic/claude-sonnet-4.6',
      'anthropic/claude-sonnet-4.5',
      'google/gemini-3.1-flash-lite-preview',
      'google/gemini-3-flash-preview',
      'deepseek/deepseek-v3.2',
      'minimax/minimax-m2.5',
      'qwen/qwen3.5-397b-a17b',
      'qwen/qwen3.5-flash-02-23',
      'inception/mercury-2',
      'stepfun/step-3.5-flash',
      'bytedance-seed/seed-2.0-lite',
    ],
    icon: '🔀',
  },
  {
    id: 'replicate',
    name: 'Replicate',
    description: 'Flux, SDXL, Midjourney-style',
    getKeyUrl: 'https://replicate.com/account/api-tokens',
    models: ['black-forest-labs/flux-schnell', 'stability-ai/sdxl'],
    icon: '🎨',
  },
  {
    id: 'kie',
    name: 'KIE.ai',
    description: 'Flux Kontext, Flux 2, Nano Banana, GPT-Image, Grok Imagine',
    getKeyUrl: 'https://kie.ai',
    models: [
      'flux-kontext-pro', 'flux-kontext-max',
      'gpt-image-1', 'gpt-image-1.5',
      'flux-2/pro-text-to-image', 'flux-2/flex-text-to-image',
      'flux-2/pro-image-to-image', 'flux-2/flex-image-to-image',
      'nano-banana', 'nano-banana-edit', 'nano-banana-pro',
      'grok-imagine/text-to-image', 'grok-imagine/image-to-image',
    ],
    icon: '🔮',
  },
  {
    id: 'poyo',
    name: 'PoYo.ai',
    description: 'Nano Banana 2 (Gemini 3.1 Flash), Nano Banana Pro, GPT-4o, Flux 2, Seedream 4.5, Z-Image, Grok',
    getKeyUrl: 'https://poyo.ai/dashboard/api-key',
    models: [
      // Nano Banana series (Gemini-based)
      'poyo/nano-banana', 'poyo/nano-banana-pro',
      'poyo/nano-banana-2', 'poyo/nano-banana-2-edit',
      'poyo/nano-banana-2-new', 'poyo/nano-banana-2-new-edit',
      // GPT Image series
      'poyo/gpt-4o-image', 'poyo/gpt-4o-image-edit',
      'poyo/gpt-image-1', 'poyo/gpt-image-1-edit',
      'poyo/gpt-image-1.5', 'poyo/gpt-image-1.5-official', 'poyo/gpt-image-1.5-official-edit',
      'poyo/gpt-image-2', 'poyo/gpt-image-2-edit',
      // Flux series
      'poyo/flux-2-pro', 'poyo/flux-2-pro-edit',
      'poyo/flux-2-flex', 'poyo/flux-2-flex-edit',
      'poyo/flux-kontext-pro', 'poyo/flux-kontext-max',
      // Seedream (ByteDance)
      'poyo/seedream-4', 'poyo/seedream-4-edit',
      'poyo/seedream-4.5', 'poyo/seedream-4.5-edit',
      'poyo/seedream-5.0-lite', 'poyo/seedream-5.0-lite-edit',
      // Wan (Alibaba)
      'poyo/wan-2.7-image', 'poyo/wan-2.7-image-pro',
      // Kling
      'poyo/kling-o1', 'poyo/kling-o3',
      // Others
      'poyo/z-image', 'poyo/grok-imagine',
    ],
    icon: '🐱',
  },
  {
    id: 'dashscope',
    name: 'DashScope (Alibaba Cloud)',
    description: 'Qwen3 Max/Plus/Turbo/Flash, Qwen3-VL, Qwen3-Coder, Qwen3-Long + legacy Qwen',
    getKeyUrl: 'https://dashscope.console.aliyun.com/',
    models: [
      // Qwen3 series (latest)
      'qwen3-max', 'qwen3-plus', 'qwen3-turbo', 'qwen3-flash', 'qwen3-long',
      'qwen3-vl-max', 'qwen3-vl-plus', 'qwen3-coder-plus',
      'qwen-max-latest', 'qwen-plus-latest',
      // Legacy (backward compat)
      'qwen-plus', 'qwen-max', 'qwen-turbo', 'qwen-vl-max', 'qwen-long',
    ],
    icon: '☁️',
  },
  {
    id: 'geminigen',
    name: 'GeminiGen.ai',
    description: 'Image (Nano Banana Pro/2, Imagen 4) + Video (Veo 3.1, Sora 2, Grok 3, Seedance 2, Kling 3)',
    getKeyUrl: 'https://geminigen.ai/profile/integration/api-keys',
    models: [
      // Image
      'geminigen/nano-banana-pro',
      'geminigen/nano-banana-2',
      'geminigen/imagen-4',
      'geminigen/grok-image',
      // Video — Veo (Google)
      'geminigen/veo-2',
      'geminigen/veo-3',
      'geminigen/veo-3-fast',
      'geminigen/veo-3.1',
      'geminigen/veo-3.1-hd',
      'geminigen/veo-3.1-fullhd',
      'geminigen/veo-3.1-fast',
      'geminigen/veo-3.1-fast-fullhd',
      'geminigen/veo-3.1-lite-hd',
      'geminigen/veo-3.1-lite-fullhd',
      // Video — Sora (OpenAI)
      'geminigen/sora-2',
      'geminigen/sora-2-pro',
      'geminigen/sora-2-hd',
      // Video — Grok (xAI)
      'geminigen/grok-3',
      // Video — Bytedance Seedance 2.0
      'geminigen/seedance-2-fast-480p',
      'geminigen/seedance-2-fast-720p',
      'geminigen/seedance-2-pro-480p',
      'geminigen/seedance-2-pro-720p',
      'geminigen/seedance-2-omni-fast',
      'geminigen/seedance-2-omni-pro',
      'geminigen/seedance-2-omni-fast-vip',
      'geminigen/seedance-2-omni-pro-vip',
      // Video — Kling (Kuaishou)
      'geminigen/kling-3.0-720p',
      'geminigen/kling-3.0-1080p',
      'geminigen/kling-3.0-edit-720p',
      'geminigen/kling-3.0-edit-1080p',
      'geminigen/kling-3.0-motion-720p',
      'geminigen/kling-3.0-motion-1080p',
      'geminigen/kling-o1-720p',
      'geminigen/kling-o1-1080p',
      'geminigen/kling-o1-edit-1080p',
      'geminigen/kling-2.6-720p',
      'geminigen/kling-2.6-1080p',
      'geminigen/kling-2.6-1080p-audio',
      'geminigen/kling-2.6-motion-720p',
      'geminigen/kling-2.6-motion-1080p',
      'geminigen/kling-2.5-720p',
      'geminigen/kling-2.5-1080p',
      'geminigen/kling-2.5-720p-relax',
      'geminigen/kling-2.1-5s-720p',
      'geminigen/kling-2.1-5s-1080p',
      'geminigen/kling-2.1-10s-720p',
      'geminigen/kling-2.1-10s-1080p',
      'geminigen/kling-lipsync',
    ],
    icon: '🌟',
  },
  {
    id: 'custom',
    name: 'Custom API',
    description: 'OpenAI-compatible endpoints',
    getKeyUrl: null,
    models: [],
    icon: '⚙️',
  },
];

export const DEFAULT_AI_CONFIG: AIProvidersConfig = {
  selectedProvider: 'poyo',
  providers: {},
};

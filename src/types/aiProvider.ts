export type AIProviderType = 'gemini' | 'openai' | 'replicate' | 'custom' | 'openrouter' | 'kie' | 'poyo' | 'dashscope';

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
    models: ['poyo/nano-banana-2-new', 'poyo/nano-banana-2-new-edit', 'poyo/nano-banana-2', 'poyo/nano-banana-2-edit', 'poyo/gpt-4o-image', 'poyo/gpt-4o-image-edit', 'poyo/gpt-image-1.5', 'poyo/z-image', 'poyo/flux-2-pro', 'poyo/flux-2-pro-edit', 'poyo/flux-2-flex', 'poyo/flux-2-flex-edit', 'poyo/seedream-4.5', 'poyo/seedream-4.5-edit', 'poyo/grok-imagine'],
    icon: '🐱',
  },
  {
    id: 'dashscope',
    name: 'DashScope (Alibaba Cloud)',
    description: 'Qwen Plus, Qwen Max, Qwen Turbo, Qwen VL, Qwen Long',
    getKeyUrl: 'https://dashscope.console.aliyun.com/',
    models: ['qwen-plus', 'qwen-max', 'qwen-turbo', 'qwen-vl-max', 'qwen-long'],
    icon: '☁️',
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

export type AIProviderType = 'gemini' | 'openai' | 'replicate' | 'custom' | 'openrouter' | 'kie' | 'poyo';

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
    description: 'Claude 4.6, GPT-5.2, Gemini 3, DeepSeek V3.2, MiniMax...',
    getKeyUrl: 'https://openrouter.ai/keys',
    models: [
      'anthropic/claude-sonnet-4.6',
      'anthropic/claude-sonnet-4.5',
      'openai/gpt-5.2',
      'google/gemini-3-flash-preview',
      'deepseek/deepseek-v3.2',
      'minimax/minimax-m2.5',
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

export type AIProviderType = 'gemini' | 'openai' | 'replicate' | 'custom';

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
    id: 'replicate',
    name: 'Replicate',
    description: 'Flux, SDXL, Midjourney-style',
    getKeyUrl: 'https://replicate.com/account/api-tokens',
    models: ['black-forest-labs/flux-schnell', 'stability-ai/sdxl'],
    icon: '🎨',
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
  selectedProvider: 'gemini',
  providers: {},
};

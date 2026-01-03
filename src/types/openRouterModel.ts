export interface OpenRouterModel {
  id: string;           // e.g., "anthropic/claude-sonnet-4"
  name: string;         // e.g., "Claude Sonnet 4"
  description: string;
  provider: string;     // e.g., "Anthropic"
  pricing: {
    prompt: number;     // per 1M tokens
    completion: number; // per 1M tokens
  };
  contextLength: number;
  modality: string;     // e.g., "text->text", "text+image->text"
  topProvider?: {
    maxCompletionTokens?: number;
  };
  // Computed fields
  category?: 'flagship' | 'fast' | 'cheap' | 'multimodal' | 'coding' | 'reasoning';
  isPopular?: boolean;
}

export interface OpenRouterModelsResponse {
  models: OpenRouterModel[];
  fetchedAt: string;
}

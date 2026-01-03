import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { OpenRouterModel, OpenRouterModelsResponse } from '@/types/openRouterModel';

export function useOpenRouterModels(enabled: boolean = true) {
  return useQuery<OpenRouterModel[]>({
    queryKey: ['openrouter-models'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<OpenRouterModelsResponse>(
        'fetch-openrouter-models'
      );
      
      if (error) {
        console.error('Failed to fetch OpenRouter models:', error);
        throw error;
      }
      
      return data?.models || [];
    },
    enabled,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000, // 2 hours (formerly cacheTime)
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

// Helper to convert OpenRouterModel to ModelInfo format
export function openRouterModelToModelInfo(model: OpenRouterModel) {
  const promptCost = model.pricing.prompt;
  
  // Determine speed based on model characteristics
  let speed: 'fast' | 'medium' | 'slow' = 'medium';
  const id = model.id.toLowerCase();
  if (id.includes('flash') || id.includes('mini') || id.includes('haiku') || id.includes('nano') || id.includes('lite')) {
    speed = 'fast';
  } else if (id.includes('opus') || id.includes('405b') || id.includes('o1') || id.includes('reasoner')) {
    speed = 'slow';
  }
  
  // Determine quality
  let quality: 'standard' | 'high' | 'premium' = 'high';
  if (id.includes('opus') || id.includes('large') || id.includes('pro') || id.includes('405b') || id.includes('turbo')) {
    quality = 'premium';
  } else if (id.includes('mini') || id.includes('nano') || id.includes('lite')) {
    quality = 'standard';
  }
  
  // Determine cost
  let cost: 'low' | 'medium' | 'high' = 'medium';
  if (promptCost < 1) {
    cost = 'low';
  } else if (promptCost > 10) {
    cost = 'high';
  }
  
  // Generate bestFor tags
  const bestFor: string[] = [];
  if (model.category === 'reasoning') bestFor.push('Suy luận', 'Toán học');
  if (model.category === 'coding') bestFor.push('Coding', 'Lập trình');
  if (model.category === 'multimodal') bestFor.push('Hình ảnh', 'Đa phương tiện');
  if (model.category === 'fast') bestFor.push('Nhanh', 'Khối lượng lớn');
  if (model.category === 'cheap') bestFor.push('Tiết kiệm', 'Chi phí thấp');
  if (model.category === 'flagship') bestFor.push('Chất lượng cao', 'Phức tạp');
  if (bestFor.length === 0) bestFor.push('Đa năng');
  
  return {
    shortName: model.name,
    description: model.description?.slice(0, 60) || `${model.provider} model`,
    speed,
    quality,
    cost,
    bestFor,
    provider: 'openrouter' as const,
    isRecommended: model.isPopular,
    // Extended info
    contextLength: model.contextLength,
    pricing: model.pricing,
    modality: model.modality,
    category: model.category,
  };
}

// Group models by provider
export function groupModelsByProvider(models: OpenRouterModel[]): Record<string, OpenRouterModel[]> {
  return models.reduce((acc, model) => {
    const provider = model.provider;
    if (!acc[provider]) {
      acc[provider] = [];
    }
    acc[provider].push(model);
    return acc;
  }, {} as Record<string, OpenRouterModel[]>);
}

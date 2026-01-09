import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AIProviderConfig {
  id: string;
  organizationId: string | null;
  providerType: string;
  displayName: string;
  isActive: boolean;
  apiKeySecretName: string | null;
  baseUrl: string | null;
  defaultModel: string | null;
  config: Record<string, any>;
  encryptedApiKey: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AIFunctionConfig {
  id: string;
  organizationId: string | null;
  functionName: string;
  providerConfigId: string | null;
  modelOverride: string | null;
  parameters: Record<string, any>;
  isEnabled: boolean;
  cacheTtlHours: number;
  priorityLevel: string;
  temperature: number | null;
  maxTokens: number | null;
  customSystemPrompt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Function types for model filtering
export type AIFunctionType = 'text' | 'image' | 'image-direct' | 'search';

// Known AI functions in the project with type metadata
export const AI_FUNCTIONS = [
  // Text Generation Functions (Lovable AI)
  { name: 'generate-multichannel', description: 'Tạo nội dung đa kênh', category: 'content', type: 'text' as AIFunctionType, currentModel: 'google/gemini-3-pro-preview' },
  { name: 'generate-script', description: 'Tạo kịch bản video', category: 'content', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'generate-carousel', description: 'Tạo carousel slides', category: 'content', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'chat-topics', description: 'AI chat assistant', category: 'chat', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'analyze-script', description: 'Phân tích kịch bản', category: 'analysis', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'generate-hooks', description: 'Tạo hook hấp dẫn', category: 'content', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  // 'recommend-topics', 'discover-trending-topics', 'analyze-topic-gaps', 'generate-topic-suggestions' are now merged into 'topic-ai'
  { name: 'topic-ai', description: 'Topic AI (suggest, refine, trending, analysis)', category: 'ideation', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'generate-journey-messaging', description: 'Tạo messaging theo journey', category: 'content', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'generate-sample-text', description: 'Tạo text mẫu', category: 'content', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'generate-brand-voice', description: 'Tạo brand voice', category: 'brand', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'generate-brand-guideline', description: 'Tạo brand guideline', category: 'brand', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'generate-storyboard', description: 'Tạo storyboard', category: 'content', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'chat-conversations', description: 'Summarize conversations', category: 'chat', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash-lite' },
  { name: 'ai-edit-channel', description: 'AI edit cho kênh', category: 'content', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'critique-content', description: 'Đánh giá nội dung', category: 'analysis', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash-lite' },
  { name: 'refine-content', description: 'Tinh chỉnh nội dung', category: 'content', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'generate-ad-copy', description: 'Tạo ad copy đa nền tảng', category: 'content', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'suggest-ad-fix', description: 'Đề xuất sửa ad copy', category: 'content', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  
  // Image Generation Functions  
  { name: 'generate-brand-image', description: 'Tạo hình ảnh thương hiệu', category: 'image', type: 'image' as AIFunctionType, currentModel: 'google/gemini-3-pro-image-preview' },
  { name: 'generate-social-image', description: 'Tạo hình ảnh social', category: 'image', type: 'image' as AIFunctionType, currentModel: 'google/gemini-3-pro-image-preview' },
  { name: 'overlay-brand-logo', description: 'Overlay logo', category: 'image', type: 'image' as AIFunctionType, currentModel: 'google/gemini-3-pro-image-preview' },
  { name: 'generate-carousel-image', description: 'Tạo hình carousel', category: 'image', type: 'image-direct' as AIFunctionType, currentModel: 'gemini-2.0-flash-exp-image-generation' },
  
  // 'generate-topic-suggestions' is now merged into 'topic-ai' with action='suggest'
] as const;

// Models by function type for filtering
export const MODELS_BY_TYPE: Record<AIFunctionType, string[]> = {
  text: [
    'google/gemini-3-pro-preview',
    'google/gemini-2.5-pro',
    'google/gemini-2.5-flash',
    'google/gemini-2.5-flash-lite',
    'openai/gpt-5',
    'openai/gpt-5-mini',
    'openai/gpt-5-nano',
  ],
  image: [
    'google/gemini-3-pro-image-preview',
  ],
  'image-direct': [
    'gemini-2.0-flash-exp-image-generation',
  ],
  search: [
    'sonar-pro',
    'sonar',
  ],
};

// Detailed model information for UI display
export type ModelSpeed = 'fast' | 'medium' | 'slow';
export type ModelQuality = 'standard' | 'high' | 'premium';
export type ModelCost = 'low' | 'medium' | 'high';

export interface ModelInfo {
  shortName: string;
  description: string;
  speed: ModelSpeed;
  quality: ModelQuality;
  cost: ModelCost;
  bestFor: string[];
  provider: 'lovable' | 'openrouter';
  isRecommended?: boolean;
}

export const MODEL_INFO: Record<string, ModelInfo> = {
  // Lovable AI - Google Gemini
  'google/gemini-2.5-flash': {
    shortName: 'Gemini 2.5 Flash',
    description: 'Cân bằng tốc độ và chất lượng',
    speed: 'fast',
    quality: 'high',
    cost: 'low',
    bestFor: ['Nội dung chung', 'Phản hồi nhanh'],
    provider: 'lovable',
    isRecommended: true,
  },
  'google/gemini-2.5-flash-lite': {
    shortName: 'Gemini 2.5 Lite',
    description: 'Nhanh nhất, tiết kiệm nhất',
    speed: 'fast',
    quality: 'standard',
    cost: 'low',
    bestFor: ['Tác vụ đơn giản', 'Phân loại'],
    provider: 'lovable',
  },
  'google/gemini-2.5-pro': {
    shortName: 'Gemini 2.5 Pro',
    description: 'Suy luận phức tạp, ngữ cảnh dài',
    speed: 'medium',
    quality: 'premium',
    cost: 'medium',
    bestFor: ['Phân tích phức tạp', 'Context dài'],
    provider: 'lovable',
  },
  'google/gemini-3-pro-preview': {
    shortName: 'Gemini 3 Pro',
    description: 'Thế hệ mới nhất, tính năng tiên tiến',
    speed: 'medium',
    quality: 'premium',
    cost: 'medium',
    bestFor: ['Tác vụ nâng cao', 'Tính năng mới'],
    provider: 'lovable',
  },
  'google/gemini-3-pro-image-preview': {
    shortName: 'Gemini 3 Image',
    description: 'Tạo hình ảnh thế hệ mới',
    speed: 'medium',
    quality: 'premium',
    cost: 'medium',
    bestFor: ['Tạo hình ảnh', 'Visual content'],
    provider: 'lovable',
  },
  // Lovable AI - OpenAI
  'openai/gpt-5': {
    shortName: 'GPT-5',
    description: 'Mạnh nhất, đa năng nhất',
    speed: 'slow',
    quality: 'premium',
    cost: 'high',
    bestFor: ['Phân tích phức tạp', 'Nội dung tinh tế'],
    provider: 'lovable',
  },
  'openai/gpt-5-mini': {
    shortName: 'GPT-5 Mini',
    description: 'Mạnh với chi phí hợp lý',
    speed: 'medium',
    quality: 'high',
    cost: 'medium',
    bestFor: ['Nội dung chất lượng', 'Cân bằng chi phí'],
    provider: 'lovable',
  },
  'openai/gpt-5-nano': {
    shortName: 'GPT-5 Nano',
    description: 'Nhanh và tiết kiệm',
    speed: 'fast',
    quality: 'standard',
    cost: 'low',
    bestFor: ['Khối lượng lớn', 'Tác vụ đơn giản'],
    provider: 'lovable',
  },
  // Perplexity Search
  'sonar-pro': {
    shortName: 'Sonar Pro',
    description: 'Web search chuyên sâu',
    speed: 'medium',
    quality: 'premium',
    cost: 'medium',
    bestFor: ['Research', 'Trending topics'],
    provider: 'lovable',
  },
  'sonar': {
    shortName: 'Sonar',
    description: 'Web search nhanh',
    speed: 'fast',
    quality: 'high',
    cost: 'low',
    bestFor: ['Quick search', 'Topic ideas'],
    provider: 'lovable',
  },
  // Image generation
  'gemini-2.0-flash-exp-image-generation': {
    shortName: 'Gemini 2.0 Image',
    description: 'Tạo hình ảnh trực tiếp',
    speed: 'fast',
    quality: 'high',
    cost: 'low',
    bestFor: ['Carousel images', 'Quick visuals'],
    provider: 'lovable',
  },
  // OpenRouter Models
  'anthropic/claude-sonnet-4-20250514': {
    shortName: 'Claude Sonnet 4',
    description: 'Flagship mới nhất của Anthropic',
    speed: 'medium',
    quality: 'premium',
    cost: 'high',
    bestFor: ['Viết sáng tạo', 'An toàn'],
    provider: 'openrouter',
  },
  'anthropic/claude-3.5-sonnet': {
    shortName: 'Claude 3.5 Sonnet',
    description: 'Cân bằng xuất sắc',
    speed: 'medium',
    quality: 'premium',
    cost: 'medium',
    bestFor: ['Viết sáng tạo', 'Coding'],
    provider: 'openrouter',
  },
  'openai/gpt-4o': {
    shortName: 'GPT-4o',
    description: 'GPT-4 tối ưu đa phương tiện',
    speed: 'fast',
    quality: 'premium',
    cost: 'medium',
    bestFor: ['Vision', 'Đa phương tiện'],
    provider: 'openrouter',
  },
  'openai/gpt-4-turbo': {
    shortName: 'GPT-4 Turbo',
    description: 'GPT-4 nhanh hơn',
    speed: 'medium',
    quality: 'premium',
    cost: 'high',
    bestFor: ['Tác vụ phức tạp', 'Long context'],
    provider: 'openrouter',
  },
  'meta-llama/llama-3.3-70b-instruct': {
    shortName: 'Llama 3.3 70B',
    description: 'Open source mạnh mẽ',
    speed: 'medium',
    quality: 'high',
    cost: 'low',
    bestFor: ['Chi phí thấp', 'Đa năng'],
    provider: 'openrouter',
  },
  'mistralai/mistral-large': {
    shortName: 'Mistral Large',
    description: 'Flagship của Mistral',
    speed: 'medium',
    quality: 'premium',
    cost: 'medium',
    bestFor: ['Đa ngôn ngữ', 'Reasoning'],
    provider: 'openrouter',
  },
  'google/gemini-pro-1.5': {
    shortName: 'Gemini Pro 1.5',
    description: 'Context siêu dài (1M tokens)',
    speed: 'medium',
    quality: 'premium',
    cost: 'medium',
    bestFor: ['Documents dài', 'Analysis'],
    provider: 'openrouter',
  },
  'deepseek/deepseek-chat': {
    shortName: 'DeepSeek Chat',
    description: 'Chi phí cực thấp, chất lượng tốt',
    speed: 'fast',
    quality: 'high',
    cost: 'low',
    bestFor: ['Chi phí thấp', 'Chat'],
    provider: 'openrouter',
  },
  'qwen/qwen-2.5-72b-instruct': {
    shortName: 'Qwen 2.5 72B',
    description: 'Mạnh với tiếng Việt',
    speed: 'medium',
    quality: 'high',
    cost: 'low',
    bestFor: ['Tiếng Việt', 'Coding'],
    provider: 'openrouter',
  },
};

// Lovable AI model prefixes - models that are served through Lovable AI gateway
export const LOVABLE_MODEL_PREFIXES = [
  'google/gemini-2.5',
  'google/gemini-3',
  'openai/gpt-5',
  'sonar',
];

export const LOVABLE_EXACT_MODELS = [
  'gemini-2.0-flash-exp-image-generation',
];

// Check if a model is a Lovable AI model
export const isLovableAIModel = (modelId: string): boolean => {
  if (LOVABLE_EXACT_MODELS.includes(modelId)) return true;
  return LOVABLE_MODEL_PREFIXES.some(prefix => modelId.startsWith(prefix));
};

// Helper to extract readable name from model ID
const extractShortName = (modelId: string): string => {
  const parts = modelId.split('/');
  if (parts.length === 2) {
    // "anthropic/claude-sonnet-4" -> "Claude Sonnet 4"
    return parts[1]
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  return modelId;
};

// Helper function to get model info with fallback
export const getModelInfo = (modelId: string): ModelInfo => {
  // First check if we have hardcoded info
  if (MODEL_INFO[modelId]) {
    return MODEL_INFO[modelId];
  }
  
  // Determine provider: Lovable AI models vs OpenRouter
  const isLovableModel = isLovableAIModel(modelId);
    
  return {
    shortName: extractShortName(modelId),
    description: isLovableModel ? 'Lovable AI model' : 'OpenRouter model',
    speed: 'medium' as ModelSpeed,
    quality: 'standard' as ModelQuality,
    cost: 'medium' as ModelCost,
    bestFor: [],
    provider: isLovableModel ? 'lovable' : 'openrouter',
  };
};

// Known AI providers
export const AI_PROVIDERS = [
  { type: 'lovable', name: 'Lovable AI', description: 'Built-in AI (không cần API key)', hasKey: false },
  { type: 'openrouter', name: 'OpenRouter', description: '200+ models (Claude, GPT, Llama, Mistral...)', hasKey: true },
  { type: 'perplexity', name: 'Perplexity', description: 'Web search & research', hasKey: true, secretName: 'PERPLEXITY_API_KEY' },
  { type: 'firecrawl', name: 'Firecrawl', description: 'Web scraping & trends', hasKey: true, secretName: 'FIRECRAWL_API_KEY' },
  { type: 'openai', name: 'OpenAI', description: 'GPT-4, DALL-E', hasKey: true },
  { type: 'anthropic', name: 'Anthropic', description: 'Claude models', hasKey: true },
  { type: 'gemini', name: 'Google Gemini', description: 'Gemini Pro, Flash', hasKey: true },
  { type: 'replicate', name: 'Replicate', description: 'Flux, SDXL', hasKey: true },
  { type: 'custom', name: 'Custom API', description: 'OpenAI-compatible endpoints', hasKey: true },
] as const;

// Models by provider (legacy, kept for backward compatibility)
export const MODELS_BY_PROVIDER: Record<string, string[]> = {
  lovable: [
    'google/gemini-2.5-pro',
    'google/gemini-3-pro-preview',
    'google/gemini-2.5-flash',
    'google/gemini-2.5-flash-lite',
    'google/gemini-3-pro-image-preview',
    'openai/gpt-5',
    'openai/gpt-5-mini',
    'openai/gpt-5-nano',
  ],
  openrouter: [
    'anthropic/claude-sonnet-4-20250514',
    'anthropic/claude-3.5-sonnet',
    'openai/gpt-4o',
    'openai/gpt-4-turbo',
    'meta-llama/llama-3.3-70b-instruct',
    'mistralai/mistral-large',
    'google/gemini-pro-1.5',
    'deepseek/deepseek-chat',
    'qwen/qwen-2.5-72b-instruct',
  ],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'dall-e-3', 'gpt-image-1'],
  anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-opus', 'claude-3-haiku'],
  gemini: ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  replicate: ['black-forest-labs/flux-schnell', 'stability-ai/sdxl'],
  perplexity: ['sonar-pro', 'sonar'],
  custom: [],
};

export function useAIConfig(organizationId?: string) {
  const queryClient = useQueryClient();

  // Fetch provider configs
  const providersQuery = useQuery({
    queryKey: ['ai-provider-configs', organizationId],
    queryFn: async (): Promise<AIProviderConfig[]> => {
      let query = supabase.from('ai_provider_configs').select('*');
      
      if (organizationId) {
        // Fetch org-specific OR global providers (organization_id is null)
        query = query.or(`organization_id.eq.${organizationId},organization_id.is.null`);
      }
      // If no organizationId, fetch all providers (for admins)
      
      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map(p => ({
        id: p.id,
        organizationId: p.organization_id,
        providerType: p.provider_type,
        displayName: p.display_name,
        isActive: p.is_active ?? true,
        apiKeySecretName: p.api_key_secret_name,
        baseUrl: p.base_url,
        defaultModel: p.default_model,
        config: (p.config as Record<string, any>) || {},
        encryptedApiKey: p.encrypted_api_key ?? null,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      }));
    },
    enabled: true, // Always fetch - RLS will handle permissions
  });

  // Fetch function configs
  const functionsQuery = useQuery({
    queryKey: ['ai-function-configs', organizationId],
    queryFn: async (): Promise<AIFunctionConfig[]> => {
      let query = supabase.from('ai_function_configs').select('*');
      
      if (organizationId) {
        // Org-specific configs OR global configs (organization_id is null)
        query = query.or(`organization_id.eq.${organizationId},organization_id.is.null`);
      } else {
        // Admin mode: only get global configs
        query = query.is('organization_id', null);
      }
      
      // Order by updated_at DESC to get latest first
      query = query.order('updated_at', { ascending: false });
      
      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map(f => ({
        id: f.id,
        organizationId: f.organization_id,
        functionName: f.function_name,
        providerConfigId: f.provider_config_id,
        modelOverride: f.model_override,
        parameters: (f.parameters as Record<string, any>) || {},
        isEnabled: f.is_enabled ?? true,
        cacheTtlHours: f.cache_ttl_hours ?? 24,
        priorityLevel: f.priority_level ?? 'normal',
        temperature: (f as any).temperature ?? null,
        maxTokens: (f as any).max_tokens ?? null,
        customSystemPrompt: (f as any).custom_system_prompt ?? null,
        createdAt: f.created_at,
        updatedAt: f.updated_at,
      }));
    },
    enabled: true, // Always enabled for admin access
  });

  // Upsert provider config
  const upsertProviderMutation = useMutation({
    mutationFn: async (config: Partial<AIProviderConfig> & { providerType: string }) => {
      const payload: Record<string, any> = {
        organization_id: organizationId,
        provider_type: config.providerType,
        display_name: config.displayName || config.providerType,
        is_active: config.isActive ?? true,
        api_key_secret_name: config.apiKeySecretName,
        base_url: config.baseUrl,
        default_model: config.defaultModel,
        config: config.config || {},
      };
      
      // Add encrypted API key if provided
      if (config.encryptedApiKey) {
        payload.encrypted_api_key = config.encryptedApiKey;
      }

      if (config.id) {
        const { data, error } = await supabase
          .from('ai_provider_configs')
          .update(payload)
          .eq('id', config.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('ai_provider_configs')
          .insert(payload as any)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-provider-configs'] });
      toast.success('Đã lưu cấu hình provider');
    },
    onError: (error) => {
      toast.error('Lỗi lưu cấu hình: ' + error.message);
    },
  });

  // Upsert function config
  const upsertFunctionMutation = useMutation({
    mutationFn: async (config: Partial<AIFunctionConfig> & { functionName: string }) => {
      const payload: Record<string, any> = {
        organization_id: organizationId ?? null,
        function_name: config.functionName,
        provider_config_id: config.providerConfigId,
        model_override: config.modelOverride,
        parameters: config.parameters || {},
        is_enabled: config.isEnabled ?? true,
        cache_ttl_hours: config.cacheTtlHours ?? 24,
        priority_level: config.priorityLevel ?? 'normal',
        temperature: config.temperature ?? null,
        max_tokens: config.maxTokens ?? null,
        custom_system_prompt: config.customSystemPrompt ?? null,
      };

      // Check if record exists for this function_name + organization_id
      let existingQuery = supabase
        .from('ai_function_configs')
        .select('id')
        .eq('function_name', config.functionName);
        
      if (organizationId) {
        existingQuery = existingQuery.eq('organization_id', organizationId);
      } else {
        existingQuery = existingQuery.is('organization_id', null);
      }
      
      const { data: existing } = await existingQuery.maybeSingle();

      if (config.id || existing?.id) {
        // UPDATE existing record
        const { data, error } = await supabase
          .from('ai_function_configs')
          .update(payload)
          .eq('id', config.id || existing!.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        // INSERT new record
        const { data, error } = await supabase
          .from('ai_function_configs')
          .insert(payload as any)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-function-configs'] });
      toast.success('Đã lưu cấu hình function');
    },
    onError: (error) => {
      toast.error('Lỗi lưu cấu hình: ' + error.message);
    },
  });

  // Delete provider
  const deleteProviderMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ai_provider_configs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-provider-configs'] });
      toast.success('Đã xóa provider');
    },
  });

  return {
    providers: providersQuery.data || [],
    functions: functionsQuery.data || [],
    isLoading: providersQuery.isLoading || functionsQuery.isLoading,
    upsertProvider: upsertProviderMutation.mutateAsync,
    upsertFunction: upsertFunctionMutation.mutate,
    deleteProvider: deleteProviderMutation.mutate,
    refetch: () => {
      providersQuery.refetch();
      functionsQuery.refetch();
    },
  };
}

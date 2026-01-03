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
  { name: 'recommend-topics', description: 'Gợi ý topics', category: 'ideation', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'discover-trending-topics', description: 'Khám phá trends', category: 'research', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'generate-journey-messaging', description: 'Tạo messaging theo journey', category: 'content', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'generate-sample-text', description: 'Tạo text mẫu', category: 'content', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'generate-brand-voice', description: 'Tạo brand voice', category: 'brand', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'generate-brand-guideline', description: 'Tạo brand guideline', category: 'brand', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'regenerate-channel', description: 'Tái tạo nội dung kênh', category: 'content', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'analyze-topic-gaps', description: 'Phân tích topic gaps', category: 'analysis', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'generate-storyboard', description: 'Tạo storyboard', category: 'content', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'chat-conversations', description: 'Summarize conversations', category: 'chat', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash-lite' },
  { name: 'ai-edit-channel', description: 'AI edit cho kênh', category: 'content', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'critique-content', description: 'Đánh giá nội dung', category: 'analysis', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash-lite' },
  { name: 'refine-content', description: 'Tinh chỉnh nội dung', category: 'content', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  
  // Image Generation Functions  
  { name: 'generate-brand-image', description: 'Tạo hình ảnh thương hiệu', category: 'image', type: 'image' as AIFunctionType, currentModel: 'google/gemini-3-pro-image-preview' },
  { name: 'generate-social-image', description: 'Tạo hình ảnh social', category: 'image', type: 'image' as AIFunctionType, currentModel: 'google/gemini-3-pro-image-preview' },
  { name: 'overlay-brand-logo', description: 'Overlay logo', category: 'image', type: 'image' as AIFunctionType, currentModel: 'google/gemini-3-pro-image-preview' },
  { name: 'generate-carousel-image', description: 'Tạo hình carousel', category: 'image', type: 'image-direct' as AIFunctionType, currentModel: 'gemini-2.0-flash-exp-image-generation' },
  
  // Web Search Functions (Perplexity)
  { name: 'generate-topic-suggestions', description: 'Đề xuất chủ đề (web search)', category: 'ideation', type: 'search' as AIFunctionType, currentModel: 'sonar' },
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
        query = query.eq('organization_id', organizationId);
      }
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
    enabled: !!organizationId,
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
        organization_id: organizationId,
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

      if (config.id) {
        const { data, error } = await supabase
          .from('ai_function_configs')
          .update(payload)
          .eq('id', config.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('ai_function_configs')
          .upsert(payload as any, { onConflict: 'organization_id,function_name' })
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

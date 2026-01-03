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
  createdAt: string;
  updatedAt: string;
}

// Known AI functions in the project
export const AI_FUNCTIONS = [
  { name: 'generate-multichannel', description: 'Tạo nội dung đa kênh', category: 'content' },
  { name: 'generate-script', description: 'Tạo kịch bản video', category: 'content' },
  { name: 'generate-carousel', description: 'Tạo carousel slides', category: 'content' },
  { name: 'generate-topic-suggestions', description: 'Đề xuất chủ đề', category: 'ideation' },
  { name: 'chat-topics', description: 'AI chat assistant', category: 'chat' },
  { name: 'analyze-script', description: 'Phân tích kịch bản', category: 'analysis' },
  { name: 'generate-hooks', description: 'Tạo hook hấp dẫn', category: 'content' },
  { name: 'recommend-topics', description: 'Gợi ý topics', category: 'ideation' },
  { name: 'discover-trending-topics', description: 'Khám phá trends', category: 'research' },
  { name: 'generate-journey-messaging', description: 'Tạo messaging theo journey', category: 'content' },
  { name: 'generate-sample-text', description: 'Tạo text mẫu', category: 'content' },
  { name: 'generate-brand-voice', description: 'Tạo brand voice', category: 'brand' },
  { name: 'generate-brand-guideline', description: 'Tạo brand guideline', category: 'brand' },
  { name: 'generate-brand-image', description: 'Tạo hình ảnh thương hiệu', category: 'image' },
  { name: 'ai-edit-channel', description: 'Chỉnh sửa AI cho kênh', category: 'content' },
  { name: 'regenerate-channel', description: 'Tái tạo nội dung kênh', category: 'content' },
  { name: 'critique-content', description: 'Đánh giá nội dung', category: 'analysis' },
  { name: 'refine-content', description: 'Tinh chỉnh nội dung', category: 'content' },
] as const;

// Known AI providers
export const AI_PROVIDERS = [
  { type: 'lovable', name: 'Lovable AI', description: 'Built-in AI (không cần API key)', hasKey: false },
  { type: 'perplexity', name: 'Perplexity', description: 'Web search & research', hasKey: true, secretName: 'PERPLEXITY_API_KEY' },
  { type: 'firecrawl', name: 'Firecrawl', description: 'Web scraping & trends', hasKey: true, secretName: 'FIRECRAWL_API_KEY' },
  { type: 'openai', name: 'OpenAI', description: 'GPT-4, DALL-E', hasKey: true },
  { type: 'anthropic', name: 'Anthropic', description: 'Claude models', hasKey: true },
  { type: 'gemini', name: 'Google Gemini', description: 'Gemini Pro, Flash', hasKey: true },
  { type: 'replicate', name: 'Replicate', description: 'Flux, SDXL', hasKey: true },
  { type: 'custom', name: 'Custom API', description: 'OpenAI-compatible endpoints', hasKey: true },
] as const;

// Models by provider
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
        query = query.eq('organization_id', organizationId);
      }
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
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      }));
    },
    enabled: !!organizationId,
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
        createdAt: f.created_at,
        updatedAt: f.updated_at,
      }));
    },
    enabled: !!organizationId,
  });

  // Upsert provider config
  const upsertProviderMutation = useMutation({
    mutationFn: async (config: Partial<AIProviderConfig> & { providerType: string }) => {
      const payload = {
        organization_id: organizationId,
        provider_type: config.providerType,
        display_name: config.displayName || config.providerType,
        is_active: config.isActive ?? true,
        api_key_secret_name: config.apiKeySecretName,
        base_url: config.baseUrl,
        default_model: config.defaultModel,
        config: config.config || {},
      };

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
          .insert(payload)
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
      const payload = {
        organization_id: organizationId,
        function_name: config.functionName,
        provider_config_id: config.providerConfigId,
        model_override: config.modelOverride,
        parameters: config.parameters || {},
        is_enabled: config.isEnabled ?? true,
        cache_ttl_hours: config.cacheTtlHours ?? 24,
        priority_level: config.priorityLevel ?? 'normal',
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
          .upsert(payload, { onConflict: 'organization_id,function_name' })
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
    upsertProvider: upsertProviderMutation.mutate,
    upsertFunction: upsertFunctionMutation.mutate,
    deleteProvider: deleteProviderMutation.mutate,
    refetch: () => {
      providersQuery.refetch();
      functionsQuery.refetch();
    },
  };
}

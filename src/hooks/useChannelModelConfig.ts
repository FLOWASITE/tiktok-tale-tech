import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type QualityMode = 'fast' | 'balanced' | 'quality';
export type PromptStyle = 'default' | 'concise' | 'detailed' | 'creative' | 'analytical';
export type HookIntensity = 'soft' | 'medium' | 'strong' | 'viral';
export type CostPriority = 'economy' | 'balanced' | 'quality';

export interface ChannelModelConfig {
  id: string;
  organizationId: string | null;
  channel: string;
  modelOverride: string | null;
  temperature: number;
  maxTokens: number | null;
  isEnabled: boolean;
  priority: number;
  // New optimization fields
  qualityModeDefault: QualityMode | null;
  promptStyle: PromptStyle | null;
  hookIntensity: HookIntensity | null;
  costPriority: CostPriority | null;
  preferredHookTypes: string[] | null;
  allowUserOverride: boolean;
  forceProvider: string | null;
  createdAt: string;
  updatedAt: string;
}

// All supported channels
export const ALL_CHANNELS = [
  { id: 'facebook', name: 'Facebook', icon: 'facebook' },
  { id: 'instagram', name: 'Instagram', icon: 'instagram' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'linkedin' },
  { id: 'tiktok', name: 'TikTok', icon: 'tiktok' },
  { id: 'threads', name: 'Threads', icon: 'at-sign' },
  { id: 'youtube', name: 'YouTube', icon: 'youtube' },
  { id: 'twitter', name: 'Twitter/X', icon: 'twitter' },
  { id: 'website', name: 'Website', icon: 'globe' },
  { id: 'email', name: 'Email', icon: 'mail' },
  { id: 'zalo_oa', name: 'Zalo OA', icon: 'message-circle' },
  { id: 'telegram', name: 'Telegram', icon: 'send' },
  { id: 'google_maps', name: 'Google Maps', icon: 'map-pin' },
] as const;

export type ChannelId = typeof ALL_CHANNELS[number]['id'];

export function useChannelModelConfig(organizationId?: string) {
  const queryClient = useQueryClient();

  // Fetch all channel model configs
  const configsQuery = useQuery({
    queryKey: ['channel-model-configs', organizationId],
    queryFn: async () => {
      let query = supabase
        .from('ai_channel_model_configs')
        .select('*');

      if (organizationId) {
        query = query.or(`organization_id.eq.${organizationId},organization_id.is.null`);
      } else {
        query = query.is('organization_id', null);
      }

      const { data, error } = await query.order('priority', { ascending: true });

      if (error) {
        console.error('Error fetching channel model configs:', error);
        throw error;
      }

      // Map to camelCase
      return (data || []).map((row: any) => ({
        id: row.id,
        organizationId: row.organization_id,
        channel: row.channel,
        modelOverride: row.model_override,
        temperature: row.temperature ?? 0.7,
        maxTokens: row.max_tokens,
        isEnabled: row.is_enabled ?? true,
        priority: row.priority ?? 0,
        qualityModeDefault: row.quality_mode_default,
        promptStyle: row.prompt_style,
        hookIntensity: row.hook_intensity,
        costPriority: row.cost_priority,
        preferredHookTypes: row.preferred_hook_types,
        allowUserOverride: row.allow_user_override ?? true,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })) as ChannelModelConfig[];
    },
    staleTime: 30000,
  });

  // Upsert channel config
  const upsertMutation = useMutation({
    mutationFn: async (config: Partial<ChannelModelConfig> & { channel: string }) => {
      let findQuery = supabase
        .from('ai_channel_model_configs')
        .select('id')
        .eq('channel', config.channel);

      if (organizationId) {
        findQuery = findQuery.eq('organization_id', organizationId);
      } else {
        findQuery = findQuery.is('organization_id', null);
      }

      const { data: existingData } = await findQuery.maybeSingle();

      const payload = {
        channel: config.channel,
        organization_id: organizationId || null,
        model_override: config.modelOverride,
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens,
        is_enabled: config.isEnabled ?? true,
        priority: config.priority ?? 0,
        quality_mode_default: config.qualityModeDefault,
        prompt_style: config.promptStyle,
        hook_intensity: config.hookIntensity,
        cost_priority: config.costPriority,
        preferred_hook_types: config.preferredHookTypes,
        allow_user_override: config.allowUserOverride ?? true,
      };

      if (existingData?.id) {
        // Update existing
        const { error } = await supabase
          .from('ai_channel_model_configs')
          .update(payload)
          .eq('id', existingData.id);
        
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('ai_channel_model_configs')
          .insert(payload);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-model-configs'] });
      toast.success('Đã lưu cấu hình channel');
    },
    onError: (error) => {
      console.error('Error saving channel config:', error);
      toast.error('Lỗi khi lưu cấu hình');
    },
  });

  // Delete channel config (reset to default)
  const deleteMutation = useMutation({
    mutationFn: async (channel: string) => {
      let query = supabase
        .from('ai_channel_model_configs')
        .delete()
        .eq('channel', channel);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      } else {
        query = query.is('organization_id', null);
      }

      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-model-configs'] });
      toast.success('Đã reset về mặc định');
    },
    onError: (error) => {
      console.error('Error deleting channel config:', error);
      toast.error('Lỗi khi xóa cấu hình');
    },
  });

  // Get config for a specific channel
  const getChannelConfig = (channel: string): ChannelModelConfig | undefined => {
    const configs = configsQuery.data || [];
    // Prioritize org-specific over global
    const orgConfig = configs.find(c => c.channel === channel && c.organizationId === organizationId);
    const globalConfig = configs.find(c => c.channel === channel && !c.organizationId);
    return orgConfig || globalConfig;
  };

  return {
    configs: configsQuery.data || [],
    isLoading: configsQuery.isLoading,
    error: configsQuery.error,
    upsertConfig: upsertMutation.mutate,
    deleteConfig: deleteMutation.mutate,
    getChannelConfig,
    isUpserting: upsertMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

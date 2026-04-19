import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AI_FUNCTIONS, AIFunctionType } from './useAIConfig';

export interface GroupModelConfig {
  id: string;
  organizationId: string | null;
  functionType: string;
  modelOverride: string | null;
  forceProvider: string | null;
  temperature: number | null;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export const FUNCTION_TYPE_GROUPS = [
  { id: 'text' as const, label: 'Text', description: 'Tất cả functions tạo & xử lý văn bản', icon: 'Type', color: 'blue' },
  { id: 'image' as const, label: 'Image', description: 'Tất cả functions tạo & chỉnh sửa hình ảnh', icon: 'Image', color: 'pink' },
  { id: 'video' as const, label: 'Video', description: 'Tất cả functions tạo video (Veo, Sora, Kling...)', icon: 'Video', color: 'purple' },
  { id: 'audio' as const, label: 'Audio', description: 'Tất cả functions tạo nhạc/giọng đọc', icon: 'Music', color: 'orange' },
  { id: 'search' as const, label: 'Search', description: 'Tất cả functions tìm kiếm & research', icon: 'Globe', color: 'green' },
] as const;

export type FunctionTypeGroup = typeof FUNCTION_TYPE_GROUPS[number]['id'];

function mapRow(row: any): GroupModelConfig {
  return {
    id: row.id,
    organizationId: row.organization_id,
    functionType: row.function_type,
    modelOverride: row.model_override,
    forceProvider: row.force_provider,
    temperature: row.temperature,
    isEnabled: row.is_enabled ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Count functions per type that DON'T have individual overrides */
export function countAffectedFunctions(
  functionType: string,
  individualConfigs: Map<string, { modelOverride: string | null }>
): { total: number; affected: number } {
  const fns = AI_FUNCTIONS.filter(f => {
    if (functionType === 'image') return f.type === 'image' || f.type === 'image-direct';
    return f.type === functionType;
  });
  const total = fns.length;
  const affected = fns.filter(f => !individualConfigs.get(f.name)?.modelOverride).length;
  return { total, affected };
}

export function useGroupModelConfig(organizationId?: string) {
  const queryClient = useQueryClient();

  const configsQuery = useQuery({
    queryKey: ['ai-function-group-configs', organizationId],
    queryFn: async () => {
      let query = supabase.from('ai_function_group_configs').select('*');
      if (organizationId) {
        query = query.or(`organization_id.eq.${organizationId},organization_id.is.null`);
      } else {
        query = query.is('organization_id', null);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(mapRow);
    },
    staleTime: 30000,
  });

  const upsertMutation = useMutation({
    mutationFn: async (config: { functionType: string; modelOverride: string | null; forceProvider?: string | null; temperature?: number | null }) => {
      let findQuery = supabase
        .from('ai_function_group_configs')
        .select('id')
        .eq('function_type', config.functionType);

      if (organizationId) {
        findQuery = findQuery.eq('organization_id', organizationId);
      } else {
        findQuery = findQuery.is('organization_id', null);
      }

      const { data: existing } = await findQuery.maybeSingle();

      const payload = {
        function_type: config.functionType,
        organization_id: organizationId || null,
        model_override: config.modelOverride,
        force_provider: config.forceProvider ?? null,
        temperature: config.temperature ?? null,
      };

      if (existing?.id) {
        const { error } = await supabase
          .from('ai_function_group_configs')
          .update(payload)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ai_function_group_configs')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-function-group-configs'] });
      toast.success('Đã lưu cấu hình group');
    },
    onError: (error) => {
      console.error('Error saving group config:', error);
      toast.error('Lỗi khi lưu cấu hình group');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (functionType: string) => {
      let query = supabase
        .from('ai_function_group_configs')
        .delete()
        .eq('function_type', functionType);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      } else {
        query = query.is('organization_id', null);
      }

      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-function-group-configs'] });
      toast.success('Đã reset group về mặc định');
    },
    onError: (error) => {
      console.error('Error deleting group config:', error);
      toast.error('Lỗi khi xóa cấu hình group');
    },
  });

  const getGroupConfig = (functionType: string): GroupModelConfig | undefined => {
    const configs = configsQuery.data || [];
    if (organizationId) {
      const orgConfig = configs.find(c => c.functionType === functionType && c.organizationId === organizationId);
      const globalConfig = configs.find(c => c.functionType === functionType && !c.organizationId);
      return orgConfig || globalConfig;
    }
    return configs.find(c => c.functionType === functionType);
  };

  /**
   * Get the effective model for a function, respecting priority:
   * 1. Individual function override
   * 2. Group type override
   * 3. Hardcoded default
   */
  const getEffectiveModel = (
    functionName: string,
    individualConfig?: { modelOverride: string | null } | null,
  ): { model: string; source: 'individual' | 'group' | 'default' } => {
    // Priority 1: Individual override
    if (individualConfig?.modelOverride) {
      return { model: individualConfig.modelOverride, source: 'individual' };
    }

    // Find function metadata
    const fnMeta = AI_FUNCTIONS.find(f => f.name === functionName);
    if (!fnMeta) return { model: '', source: 'default' };

    // Priority 2: Group override
    const fnType = fnMeta.type === 'image-direct' ? 'image' : fnMeta.type;
    const groupConfig = getGroupConfig(fnType);
    if (groupConfig?.modelOverride) {
      return { model: groupConfig.modelOverride, source: 'group' };
    }

    // Priority 3: Hardcoded default
    return { model: fnMeta.currentModel, source: 'default' };
  };

  return {
    groupConfigs: configsQuery.data || [],
    isLoading: configsQuery.isLoading,
    error: configsQuery.error,
    upsertGroupConfig: upsertMutation.mutate,
    deleteGroupConfig: deleteMutation.mutate,
    getGroupConfig,
    getEffectiveModel,
    isUpserting: upsertMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

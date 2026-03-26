import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AgentPipelineStage } from '@/types/agent';

export interface AgentModelConfig {
  id: string;
  organizationId: string | null;
  agentName: string;
  modelOverride: string | null;
  temperature: number;
  maxTokens: number | null;
  isEnabled: boolean;
  qualityMode: string | null;
  fallbackModel: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export const ALL_AGENTS: {
  id: AgentPipelineStage;
  label: string;
  description: string;
  icon: string;
  defaultModel: string;
  recommendedModels: string[];
}[] = [
  {
    id: 'strategy',
    label: 'Strategy Agent',
    description: 'Phân tích intent, đề xuất chủ đề và lập lịch nội dung',
    icon: 'Lightbulb',
    defaultModel: 'google/gemini-2.5-flash',
    recommendedModels: ['google/gemini-2.5-flash', 'google/gemini-2.5-pro', 'openai/gpt-5-mini', 'qwen-plus'],
  },
  {
    id: 'create',
    label: 'Creator Agent',
    description: 'Tạo nội dung multichannel, carousel, video script',
    icon: 'PenTool',
    defaultModel: 'google/gemini-2.5-pro',
    recommendedModels: ['google/gemini-2.5-pro', 'openai/gpt-5', 'google/gemini-2.5-flash', 'qwen-max'],
  },
  {
    id: 'quality',
    label: 'Quality Agent',
    description: 'Kiểm tra GEO, Compliance và Persona-fit',
    icon: 'ShieldCheck',
    defaultModel: 'google/gemini-2.5-flash',
    recommendedModels: ['google/gemini-2.5-flash', 'openai/gpt-5-mini', 'google/gemini-2.5-pro'],
  },
  {
    id: 'approval',
    label: 'Approval Agent',
    description: 'Xử lý duyệt tự động hoặc chờ human review',
    icon: 'UserCheck',
    defaultModel: 'google/gemini-2.5-flash-lite',
    recommendedModels: ['google/gemini-2.5-flash-lite', 'google/gemini-2.5-flash'],
  },
  {
    id: 'publish',
    label: 'Publisher Agent',
    description: 'Đăng bài lên các kênh social media',
    icon: 'Send',
    defaultModel: 'google/gemini-2.5-flash-lite',
    recommendedModels: ['google/gemini-2.5-flash-lite', 'google/gemini-2.5-flash'],
  },
  {
    id: 'analyze',
    label: 'Analyze Agent',
    description: 'Phân tích hiệu quả và cập nhật tiến độ',
    icon: 'BarChart3',
    defaultModel: 'google/gemini-2.5-flash',
    recommendedModels: ['google/gemini-2.5-flash', 'google/gemini-2.5-pro', 'qwen-plus'],
  },
];

function mapRow(row: any): AgentModelConfig {
  return {
    id: row.id,
    organizationId: row.organization_id,
    agentName: row.agent_name,
    modelOverride: row.model_override,
    temperature: row.temperature ?? 0.7,
    maxTokens: row.max_tokens,
    isEnabled: row.is_enabled ?? true,
    qualityMode: row.quality_mode,
    fallbackModel: row.fallback_model,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function useAgentModelConfig(organizationId?: string) {
  const queryClient = useQueryClient();

  const configsQuery = useQuery({
    queryKey: ['agent-model-configs', organizationId],
    queryFn: async () => {
      let query = supabase.from('ai_agent_model_configs').select('*');
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      } else {
        query = query.is('organization_id', null);
      }
      const { data, error } = await query.order('agent_name');
      if (error) throw error;
      return (data || []).map(mapRow);
    },
    staleTime: 30000,
  });

  const upsertMutation = useMutation({
    mutationFn: async (config: Partial<AgentModelConfig> & { agentName: string }) => {
      const findQuery = supabase
        .from('ai_agent_model_configs')
        .select('id')
        .eq('agent_name', config.agentName);

      const finalQuery = organizationId
        ? findQuery.eq('organization_id', organizationId)
        : findQuery.is('organization_id', null);

      const { data: existing } = await finalQuery.maybeSingle();

      const payload = {
        agent_name: config.agentName,
        organization_id: organizationId || null,
        model_override: config.modelOverride,
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens,
        is_enabled: config.isEnabled ?? true,
        quality_mode: config.qualityMode ?? 'balanced',
        fallback_model: config.fallbackModel,
        notes: config.notes,
      };

      if (existing?.id) {
        const { error } = await supabase
          .from('ai_agent_model_configs')
          .update(payload)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ai_agent_model_configs')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-model-configs'] });
      toast.success('Đã lưu cấu hình agent');
    },
    onError: (error) => {
      console.error('Error saving agent config:', error);
      toast.error('Lỗi khi lưu cấu hình');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (agentName: string) => {
      const query = supabase
        .from('ai_agent_model_configs')
        .delete()
        .eq('agent_name', agentName);

      const finalQuery = organizationId
        ? query.eq('organization_id', organizationId)
        : query.is('organization_id', null);

      const { error } = await finalQuery;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-model-configs'] });
      toast.success('Đã reset về mặc định');
    },
    onError: (error) => {
      console.error('Error deleting agent config:', error);
      toast.error('Lỗi khi xóa cấu hình');
    },
  });

  const getAgentConfig = (agentName: string): AgentModelConfig | undefined => {
    return (configsQuery.data || []).find(c => c.agentName === agentName);
  };

  return {
    configs: configsQuery.data || [],
    isLoading: configsQuery.isLoading,
    error: configsQuery.error,
    upsertConfig: upsertMutation.mutate,
    deleteConfig: deleteMutation.mutate,
    getAgentConfig,
    isUpserting: upsertMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SuggestStrategyInput {
  title?: string;
  description?: string;
  objectives: string[];
  target_channels: string[];
  campaign_duration_days?: number;
  brand_template_id?: string;
  organization_id?: string;
}

export interface SuggestStrategyResult {
  key_messages: string[];
  primary_cta: string;
  budget_allocation: { content: number; ads: number; kol: number };
  pillar_allocation: Record<string, number>;
  total_posts_target: number;
  reasoning: string;
}

export function useSuggestStrategy() {
  return useMutation<SuggestStrategyResult, Error, SuggestStrategyInput>({
    mutationFn: async (input) => {
      const { data, error } = await supabase.functions.invoke('suggest-strategy', {
        body: input,
      });
      if (error) throw new Error(error.message || 'AI gợi ý chiến lược thất bại');
      if (data?.error) throw new Error(data.error);
      return data as SuggestStrategyResult;
    },
  });
}

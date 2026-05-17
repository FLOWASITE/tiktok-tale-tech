import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SuggestChannelsInput {
  title?: string;
  description?: string;
  objectives?: string[];
  brand_template_id?: string;
  brand_name?: string;
  industry?: string;
  organization_id?: string;
}

export interface SuggestedChannel {
  id: string;
  frequency: string; // 'daily' | '3/week' | '2/week' | 'weekly'
  reason?: string;
}

export interface SuggestChannelsResult {
  channels: SuggestedChannel[];
  reasoning: string;
}

export function useSuggestChannels() {
  return useMutation<SuggestChannelsResult, Error, SuggestChannelsInput>({
    mutationFn: async (input) => {
      const { data, error } = await supabase.functions.invoke('suggest-channels', {
        body: input,
      });
      if (error) throw new Error(error.message || 'AI gợi ý kênh thất bại');
      if (data?.error) throw new Error(data.error);
      return data as SuggestChannelsResult;
    },
  });
}

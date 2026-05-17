import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SuggestObjectivesInput {
  title?: string;
  description?: string;
  channels?: string[];
  brand_template_id?: string;
  brand_name?: string;
  industry?: string;
  organization_id?: string;
}

export interface SuggestObjectivesResult {
  primary: string;
  secondary: string[];
  objectives: string[]; // [primary, ...secondary]
  kpis: Record<string, number>;
  reasoning: string;
}

export function useSuggestObjectives() {
  return useMutation<SuggestObjectivesResult, Error, SuggestObjectivesInput>({
    mutationFn: async (input) => {
      const { data, error } = await supabase.functions.invoke('suggest-objectives', {
        body: input,
      });
      if (error) throw new Error(error.message || 'AI gợi ý thất bại');
      if (data?.error) throw new Error(data.error);
      return data as SuggestObjectivesResult;
    },
  });
}

import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CampaignContentPiece } from '@/types/agent';

export interface PieceTopicSuggestion {
  title: string;
  hook: string;
  key_message: string;
}

export interface SuggestPieceTopicsInput {
  piece: Partial<CampaignContentPiece> & {
    angle: string;
    content_role: string;
    target_channel: string;
    title?: string;
    key_message?: string;
    pillar?: string;
  };
  brand_template_id?: string;
  organization_id?: string;
  campaign_title?: string;
  existing_titles?: string[];
  clarification_context?: Record<string, unknown>;
}

export function useSuggestPieceTopics() {
  return useMutation<{ suggestions: PieceTopicSuggestion[] }, Error, SuggestPieceTopicsInput>({
    mutationFn: async (input) => {
      const { data, error } = await supabase.functions.invoke('suggest-piece-topics', {
        body: input,
      });
      if (error) {
        // Edge function returns body even with non-2xx; bubble up message
        const msg = (data as any)?.error || error.message || 'AI gợi ý chủ đề thất bại';
        throw new Error(msg);
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { suggestions: PieceTopicSuggestion[] };
    },
  });
}

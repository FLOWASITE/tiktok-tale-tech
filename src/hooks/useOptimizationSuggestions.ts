import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import type { OptimizationSuggestion, SuggestionStatus } from '@/types/creativeScore';

interface GenerateSuggestionsParams {
  variationId: string;
  headline?: string;
  primaryText?: string;
  description?: string;
  ctaButton?: string;
  platform?: string;
  objective?: string;
  optimizationGoal?: 'ctr' | 'conversion' | 'engagement';
}

interface SuggestionResponse {
  suggestions: Array<{
    field: 'headline' | 'primary_text' | 'description' | 'cta';
    original: string;
    suggested: string;
    predicted_improvement: number;
    improvement_metric: string;
    confidence: 'low' | 'medium' | 'high';
    reason: string;
    technique: string;
  }>;
}

export function useOptimizationSuggestions(variationId?: string) {
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();

  // Fetch suggestions for a variation
  const { data: suggestions, isLoading, error } = useQuery({
    queryKey: ['optimization-suggestions', variationId],
    queryFn: async () => {
      if (!variationId) return [];
      
      const { data, error } = await supabase
        .from('ad_copy_optimization_suggestions')
        .select('*')
        .eq('variation_id', variationId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as OptimizationSuggestion[];
    },
    enabled: !!variationId,
  });

  // Generate new suggestions using AI
  const generateSuggestions = useMutation({
    mutationFn: async (params: GenerateSuggestionsParams) => {
      const { data, error } = await supabase.functions.invoke('optimize-ad-copy', {
        body: params,
      });
      
      if (error) throw error;
      
      const response = data as SuggestionResponse;
      
      // Save suggestions to database
      const suggestionsToInsert = response.suggestions.map(s => ({
        variation_id: params.variationId,
        field: s.field,
        original_text: s.original,
        suggested_text: s.suggested,
        predicted_improvement: s.predicted_improvement,
        improvement_metric: s.improvement_metric,
        confidence: s.confidence,
        reason: s.reason,
        technique: s.technique,
        status: 'pending' as SuggestionStatus,
        organization_id: currentOrganization?.id,
      }));
      
      if (suggestionsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('ad_copy_optimization_suggestions')
          .insert(suggestionsToInsert);
        
        if (insertError) throw insertError;
      }
      
      return response.suggestions;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['optimization-suggestions', variables.variationId] });
    },
  });

  // Update suggestion status
  const updateStatus = useMutation({
    mutationFn: async ({ suggestionId, status }: { suggestionId: string; status: SuggestionStatus }) => {
      const updateData: { status: SuggestionStatus; applied_at?: string } = { status };
      if (status === 'applied') {
        updateData.applied_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('ad_copy_optimization_suggestions')
        .update(updateData)
        .eq('id', suggestionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['optimization-suggestions', variationId] });
    },
  });

  // Apply suggestion to variation
  const applySuggestion = useMutation({
    mutationFn: async (suggestion: OptimizationSuggestion) => {
      // Map field to database column
      const fieldMap: Record<string, string> = {
        headline: 'headline',
        primary_text: 'primary_text',
        description: 'description',
        cta: 'cta_button',
      };
      
      const dbField = fieldMap[suggestion.field];
      if (!dbField) throw new Error('Invalid field');
      
      // Update the variation
      const { error: updateError } = await supabase
        .from('ad_copy_variations')
        .update({ [dbField]: suggestion.suggested_text })
        .eq('id', suggestion.variation_id);
      
      if (updateError) throw updateError;
      
      // Mark suggestion as applied
      await updateStatus.mutateAsync({ suggestionId: suggestion.id, status: 'applied' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-copy'] });
    },
  });

  // Dismiss suggestion
  const dismissSuggestion = useMutation({
    mutationFn: async (suggestionId: string) => {
      await updateStatus.mutateAsync({ suggestionId, status: 'dismissed' });
    },
  });

  // Get pending suggestions count
  const pendingCount = suggestions?.filter(s => s.status === 'pending').length || 0;

  return {
    suggestions: suggestions || [],
    pendingCount,
    isLoading,
    error,
    generateSuggestions,
    applySuggestion,
    dismissSuggestion,
    updateStatus,
  };
}

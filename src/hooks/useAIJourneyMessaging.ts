import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { JourneyStage, JourneyStageMessagingFormData, JOURNEY_STAGES } from '@/types/journeyStageMessaging';

interface UseAIJourneyMessagingOptions {
  mappingId: string;
  productId: string;
  personaId: string;
  brandTemplateId?: string;
  organizationId?: string | null;
}

interface AIJourneyMessagingResult {
  journey_stage: JourneyStage;
  headline: string;
  hook: string;
  key_message: string;
  pain_points_focus: string[];
  benefits_highlight: string[];
  cta_template: string;
  emotional_tone: string;
  objection_response?: string;
  content_types: string[];
  avoid_messages?: string[];
}

export function useAIJourneyMessaging(options: UseAIJourneyMessagingOptions) {
  const [suggestions, setSuggestions] = useState<Record<JourneyStage, JourneyStageMessagingFormData> | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateMessaging = useCallback(async (targetStages?: JourneyStage[]) => {
    const { mappingId, productId, personaId, brandTemplateId, organizationId } = options;

    if (!mappingId || !productId || !personaId) {
      setError('Missing required IDs');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('generate-journey-messaging', {
        body: {
          mappingId,
          productId,
          personaId,
          brandTemplateId,
          organizationId,
          targetStages: targetStages || JOURNEY_STAGES,
        },
      });

      if (invokeError) {
        throw invokeError;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Transform API response to Record<JourneyStage, FormData>
      const stagesData = data?.data as AIJourneyMessagingResult[] || [];
      const result: Record<JourneyStage, JourneyStageMessagingFormData> = {
        awareness: createEmptyFormData(),
        consideration: createEmptyFormData(),
        decision: createEmptyFormData(),
        loyalty: createEmptyFormData(),
      };

      stagesData.forEach((stage) => {
        if (JOURNEY_STAGES.includes(stage.journey_stage)) {
          result[stage.journey_stage] = {
            headline: stage.headline || '',
            hook: stage.hook || '',
            key_message: stage.key_message || '',
            pain_points_focus: stage.pain_points_focus || [],
            benefits_highlight: stage.benefits_highlight || [],
            cta_template: stage.cta_template || '',
            emotional_tone: mapEmotionalTone(stage.emotional_tone),
            objection_response: stage.objection_response || '',
            content_types: stage.content_types || [],
            avoid_messages: stage.avoid_messages || [],
          };
        }
      });

      setSuggestions(result);
    } catch (err) {
      console.error('AI Journey Messaging error:', err);
      const message = err instanceof Error ? err.message : 'Không thể tạo gợi ý AI';
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  }, [options]);

  const clearSuggestions = useCallback(() => {
    setSuggestions(null);
    setError(null);
  }, []);

  return {
    suggestions,
    isGenerating,
    error,
    generateMessaging,
    clearSuggestions,
  };
}

function createEmptyFormData(): JourneyStageMessagingFormData {
  return {
    headline: '',
    hook: '',
    key_message: '',
    pain_points_focus: [],
    benefits_highlight: [],
    cta_template: '',
    emotional_tone: null,
    objection_response: '',
    content_types: [],
    avoid_messages: [],
  };
}

function mapEmotionalTone(tone: string | undefined): JourneyStageMessagingFormData['emotional_tone'] {
  const validTones = ['curiosity', 'urgency', 'trust', 'delight', 'empathy', 'authority'] as const;
  if (tone && validTones.includes(tone as any)) {
    return tone as JourneyStageMessagingFormData['emotional_tone'];
  }
  return null;
}

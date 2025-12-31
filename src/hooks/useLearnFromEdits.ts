import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

interface EditAnalysisResult {
  success: boolean;
  patternsDetected: number;
  patterns: Array<{
    category: string;
    editType: string;
    originalPattern: string;
    userPattern: string;
    confidence: number;
  }>;
  editPercentage: number;
  preferencesUpdated: boolean;
}

interface LearnFromEditsOptions {
  contentId?: string;
  contentType: 'script' | 'carousel' | 'multichannel' | 'topic';
  originalText: string;
  editedText: string;
  brandTemplateId?: string;
  editContext?: {
    section?: string;
    channel?: string;
  };
}

export function useLearnFromEdits() {
  const [isLearning, setIsLearning] = useState(false);
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();

  const learnFromEdit = useCallback(async (options: LearnFromEditsOptions): Promise<EditAnalysisResult | null> => {
    if (!user) return null;
    
    // Skip if texts are too similar or too short
    if (options.originalText.trim() === options.editedText.trim()) return null;
    if (options.originalText.length < 20 || options.editedText.length < 20) return null;

    setIsLearning(true);
    try {
      const { data, error } = await supabase.functions.invoke('learn-from-edits', {
        body: {
          contentId: options.contentId || crypto.randomUUID(),
          contentType: options.contentType,
          originalText: options.originalText,
          editedText: options.editedText,
          brandTemplateId: options.brandTemplateId,
          organizationId: currentOrganization?.id,
          editContext: options.editContext,
        },
      });

      if (error) {
        console.error('Error learning from edit:', error);
        return null;
      }

      return data as EditAnalysisResult;
    } catch (err) {
      console.error('Failed to learn from edit:', err);
      return null;
    } finally {
      setIsLearning(false);
    }
  }, [user, currentOrganization]);

  return {
    learnFromEdit,
    isLearning,
  };
}

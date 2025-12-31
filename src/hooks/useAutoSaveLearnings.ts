/**
 * Hook for auto-saving session learnings from chat conversations
 * Automatically extracts and persists learnings for cross-session memory
 */

import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SessionLearning {
  type: 'insight' | 'correction' | 'preference' | 'pattern' | 'warning';
  content: string;
  confidence: number;
  learnedAt: string;
  source?: string;
}

interface UserCorrection {
  original: string;
  corrected: string;
  correctionType: 'style' | 'fact' | 'tone' | 'length' | 'format';
  appliedAt: string;
}

interface SaveLearningsOptions {
  conversationId: string;
  learnings?: SessionLearning[];
  correction?: UserCorrection;
}

interface ExtractLearningsResult {
  learnings: SessionLearning[];
  extracted: number;
  autoSaved: boolean;
}

export function useAutoSaveLearnings() {
  const { toast } = useToast();
  const pendingExtractions = useRef<Set<string>>(new Set());
  const lastExtractionTime = useRef<Map<string, number>>(new Map());

  /**
   * Manually save learnings to a conversation
   */
  const saveLearnings = useCallback(async (options: SaveLearningsOptions): Promise<boolean> => {
    const { conversationId, learnings, correction } = options;

    if (!conversationId || (!learnings?.length && !correction)) {
      return false;
    }

    try {
      const { data, error } = await supabase.functions.invoke('chat-conversations', {
        body: {
          action: 'save_learnings',
          conversationId,
          learnings,
          correction,
        },
      });

      if (error) {
        console.error('Error saving learnings:', error);
        return false;
      }

      console.log('Learnings saved:', data);
      return true;
    } catch (err) {
      console.error('Failed to save learnings:', err);
      return false;
    }
  }, []);

  /**
   * Save a user correction (when user edits AI output)
   */
  const saveCorrection = useCallback(async (
    conversationId: string,
    original: string,
    corrected: string,
    correctionType: UserCorrection['correctionType'] = 'style'
  ): Promise<boolean> => {
    if (!conversationId || !original || !corrected) return false;

    // Skip if no significant change
    if (original.trim() === corrected.trim()) return false;

    const correction: UserCorrection = {
      original: original.slice(0, 200), // Limit size
      corrected: corrected.slice(0, 200),
      correctionType,
      appliedAt: new Date().toISOString(),
    };

    return saveLearnings({ conversationId, correction });
  }, [saveLearnings]);

  /**
   * Trigger AI-powered learning extraction
   * Debounced to avoid duplicate calls
   */
  const extractLearnings = useCallback(async (
    conversationId: string,
    showToast = false
  ): Promise<ExtractLearningsResult | null> => {
    if (!conversationId) return null;

    // Debounce: skip if extraction happened recently (within 30 seconds)
    const lastTime = lastExtractionTime.current.get(conversationId);
    if (lastTime && Date.now() - lastTime < 30000) {
      console.log('Skipping extraction - too recent');
      return null;
    }

    // Skip if already extracting
    if (pendingExtractions.current.has(conversationId)) {
      console.log('Skipping extraction - already in progress');
      return null;
    }

    pendingExtractions.current.add(conversationId);
    lastExtractionTime.current.set(conversationId, Date.now());

    try {
      const { data, error } = await supabase.functions.invoke('chat-conversations', {
        body: {
          action: 'extract_learnings',
          conversationId,
        },
      });

      if (error) {
        console.error('Error extracting learnings:', error);
        return null;
      }

      const result = data as ExtractLearningsResult;

      if (showToast && result.extracted > 0) {
        toast({
          title: '🧠 Đã học từ cuộc trò chuyện',
          description: `Ghi nhớ ${result.extracted} insight${result.extracted > 1 ? 's' : ''} cho lần sau`,
        });
      }

      console.log('Extracted learnings:', result);
      return result;
    } catch (err) {
      console.error('Failed to extract learnings:', err);
      return null;
    } finally {
      pendingExtractions.current.delete(conversationId);
    }
  }, [toast]);

  /**
   * Auto-extract learnings when conversation ends or after significant interaction
   * Call this when:
   * - User navigates away from chat
   * - Conversation has 6+ messages
   * - User explicitly ends conversation
   */
  const autoExtractOnIdle = useCallback(async (
    conversationId: string,
    messageCount: number
  ): Promise<void> => {
    // Only auto-extract if conversation has enough messages
    if (messageCount < 6) return;

    // Run extraction in background (don't await)
    extractLearnings(conversationId, true).catch(console.error);
  }, [extractLearnings]);

  /**
   * Quick learning from tool usage patterns
   */
  const learnFromToolUsage = useCallback(async (
    conversationId: string,
    toolName: string,
    wasSuccessful: boolean,
    userFeedback?: 'positive' | 'negative'
  ): Promise<void> => {
    if (!conversationId || !toolName) return;

    const learnings: SessionLearning[] = [];

    if (userFeedback === 'positive') {
      learnings.push({
        type: 'pattern',
        content: `User likes using ${toolName} tool for content generation`,
        confidence: 0.7,
        learnedAt: new Date().toISOString(),
        source: 'tool_feedback',
      });
    } else if (userFeedback === 'negative') {
      learnings.push({
        type: 'warning',
        content: `User had issues with ${toolName} tool - may need different approach`,
        confidence: 0.6,
        learnedAt: new Date().toISOString(),
        source: 'tool_feedback',
      });
    }

    if (learnings.length > 0) {
      await saveLearnings({ conversationId, learnings });
    }
  }, [saveLearnings]);

  return {
    saveLearnings,
    saveCorrection,
    extractLearnings,
    autoExtractOnIdle,
    learnFromToolUsage,
  };
}

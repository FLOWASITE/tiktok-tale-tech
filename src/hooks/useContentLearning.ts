/**
 * Hook for tracking and learning from user content edits
 * Phase 4: Learning from User Edits
 */

import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export type EditType = 'tone' | 'length' | 'cta' | 'hook' | 'structure' | 'emoji' | 'format' | 'other';

export interface EditDiff {
  addedWords?: string[];
  removedWords?: string[];
  lengthDelta?: number;
  emojiDelta?: number;
  ctaChanged?: boolean;
  hookChanged?: boolean;
}

export interface LearnFromEditOptions {
  channel: string;
  contentType?: 'multichannel' | 'script' | 'carousel';
  originalContent: string;
  editedContent: string;
  contentId?: string;
  brandTemplateId?: string;
}

export interface BrandPreference {
  channel: string;
  preferenceKey: string;
  preferenceValue: Record<string, any>;
  confidenceScore: number;
  sampleCount: number;
}

/**
 * Compute a simple diff between original and edited content
 */
function computeDiff(original: string, edited: string): EditDiff {
  const originalWords = original.split(/\s+/).filter(Boolean);
  const editedWords = edited.split(/\s+/).filter(Boolean);
  
  const originalSet = new Set(originalWords);
  const editedSet = new Set(editedWords);
  
  const addedWords = editedWords.filter(w => !originalSet.has(w));
  const removedWords = originalWords.filter(w => !editedSet.has(w));
  
  // Count emojis
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]/gu;
  const originalEmojis = (original.match(emojiRegex) || []).length;
  const editedEmojis = (edited.match(emojiRegex) || []).length;
  
  // Check if hook changed (first 50 chars)
  const hookChanged = original.slice(0, 50) !== edited.slice(0, 50);
  
  // Check if CTA changed (last 100 chars)
  const ctaChanged = original.slice(-100) !== edited.slice(-100);
  
  return {
    addedWords: addedWords.slice(0, 20), // Limit to 20 words
    removedWords: removedWords.slice(0, 20),
    lengthDelta: edited.length - original.length,
    emojiDelta: editedEmojis - originalEmojis,
    hookChanged,
    ctaChanged,
  };
}

/**
 * Categorize the edit type based on diff
 */
function categorizeEdit(diff: EditDiff, original: string, edited: string): EditType {
  const lengthChangePercent = Math.abs(diff.lengthDelta || 0) / Math.max(original.length, 1);
  
  // Hook change is highest priority
  if (diff.hookChanged && original.slice(0, 50) !== edited.slice(0, 50)) {
    return 'hook';
  }
  
  // CTA change
  if (diff.ctaChanged) {
    return 'cta';
  }
  
  // Significant length change (>20%)
  if (lengthChangePercent > 0.2) {
    return 'length';
  }
  
  // Emoji change
  if (diff.emojiDelta !== 0) {
    return 'emoji';
  }
  
  // Format change (line breaks, structure)
  const originalLines = original.split('\n').length;
  const editedLines = edited.split('\n').length;
  if (Math.abs(originalLines - editedLines) > 2) {
    return 'structure';
  }
  
  return 'other';
}

export function useContentLearning() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();
  const [isTracking, setIsTracking] = useState(false);

  /**
   * Track a user edit and store it for learning
   */
  const trackEdit = useCallback(async (options: LearnFromEditOptions): Promise<boolean> => {
    if (!user?.id || !currentOrganization?.id) {
      console.warn('Cannot track edit: missing user or organization');
      return false;
    }

    // Compute diff
    const diff = computeDiff(options.originalContent, options.editedContent);
    const editType = categorizeEdit(diff, options.originalContent, options.editedContent);

    // Skip if no meaningful change
    if (editType === 'other' && !diff.addedWords?.length && !diff.removedWords?.length) {
      return false;
    }

    setIsTracking(true);

    try {
      // Build the insert object with proper typing
      const insertData = {
        organization_id: currentOrganization.id,
        brand_template_id: options.brandTemplateId || null,
        user_id: user.id,
        channel: options.channel,
        content_type: options.contentType || 'multichannel',
        edit_type: editType,
        original_snippet: options.originalContent.slice(0, 500),
        edited_snippet: options.editedContent.slice(0, 500),
        edit_diff: diff as unknown as Record<string, unknown>,
        content_id: options.contentId || null,
      };

      const { error } = await supabase
        .from('content_learnings')
        .insert(insertData as any); // Use 'as any' to bypass strict type checking for new table

      if (error) {
        console.error('Error tracking edit:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error tracking edit:', error);
      return false;
    } finally {
      setIsTracking(false);
    }
  }, [user?.id, currentOrganization?.id]);

  /**
   * Fetch learned preferences for a brand template and channel
   */
  const getLearnedPreferences = useCallback(async (
    brandTemplateId: string,
    channel?: string
  ): Promise<BrandPreference[]> => {
    if (!brandTemplateId) return [];

    try {
      let query = supabase
        .from('brand_preferences_learned')
        .select('*')
        .eq('brand_template_id', brandTemplateId)
        .gte('confidence_score', 0.6); // Only return high-confidence preferences

      if (channel) {
        query = query.eq('channel', channel);
      }

      const { data, error } = await query.order('confidence_score', { ascending: false });

      if (error) {
        console.error('Error fetching preferences:', error);
        return [];
      }

      return (data || []).map(row => ({
        channel: row.channel,
        preferenceKey: row.preference_key,
        preferenceValue: row.preference_value as Record<string, any>,
        confidenceScore: row.confidence_score,
        sampleCount: row.sample_count,
      }));
    } catch (error) {
      console.error('Error fetching preferences:', error);
      return [];
    }
  }, []);

  /**
   * Build a prompt section from learned preferences
   */
  const buildPreferencesPrompt = useCallback((preferences: BrandPreference[]): string | null => {
    if (!preferences.length) return null;

    const lines = ['## Learned Brand Preferences (from user edits)'];
    
    for (const pref of preferences) {
      const confidence = Math.round(pref.confidenceScore * 100);
      if (pref.preferenceKey.startsWith('edit_tendency_')) {
        const tendency = pref.preferenceKey.replace('edit_tendency_', '');
        lines.push(`- ${pref.channel}: User often edits ${tendency} (${confidence}% confidence, ${pref.sampleCount} samples)`);
      }
    }

    return lines.length > 1 ? lines.join('\n') : null;
  }, []);

  /**
   * Trigger aggregation of learnings into preferences
   */
  const aggregateLearnings = useCallback(async (brandTemplateId: string): Promise<boolean> => {
    try {
      const { error } = await supabase.rpc('aggregate_content_learnings', {
        p_brand_template_id: brandTemplateId,
      } as any);

      if (error) {
        console.error('Error aggregating learnings:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error aggregating learnings:', error);
      return false;
    }
  }, []);

  return {
    trackEdit,
    getLearnedPreferences,
    buildPreferencesPrompt,
    aggregateLearnings,
    isTracking,
  };
}

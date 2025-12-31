import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface UserPreferences {
  id: string;
  user_id: string;
  organization_id: string | null;
  
  // Writing Style
  preferred_tone: 'casual' | 'balanced' | 'formal' | 'professional';
  emoji_frequency: 'none' | 'low' | 'medium' | 'high';
  content_length_preference: 'concise' | 'balanced' | 'detailed';
  
  // AI Behavior
  explanation_depth: 'minimal' | 'standard' | 'detailed';
  suggestion_count_preference: number;
  auto_save_drafts: boolean;
  
  // Skill Level
  skill_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  concepts_mastered: string[];
  topics_generated_count: number;
  topics_used_count: number;
  avg_edit_percentage: number;
  
  // Inferred (auto-learned)
  preferred_categories: string[];
  disliked_categories: string[];
  preferred_formats: string[];
  peak_activity_hours: number[];
  inferred_preferences: Record<string, any>;
  
  created_at: string;
  updated_at: string;
  last_active_at: string;
}

const defaultPreferences: Partial<UserPreferences> = {
  preferred_tone: 'balanced',
  emoji_frequency: 'medium',
  content_length_preference: 'balanced',
  explanation_depth: 'standard',
  suggestion_count_preference: 5,
  auto_save_drafts: true,
  skill_level: 'beginner',
  concepts_mastered: [],
  topics_generated_count: 0,
  topics_used_count: 0,
  avg_edit_percentage: 0,
  preferred_categories: [],
  disliked_categories: [],
  preferred_formats: [],
  peak_activity_hours: [],
  inferred_preferences: {},
};

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();

  const fetchPreferences = useCallback(async () => {
    if (!user) {
      setPreferences(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        setPreferences(data as UserPreferences);
      } else {
        // Create default preferences for new user
        const newPrefs = {
          user_id: user.id,
          organization_id: currentOrganization?.id || null,
          ...defaultPreferences,
        };

        const { data: created, error: createError } = await supabase
          .from('user_preferences')
          .insert(newPrefs)
          .select()
          .single();

        if (createError) throw createError;
        setPreferences(created as UserPreferences);
      }
    } catch (err: any) {
      console.error('Error fetching user preferences:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user, currentOrganization]);

  const updatePreferences = useCallback(async (updates: Partial<UserPreferences>) => {
    if (!user || !preferences) return false;

    try {
      const { error: updateError } = await supabase
        .from('user_preferences')
        .update(updates)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setPreferences(prev => prev ? { ...prev, ...updates } : null);
      return true;
    } catch (err: any) {
      console.error('Error updating preferences:', err);
      setError(err.message);
      return false;
    }
  }, [user, preferences]);

  const resetPreferences = useCallback(async (keepLearned = false) => {
    if (!user || !preferences) return false;

    try {
      const resetData = keepLearned 
        ? { ...defaultPreferences }
        : { 
            ...defaultPreferences, 
            inferred_preferences: {},
            preferred_categories: [],
            disliked_categories: [],
            preferred_formats: [],
          };

      const { error: updateError } = await supabase
        .from('user_preferences')
        .update(resetData)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setPreferences(prev => prev ? { ...prev, ...resetData } : null);
      return true;
    } catch (err: any) {
      console.error('Error resetting preferences:', err);
      setError(err.message);
      return false;
    }
  }, [user, preferences]);

  const incrementCounter = useCallback(async (counter: 'topics_generated_count' | 'topics_used_count') => {
    if (!user || !preferences) return;

    const newValue = (preferences[counter] || 0) + 1;
    await updatePreferences({ [counter]: newValue });
  }, [user, preferences, updatePreferences]);

  const addMasteredConcept = useCallback(async (concept: string) => {
    if (!user || !preferences) return;
    if (preferences.concepts_mastered.includes(concept)) return;

    const updated = [...preferences.concepts_mastered, concept];
    await updatePreferences({ concepts_mastered: updated });
  }, [user, preferences, updatePreferences]);

  const updateSkillLevel = useCallback(async () => {
    if (!preferences) return;

    // Auto-calculate skill level based on usage
    const { topics_generated_count, topics_used_count, concepts_mastered, avg_edit_percentage } = preferences;
    
    let newLevel: UserPreferences['skill_level'] = 'beginner';
    
    if (topics_generated_count >= 100 && topics_used_count >= 50 && concepts_mastered.length >= 10) {
      newLevel = 'expert';
    } else if (topics_generated_count >= 50 && topics_used_count >= 25 && concepts_mastered.length >= 5) {
      newLevel = 'advanced';
    } else if (topics_generated_count >= 20 && topics_used_count >= 10) {
      newLevel = 'intermediate';
    }

    // Lower edit percentage means better AI fit
    if (avg_edit_percentage < 15 && newLevel !== 'expert') {
      // User and AI are well-aligned, might bump up skill
    }

    if (newLevel !== preferences.skill_level) {
      await updatePreferences({ skill_level: newLevel });
    }
  }, [preferences, updatePreferences]);

  // Fetch on mount and when user changes
  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    isLoading,
    error,
    updatePreferences,
    resetPreferences,
    incrementCounter,
    addMasteredConcept,
    updateSkillLevel,
    refetch: fetchPreferences,
  };
}

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  JourneyStageMessaging, 
  JourneyStage, 
  JourneyStageMessagingFormData,
  JOURNEY_STAGES,
  getDefaultMessagingForStage 
} from '@/types/journeyStageMessaging';
import { toast } from 'sonner';

interface UseJourneyStageMessagingOptions {
  mappingId?: string;
  enabled?: boolean;
}

export function useJourneyStageMessaging(options: UseJourneyStageMessagingOptions = {}) {
  const { mappingId, enabled = true } = options;
  
  const [messaging, setMessaging] = useState<JourneyStageMessaging[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all messaging for a mapping
  const fetchMessaging = useCallback(async (targetMappingId?: string) => {
    const id = targetMappingId || mappingId;
    if (!id) return [];
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('journey_stage_messaging')
        .select('*')
        .eq('mapping_id', id)
        .order('journey_stage');
      
      if (fetchError) throw fetchError;
      
      // Type assertion since DB types may not be updated yet
      const typedData = (data || []) as unknown as JourneyStageMessaging[];
      setMessaging(typedData);
      return typedData;
    } catch (err: any) {
      const errorMessage = err.message || 'Không thể tải messaging';
      setError(errorMessage);
      console.error('Error fetching journey stage messaging:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [mappingId]);

  // Get messaging for a specific stage
  const getMessagingForStage = useCallback((stage: JourneyStage): JourneyStageMessaging | undefined => {
    return messaging.find(m => m.journey_stage === stage);
  }, [messaging]);

  // Upsert messaging for a stage
  const upsertMessaging = useCallback(async (
    targetMappingId: string,
    stage: JourneyStage,
    data: Partial<JourneyStageMessagingFormData>,
    organizationId?: string | null,
    userId?: string | null
  ): Promise<JourneyStageMessaging | null> => {
    try {
      const existing = messaging.find(m => m.mapping_id === targetMappingId && m.journey_stage === stage);
      
      const payload = {
        mapping_id: targetMappingId,
        journey_stage: stage,
        headline: data.headline || null,
        hook: data.hook || null,
        key_message: data.key_message || null,
        pain_points_focus: data.pain_points_focus || [],
        benefits_highlight: data.benefits_highlight || [],
        cta_template: data.cta_template || null,
        emotional_tone: data.emotional_tone || null,
        objection_response: data.objection_response || null,
        content_types: data.content_types || [],
        avoid_messages: data.avoid_messages || [],
        organization_id: organizationId,
        user_id: userId,
      };

      if (existing) {
        // Update existing
        const { data: updated, error: updateError } = await supabase
          .from('journey_stage_messaging')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single();
        
        if (updateError) throw updateError;
        
        const typedUpdated = updated as unknown as JourneyStageMessaging;
        setMessaging(prev => prev.map(m => m.id === existing.id ? typedUpdated : m));
        return typedUpdated;
      } else {
        // Insert new
        const { data: inserted, error: insertError } = await supabase
          .from('journey_stage_messaging')
          .insert(payload)
          .select()
          .single();
        
        if (insertError) throw insertError;
        
        const typedInserted = inserted as unknown as JourneyStageMessaging;
        setMessaging(prev => [...prev, typedInserted]);
        return typedInserted;
      }
    } catch (err: any) {
      console.error('Error upserting journey stage messaging:', err);
      toast.error('Không thể lưu messaging: ' + err.message);
      return null;
    }
  }, [messaging]);

  // Delete messaging
  const deleteMessaging = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('journey_stage_messaging')
        .delete()
        .eq('id', id);
      
      if (deleteError) throw deleteError;
      
      setMessaging(prev => prev.filter(m => m.id !== id));
      return true;
    } catch (err: any) {
      console.error('Error deleting journey stage messaging:', err);
      toast.error('Không thể xóa messaging: ' + err.message);
      return false;
    }
  }, []);

  // Bulk create default messaging for all stages
  const createDefaultsForAllStages = useCallback(async (
    targetMappingId: string,
    organizationId?: string | null,
    userId?: string | null
  ): Promise<JourneyStageMessaging[]> => {
    try {
      const defaultPayloads = JOURNEY_STAGES.map(stage => {
        const defaults = getDefaultMessagingForStage(stage);
        return {
          mapping_id: targetMappingId,
          journey_stage: stage,
          headline: null,
          hook: null,
          key_message: null,
          pain_points_focus: [] as string[],
          benefits_highlight: [] as string[],
          cta_template: defaults.cta_template || null,
          emotional_tone: defaults.emotional_tone || null,
          objection_response: null,
          content_types: defaults.content_types || [],
          avoid_messages: [] as string[],
          organization_id: organizationId,
          user_id: userId,
        };
      });

      const { data, error: insertError } = await supabase
        .from('journey_stage_messaging')
        .upsert(defaultPayloads, { 
          onConflict: 'mapping_id,journey_stage',
          ignoreDuplicates: false 
        })
        .select();
      
      if (insertError) throw insertError;
      
      const typedData = (data || []) as unknown as JourneyStageMessaging[];
      setMessaging(typedData);
      toast.success('Đã tạo messaging mặc định cho tất cả giai đoạn');
      return typedData;
    } catch (err: any) {
      console.error('Error creating default messaging:', err);
      toast.error('Không thể tạo messaging mặc định: ' + err.message);
      return [];
    }
  }, []);

  // Check if a stage has messaging
  const hasMessagingForStage = useCallback((stage: JourneyStage): boolean => {
    return messaging.some(m => m.journey_stage === stage);
  }, [messaging]);

  // Get stages with content
  const getStagesWithContent = useCallback((): JourneyStage[] => {
    return messaging
      .filter(m => m.headline || m.hook || m.key_message)
      .map(m => m.journey_stage as JourneyStage);
  }, [messaging]);

  // Get completion status for each stage
  const getCompletionStatus = useCallback((): Record<JourneyStage, number> => {
    const status: Record<JourneyStage, number> = {
      awareness: 0,
      consideration: 0,
      decision: 0,
      loyalty: 0,
    };

    messaging.forEach(m => {
      const stage = m.journey_stage as JourneyStage;
      let filled = 0;
      let total = 5; // headline, hook, key_message, cta, emotional_tone
      
      if (m.headline) filled++;
      if (m.hook) filled++;
      if (m.key_message) filled++;
      if (m.cta_template) filled++;
      if (m.emotional_tone) filled++;
      
      status[stage] = Math.round((filled / total) * 100);
    });

    return status;
  }, [messaging]);

  // Auto-fetch on mount if mappingId provided
  useEffect(() => {
    if (enabled && mappingId) {
      fetchMessaging();
    }
  }, [enabled, mappingId, fetchMessaging]);

  return {
    messaging,
    isLoading,
    error,
    fetchMessaging,
    getMessagingForStage,
    upsertMessaging,
    deleteMessaging,
    createDefaultsForAllStages,
    hasMessagingForStage,
    getStagesWithContent,
    getCompletionStatus,
    refresh: () => fetchMessaging(),
  };
}

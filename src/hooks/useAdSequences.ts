import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdSequence, AdSequenceStage, AdSequenceFormData, StageFormData, getDefaultStages } from '@/types/adSequence';
import { useToast } from '@/hooks/use-toast';

interface UseAdSequencesOptions {
  organizationId?: string;
  campaignId?: string;
}

export function useAdSequences({ organizationId, campaignId }: UseAdSequencesOptions = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryKey = ['ad-sequences', organizationId, campaignId];

  const { data: sequences = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!organizationId) return [];
      
      let query = supabase
        .from('ad_sequences')
        .select(`
          *,
          ad_sequence_stages (
            *,
            ad_sequence_stage_copies (
              id,
              sort_order,
              is_primary,
              ad_copy_id,
              ad_copies (
                id,
                title,
                platform,
                objective,
                status
              )
            )
          )
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      
      if (campaignId) {
        query = query.eq('campaign_id', campaignId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Transform data to match our types
      return (data || []).map(seq => {
        const stages = (seq.ad_sequence_stages || []) as Array<{
          id: string;
          sequence_id: string;
          stage_name: string;
          stage_order: number;
          stage_label: string | null;
          delay_days: number;
          duration_days: number;
          budget_percentage: number;
          audience_adjustments: unknown;
          notes: string | null;
          created_at: string;
          ad_sequence_stage_copies?: Array<{
            id: string;
            sort_order: number;
            is_primary: boolean;
            ad_copy_id: string;
            ad_copies: Record<string, unknown>;
          }>;
        }>;
        
        return {
          ...seq,
          stages: stages
            .sort((a, b) => a.stage_order - b.stage_order)
            .map(stage => ({
              ...stage,
              audience_adjustments: stage.audience_adjustments as AdSequenceStage['audience_adjustments'],
              ad_copies: (stage.ad_sequence_stage_copies || [])
                .sort((a, b) => a.sort_order - b.sort_order)
                .map(sc => ({
                  id: sc.ad_copy_id,
                  stage_copy_id: sc.id,
                  sort_order: sc.sort_order,
                  is_primary: sc.is_primary,
                  ad_copy: sc.ad_copies,
                })),
            })),
        };
      }) as AdSequence[];
    },
    enabled: !!organizationId,
  });

  const createSequence = useMutation({
    mutationFn: async (formData: AdSequenceFormData & { organization_id: string; createDefaultStages?: boolean }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { createDefaultStages = true, ...sequenceData } = formData;
      
      // Create sequence
      const { data: sequence, error: seqError } = await supabase
        .from('ad_sequences')
        .insert({
          ...sequenceData,
          created_by: userData.user?.id,
        })
        .select()
        .single();
      
      if (seqError) throw seqError;
      
      // Create default stages if requested
      if (createDefaultStages) {
        const defaultStages = getDefaultStages(formData.sequence_type);
        
        if (defaultStages.length > 0) {
          const stagesData = defaultStages.map((stage, index) => ({
            sequence_id: sequence.id,
            stage_name: stage.stage_name,
            stage_order: index,
            stage_label: stage.stage_label,
            delay_days: stage.delay_days,
            duration_days: stage.duration_days,
            budget_percentage: stage.budget_percentage,
          }));
          
          const { error: stagesError } = await supabase
            .from('ad_sequence_stages')
            .insert(stagesData);
          
          if (stagesError) throw stagesError;
        }
      }
      
      return sequence;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-sequences'] });
      toast({ title: 'Đã tạo sequence mới' });
    },
    onError: (error) => {
      toast({ 
        title: 'Lỗi khi tạo sequence', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const updateSequence = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AdSequence> & { id: string }) => {
      const { data, error } = await supabase
        .from('ad_sequences')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-sequences'] });
      toast({ title: 'Đã cập nhật sequence' });
    },
    onError: (error) => {
      toast({ 
        title: 'Lỗi khi cập nhật', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const deleteSequence = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ad_sequences')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-sequences'] });
      toast({ title: 'Đã xóa sequence' });
    },
    onError: (error) => {
      toast({ 
        title: 'Lỗi khi xóa', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Stage mutations
  const addStage = useMutation({
    mutationFn: async ({ sequenceId, stageData }: { sequenceId: string; stageData: StageFormData }) => {
      // Get max stage_order
      const { data: existingStages } = await supabase
        .from('ad_sequence_stages')
        .select('stage_order')
        .eq('sequence_id', sequenceId)
        .order('stage_order', { ascending: false })
        .limit(1);
      
      const nextOrder = existingStages && existingStages.length > 0 
        ? existingStages[0].stage_order + 1 
        : 0;
      
      const { data, error } = await supabase
        .from('ad_sequence_stages')
        .insert({
          sequence_id: sequenceId,
          ...stageData,
          stage_order: nextOrder,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-sequences'] });
    },
  });

  const updateStage = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AdSequenceStage> & { id: string }) => {
      const { data, error } = await supabase
        .from('ad_sequence_stages')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-sequences'] });
    },
  });

  const deleteStage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ad_sequence_stages')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-sequences'] });
    },
  });

  const reorderStages = useMutation({
    mutationFn: async ({ sequenceId, stageIds }: { sequenceId: string; stageIds: string[] }) => {
      const updates = stageIds.map((id, index) => 
        supabase
          .from('ad_sequence_stages')
          .update({ stage_order: index })
          .eq('id', id)
      );
      
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-sequences'] });
    },
  });

  // Ad copy in stage mutations
  const addAdCopyToStage = useMutation({
    mutationFn: async ({ stageId, adCopyId, isPrimary = false }: { stageId: string; adCopyId: string; isPrimary?: boolean }) => {
      // Get max sort_order
      const { data: existingCopies } = await supabase
        .from('ad_sequence_stage_copies')
        .select('sort_order')
        .eq('stage_id', stageId)
        .order('sort_order', { ascending: false })
        .limit(1);
      
      const nextOrder = existingCopies && existingCopies.length > 0 
        ? existingCopies[0].sort_order + 1 
        : 0;
      
      const { data, error } = await supabase
        .from('ad_sequence_stage_copies')
        .insert({
          stage_id: stageId,
          ad_copy_id: adCopyId,
          sort_order: nextOrder,
          is_primary: isPrimary,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-sequences'] });
      toast({ title: 'Đã thêm ad copy vào stage' });
    },
    onError: (error) => {
      toast({ 
        title: 'Lỗi khi thêm ad copy', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const removeAdCopyFromStage = useMutation({
    mutationFn: async (stageCopyId: string) => {
      const { error } = await supabase
        .from('ad_sequence_stage_copies')
        .delete()
        .eq('id', stageCopyId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-sequences'] });
      toast({ title: 'Đã xóa ad copy khỏi stage' });
    },
  });

  const setPrimaryAdCopy = useMutation({
    mutationFn: async ({ stageId, stageCopyId }: { stageId: string; stageCopyId: string }) => {
      // First, unset all as non-primary
      await supabase
        .from('ad_sequence_stage_copies')
        .update({ is_primary: false })
        .eq('stage_id', stageId);
      
      // Then set the selected one as primary
      const { error } = await supabase
        .from('ad_sequence_stage_copies')
        .update({ is_primary: true })
        .eq('id', stageCopyId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-sequences'] });
    },
  });

  return {
    sequences,
    isLoading,
    error,
    createSequence,
    updateSequence,
    deleteSequence,
    addStage,
    updateStage,
    deleteStage,
    reorderStages,
    addAdCopyToStage,
    removeAdCopyFromStage,
    setPrimaryAdCopy,
  };
}

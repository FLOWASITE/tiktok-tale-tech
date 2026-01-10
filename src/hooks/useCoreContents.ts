import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  CoreContent,
  CoreContentFilters,
  CoreContentStats,
  CoreContentStatus,
  GenerateCoreContentRequest,
  GenerateCoreContentResponse,
} from '@/types/coreContent';
import { Channel } from '@/types/multichannel';

// ============================================
// CORE CONTENTS HOOK
// ============================================

interface UseCoreContentsOptions {
  organizationId?: string;
  enabled?: boolean;
  filters?: CoreContentFilters;
}

export function useCoreContents(options: UseCoreContentsOptions = {}) {
  const { organizationId, enabled = true, filters } = options;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  // ============================================
  // FETCH CORE CONTENTS
  // ============================================
  
  const {
    data: coreContents,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['core-contents', organizationId, filters],
    queryFn: async () => {
      if (!organizationId) return [];
      
      let query = supabase
        .from('core_contents')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      
      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.contentGoal) {
        query = query.eq('content_goal', filters.contentGoal);
      }
      if (filters?.contentRole) {
        query = query.eq('content_role', filters.contentRole);
      }
      if (filters?.brandTemplateId) {
        query = query.eq('brand_template_id', filters.brandTemplateId);
      }
      if (filters?.searchQuery) {
        query = query.or(`topic.ilike.%${filters.searchQuery}%,title.ilike.%${filters.searchQuery}%`);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Parse key_messages from JSONB
      return (data || []).map(item => ({
        ...item,
        key_messages: Array.isArray(item.key_messages) ? item.key_messages : [],
      })) as CoreContent[];
    },
    enabled: enabled && !!organizationId,
  });

  // ============================================
  // FETCH SINGLE CORE CONTENT
  // ============================================
  
  const getCoreContent = useCallback(async (id: string): Promise<CoreContent | null> => {
    const { data, error } = await supabase
      .from('core_contents')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('[useCoreContents] Error fetching core content:', error);
      return null;
    }
    
    return {
      ...data,
      key_messages: Array.isArray(data.key_messages) ? data.key_messages : [],
    } as CoreContent;
  }, []);

  // ============================================
  // GET DERIVED VARIANTS
  // ============================================
  
  const getDerivedVariants = useCallback(async (coreContentId: string) => {
    const { data, error } = await supabase
      .from('multi_channel_contents')
      .select('id, title, topic, selected_channels, status, created_at')
      .eq('core_content_id', coreContentId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[useCoreContents] Error fetching variants:', error);
      return [];
    }
    
    return data || [];
  }, []);

  // ============================================
  // GET CORE CONTENT FOR VARIANT
  // ============================================
  
  const getCoreContentForVariant = useCallback(async (variantId: string): Promise<CoreContent | null> => {
    const { data: variant, error: variantError } = await supabase
      .from('multi_channel_contents')
      .select('core_content_id')
      .eq('id', variantId)
      .single();
    
    if (variantError || !variant?.core_content_id) {
      return null;
    }
    
    return getCoreContent(variant.core_content_id);
  }, [getCoreContent]);

  // ============================================
  // GENERATE CORE CONTENT
  // ============================================
  
  const generateCoreContent = useCallback(async (
    request: GenerateCoreContentRequest
  ): Promise<GenerateCoreContentResponse> => {
    setIsGenerating(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('generate-core-content', {
        body: request,
        headers: session?.access_token 
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      });
      
      if (response.error) {
        throw new Error(response.error.message || 'Failed to generate core content');
      }
      
      // Invalidate cache
      queryClient.invalidateQueries({ queryKey: ['core-contents'] });
      
      toast({
        title: 'Core Content đã được tạo',
        description: `${response.data.wordCount} từ, điểm chất lượng: ${response.data.qualityScore}/100`,
      });
      
      return response.data as GenerateCoreContentResponse;
      
    } catch (error) {
      console.error('[useCoreContents] Generation error:', error);
      toast({
        title: 'Lỗi tạo Core Content',
        description: error instanceof Error ? error.message : 'Có lỗi xảy ra',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [queryClient, toast]);

  // ============================================
  // UPDATE CORE CONTENT
  // ============================================
  
  const updateMutation = useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: Partial<Pick<CoreContent, 'title' | 'content' | 'status' | 'content_role' | 'key_messages'>> 
    }) => {
      const { data, error } = await supabase
        .from('core_contents')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['core-contents'] });
      toast({
        title: 'Đã cập nhật Core Content',
      });
    },
    onError: (error) => {
      toast({
        title: 'Lỗi cập nhật',
        description: error instanceof Error ? error.message : 'Có lỗi xảy ra',
        variant: 'destructive',
      });
    },
  });

  // ============================================
  // DELETE CORE CONTENT
  // ============================================
  
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // First unlink any variants
      await supabase
        .from('multi_channel_contents')
        .update({ core_content_id: null })
        .eq('core_content_id', id);
      
      // Then delete
      const { error } = await supabase
        .from('core_contents')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['core-contents'] });
      toast({
        title: 'Đã xoá Core Content',
      });
    },
    onError: (error) => {
      toast({
        title: 'Lỗi xoá',
        description: error instanceof Error ? error.message : 'Có lỗi xảy ra',
        variant: 'destructive',
      });
    },
  });

  // ============================================
  // APPROVE CORE CONTENT
  // ============================================
  
  const approveCoreContent = useCallback(async (id: string) => {
    return updateMutation.mutateAsync({ id, updates: { status: 'approved' } });
  }, [updateMutation]);

  // ============================================
  // ARCHIVE CORE CONTENT
  // ============================================
  
  const archiveCoreContent = useCallback(async (id: string) => {
    return updateMutation.mutateAsync({ id, updates: { status: 'archived' } });
  }, [updateMutation]);

  // ============================================
  // GET STATS
  // ============================================
  
  const getStats = useCallback(async (): Promise<CoreContentStats | null> => {
    if (!organizationId) return null;
    
    const { data, error } = await supabase
      .from('core_contents')
      .select('status, quality_score, word_count')
      .eq('organization_id', organizationId);
    
    if (error) {
      console.error('[useCoreContents] Stats error:', error);
      return null;
    }
    
    const contents = data || [];
    const total = contents.length;
    const draft = contents.filter(c => c.status === 'draft').length;
    const approved = contents.filter(c => c.status === 'approved').length;
    const archived = contents.filter(c => c.status === 'archived').length;
    
    const qualityScores = contents.filter(c => c.quality_score).map(c => c.quality_score!);
    const wordCounts = contents.filter(c => c.word_count).map(c => c.word_count!);
    
    // Get derived variants count
    const { count: variantCount } = await supabase
      .from('multi_channel_contents')
      .select('id', { count: 'exact', head: true })
      .not('core_content_id', 'is', null)
      .eq('organization_id', organizationId);
    
    return {
      total,
      draft,
      approved,
      archived,
      avgQualityScore: qualityScores.length > 0 
        ? Math.round(qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length) 
        : 0,
      avgWordCount: wordCounts.length > 0 
        ? Math.round(wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length) 
        : 0,
      totalDerivedVariants: variantCount || 0,
    };
  }, [organizationId]);

  return {
    // Data
    coreContents,
    isLoading,
    error,
    
    // Actions
    refetch,
    getCoreContent,
    getDerivedVariants,
    getCoreContentForVariant,
    generateCoreContent,
    updateCoreContent: updateMutation.mutate,
    deleteCoreContent: deleteMutation.mutate,
    approveCoreContent,
    archiveCoreContent,
    getStats,
    
    // State
    isGenerating,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

// ============================================
// SINGLE CORE CONTENT HOOK
// ============================================

export function useCoreContent(id: string | null, options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;
  
  return useQuery({
    queryKey: ['core-content', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('core_contents')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      return {
        ...data,
        key_messages: Array.isArray(data.key_messages) ? data.key_messages : [],
      } as CoreContent;
    },
    enabled: enabled && !!id,
  });
}

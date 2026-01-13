// ============================================
// Regulation Propagation Hook
// Monitor and manage regulatory changes across industries
// ============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type {
  RegulationPropagation,
  PropagationStatus,
  PropagationPriority,
  UpdatePropagationInput,
  ImpactAnalysis,
  AffectedRule,
} from '@/types/knowledgeGraph';

// ============================================
// Query Keys
// ============================================

export const propagationKeys = {
  all: ['regulation-propagation'] as const,
  list: (filters?: PropagationFilters) => [...propagationKeys.all, 'list', filters] as const,
  detail: (id: string) => [...propagationKeys.all, 'detail', id] as const,
  byPack: (packId: string) => [...propagationKeys.all, 'pack', packId] as const,
  pending: () => [...propagationKeys.all, 'pending'] as const,
  stats: () => [...propagationKeys.all, 'stats'] as const,
};

// ============================================
// Types
// ============================================

interface PropagationFilters {
  status?: PropagationStatus | PropagationStatus[];
  priority?: PropagationPriority | PropagationPriority[];
  affectedPackId?: string;
  limit?: number;
}

interface PropagationStats {
  total: number;
  pending: number;
  analyzing: number;
  ready: number;
  applied: number;
  reviewed: number;
  rejected: number;
  byPriority: Record<PropagationPriority, number>;
}

interface CreatePropagationInput {
  source_node_id?: string;
  affected_pack_id: string;
  change_type: 'new' | 'updated' | 'deprecated' | 'enforcement_change';
  change_summary?: string;
  impact_analysis?: ImpactAnalysis;
  affected_rules?: AffectedRule[];
  priority?: PropagationPriority;
}

// ============================================
// Helper: Convert to Json
// ============================================

function toJson(value: unknown): Json {
  return value as Json;
}

// ============================================
// Fetch Functions
// ============================================

async function fetchPropagations(filters?: PropagationFilters): Promise<RegulationPropagation[]> {
  let query = supabase
    .from('regulation_propagation_log')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    query = query.in('propagation_status', statuses);
  }

  if (filters?.priority) {
    const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority];
    query = query.in('priority', priorities);
  }

  if (filters?.affectedPackId) {
    query = query.eq('affected_pack_id', filters.affectedPackId);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as RegulationPropagation[];
}

async function fetchPropagationById(id: string): Promise<RegulationPropagation | null> {
  const { data, error } = await supabase
    .from('regulation_propagation_log')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as unknown as RegulationPropagation;
}

async function fetchPropagationStats(): Promise<PropagationStats> {
  const { data, error } = await supabase
    .from('regulation_propagation_log')
    .select('propagation_status, priority');

  if (error) throw error;

  const stats: PropagationStats = {
    total: data?.length || 0,
    pending: 0,
    analyzing: 0,
    ready: 0,
    applied: 0,
    reviewed: 0,
    rejected: 0,
    byPriority: { low: 0, medium: 0, high: 0, critical: 0 },
  };

  data?.forEach(row => {
    const status = row.propagation_status as PropagationStatus;
    const priority = row.priority as PropagationPriority;
    
    if (status === 'pending') stats.pending++;
    else if (status === 'analyzing') stats.analyzing++;
    else if (status === 'ready') stats.ready++;
    else if (status === 'applied') stats.applied++;
    else if (status === 'reviewed') stats.reviewed++;
    else if (status === 'rejected') stats.rejected++;
    if (priority in stats.byPriority) {
      stats.byPriority[priority]++;
    }
  });

  return stats;
}

// ============================================
// Query Hooks
// ============================================

/**
 * Fetch all propagations with optional filters
 */
export function usePropagations(filters?: PropagationFilters) {
  return useQuery({
    queryKey: propagationKeys.list(filters),
    queryFn: () => fetchPropagations(filters),
  });
}

/**
 * Fetch a single propagation by ID
 */
export function usePropagation(id: string | null) {
  return useQuery({
    queryKey: propagationKeys.detail(id || ''),
    queryFn: () => fetchPropagationById(id!),
    enabled: !!id,
  });
}

/**
 * Fetch propagations for a specific global pack
 */
export function usePropagationsByPack(packId: string | null) {
  return useQuery({
    queryKey: propagationKeys.byPack(packId || ''),
    queryFn: () => fetchPropagations({ affectedPackId: packId! }),
    enabled: !!packId,
  });
}

/**
 * Fetch pending propagations that need review
 */
export function usePendingPropagations(limit = 20) {
  return useQuery({
    queryKey: propagationKeys.pending(),
    queryFn: () => fetchPropagations({ 
      status: ['pending', 'analyzing', 'ready'],
      limit,
    }),
  });
}

/**
 * Fetch propagations with review_status = 'pending' (Living System)
 * These are regulations that have been parsed and need admin review
 */
export function usePendingReviewPropagations(limit = 50) {
  return useQuery({
    queryKey: [...propagationKeys.all, 'pending-review'] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regulation_propagation_log')
        .select('*')
        .eq('review_status', 'pending')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return (data || []) as unknown as RegulationPropagation[];
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Fetch propagation statistics
 */
export function usePropagationStats() {
  return useQuery({
    queryKey: propagationKeys.stats(),
    queryFn: fetchPropagationStats,
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============================================
// Mutation Hooks
// ============================================

/**
 * Create a new propagation entry
 */
export function useCreatePropagation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePropagationInput) => {
      const { data, error } = await supabase
        .from('regulation_propagation_log')
        .insert({
          source_node_id: input.source_node_id,
          affected_pack_id: input.affected_pack_id,
          change_type: input.change_type,
          change_summary: input.change_summary,
          impact_analysis: toJson(input.impact_analysis || {}),
          affected_rules: toJson(input.affected_rules || []),
          priority: input.priority || 'medium',
          propagation_status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as RegulationPropagation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: propagationKeys.all });
    },
  });
}

/**
 * Update propagation status
 */
export function useUpdatePropagationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdatePropagationInput) => {
      const { data, error } = await supabase
        .from('regulation_propagation_log')
        .update({
          propagation_status: input.status,
          review_notes: input.review_notes,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', input.propagation_id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as RegulationPropagation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: propagationKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: propagationKeys.list() });
      queryClient.invalidateQueries({ queryKey: propagationKeys.pending() });
      queryClient.invalidateQueries({ queryKey: propagationKeys.stats() });
    },
  });
}

/**
 * Apply propagation (update status and trigger rule updates)
 */
export function useApplyPropagation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (propagationId: string) => {
      // Call edge function to apply changes
      const { error } = await supabase.functions.invoke(
        'apply-regulation-propagation',
        {
          body: { propagation_id: propagationId },
        }
      );

      if (error) throw error;

      // Update status to applied
      const { data: updated, error: updateError } = await supabase
        .from('regulation_propagation_log')
        .update({
          propagation_status: 'applied',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', propagationId)
        .select()
        .single();

      if (updateError) throw updateError;
      return updated as unknown as RegulationPropagation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: propagationKeys.all });
    },
  });
}

/**
 * Reject propagation
 */
export function useRejectPropagation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      propagationId, 
      reason 
    }: { 
      propagationId: string; 
      reason?: string;
    }) => {
      const { data, error } = await supabase
        .from('regulation_propagation_log')
        .update({
          propagation_status: 'rejected',
          review_notes: reason || 'Rejected by admin',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', propagationId)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as RegulationPropagation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: propagationKeys.all });
    },
  });
}

/**
 * Request AI analysis for a propagation
 */
export function useAnalyzePropagation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (propagationId: string) => {
      // Update status to analyzing
      await supabase
        .from('regulation_propagation_log')
        .update({ propagation_status: 'analyzing' })
        .eq('id', propagationId);

      // Call AI analysis edge function
      const { data, error } = await supabase.functions.invoke(
        'analyze-regulation-impact',
        {
          body: { propagation_id: propagationId },
        }
      );

      if (error) throw error;

      // Update with analysis results
      const { data: updated, error: updateError } = await supabase
        .from('regulation_propagation_log')
        .update({
          propagation_status: 'ready',
          impact_analysis: toJson(data.impact_analysis),
          affected_rules: toJson(data.affected_rules),
        })
        .eq('id', propagationId)
        .select()
        .single();

      if (updateError) throw updateError;
      return updated as unknown as RegulationPropagation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: propagationKeys.all });
    },
  });
}

// ============================================
// Combined Hook
// ============================================

/**
 * Main hook for regulation propagation management
 */
export function useRegulationPropagation(globalPackId?: string | null) {
  const propagationsQuery = globalPackId 
    ? usePropagationsByPack(globalPackId)
    : usePendingPropagations();
  
  const statsQuery = usePropagationStats();

  const createMutation = useCreatePropagation();
  const updateStatusMutation = useUpdatePropagationStatus();
  const applyMutation = useApplyPropagation();
  const rejectMutation = useRejectPropagation();
  const analyzeMutation = useAnalyzePropagation();

  return {
    // Data
    propagations: propagationsQuery.data || [],
    stats: statsQuery.data,

    // Loading states
    isLoading: propagationsQuery.isLoading,
    isStatsLoading: statsQuery.isLoading,

    // Errors
    error: propagationsQuery.error || statsQuery.error,

    // Actions
    create: createMutation.mutateAsync,
    updateStatus: updateStatusMutation.mutateAsync,
    apply: applyMutation.mutateAsync,
    reject: rejectMutation.mutateAsync,
    analyze: analyzeMutation.mutateAsync,

    // Action states
    isCreating: createMutation.isPending,
    isUpdating: updateStatusMutation.isPending,
    isApplying: applyMutation.isPending,
    isRejecting: rejectMutation.isPending,
    isAnalyzing: analyzeMutation.isPending,

    // Refetch
    refetch: propagationsQuery.refetch,
  };
}

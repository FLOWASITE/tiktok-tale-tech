/**
 * usePackRegulationSources - Hook for managing regulation sources linked to a specific Industry Pack
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PackRegulationSource {
  id: string;
  source_name: string;
  source_url: string;
  jurisdiction: string;
  category: string;
  search_query: string;
  crawl_frequency: 'daily' | 'weekly' | 'monthly';
  is_active: boolean;
  last_crawled_at: string | null;
  target_industry_pack_ids: string[];
  created_at: string;
}

export interface CrawledRegulation {
  id: string;
  display_name: { vi?: string; en?: string } | null;
  node_type: string;
  source_url: string | null;
  full_text: string | null;
  effective_date: string | null;
  content_quality_score: number | null;
  parse_status: string | null;
  last_verified_at: string | null;
  created_at: string;
}

export type CrawlingTarget = { mode: 'single'; sourceId: string } | { mode: 'all' } | null;

// Query keys
const packRegulationKeys = {
  all: ['pack-regulation-sources'] as const,
  sources: (packId: string) => [...packRegulationKeys.all, 'sources', packId] as const,
  crawled: (packId: string) => [...packRegulationKeys.all, 'crawled', packId] as const,
};

export function usePackRegulationSources(globalPackId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [crawlingTarget, setCrawlingTarget] = useState<CrawlingTarget>(null);

  // Query sources linked to this pack
  const {
    data: linkedSources = [],
    isLoading: isLoadingSources,
    refetch: refetchSources,
  } = useQuery({
    queryKey: packRegulationKeys.sources(globalPackId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regulation_sources')
        .select('*')
        .contains('target_industry_pack_ids', [globalPackId])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PackRegulationSource[];
    },
    enabled: !!globalPackId,
  });

  // Query crawled regulations for this pack
  const {
    data: crawledRegulations = [],
    isLoading: isLoadingCrawled,
    refetch: refetchCrawled,
  } = useQuery({
    queryKey: packRegulationKeys.crawled(globalPackId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('industry_knowledge_nodes')
        .select('id, display_name, node_type, source_url, full_text, effective_date, content_quality_score, parse_status, last_verified_at, created_at')
        .eq('global_pack_id', globalPackId)
        .eq('node_type', 'regulation')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as CrawledRegulation[];
    },
    enabled: !!globalPackId,
  });

  // Trigger crawl mutation
  const triggerCrawlMutation = useMutation({
    mutationFn: async (options: { source_id?: string; crawl_all?: boolean } = {}) => {
      const { data, error } = await supabase.functions.invoke('auto-crawl-regulations', {
        body: options,
      });

      if (error) throw error;
      return data;
    },
    onMutate: (variables) => {
      if (variables.source_id) {
        setCrawlingTarget({ mode: 'single', sourceId: variables.source_id });
      } else if (variables.crawl_all) {
        setCrawlingTarget({ mode: 'all' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: packRegulationKeys.sources(globalPackId) });
      queryClient.invalidateQueries({ queryKey: packRegulationKeys.crawled(globalPackId) });
      toast({
        title: 'Crawl hoàn thành',
        description: 'Đã cập nhật dữ liệu quy định mới',
      });
      setCrawlingTarget(null);
    },
    onError: (error) => {
      toast({
        title: 'Lỗi crawl',
        description: error instanceof Error ? error.message : 'Đã xảy ra lỗi',
        variant: 'destructive',
      });
      setCrawlingTarget(null);
    },
  });

  // Helper functions
  const isSourceCrawling = (sourceId: string) =>
    crawlingTarget?.mode === 'single' && crawlingTarget.sourceId === sourceId;

  const isCrawlingAll = crawlingTarget?.mode === 'all';

  const isCrawling = crawlingTarget !== null;

  const getCrawlingSourceName = (): string | null => {
    if (!crawlingTarget) return null;
    if (crawlingTarget.mode === 'all') return 'Tất cả nguồn';
    const source = linkedSources.find(s => s.id === crawlingTarget.sourceId);
    return source?.source_name || 'Đang crawl...';
  };

  return {
    // Data
    linkedSources,
    crawledRegulations,
    crawlingTarget,

    // Loading states
    isLoadingSources,
    isLoadingCrawled,
    isCrawling,

    // Actions
    triggerCrawl: triggerCrawlMutation.mutate,
    refetchSources,
    refetchCrawled,

    // Helpers
    isSourceCrawling,
    isCrawlingAll,
    getCrawlingSourceName,
  };
}

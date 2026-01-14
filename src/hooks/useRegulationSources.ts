/**
 * Hook for managing regulation sources and crawl operations
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Type for tracking which crawl is currently running
export type CrawlingTarget = 
  | { mode: 'single'; sourceId: string }
  | { mode: 'all' }
  | null;
export interface RegulationSource {
  id: string;
  source_name: string;
  source_url: string;
  jurisdiction: string;
  category: string;
  search_query: string | null;
  crawl_frequency: 'daily' | 'weekly' | 'monthly';
  last_crawled_at: string | null;
  next_crawl_at: string | null;
  is_active: boolean;
  properties: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Target industries for auto-linking regulations
  target_industry_category_ids: string[];
  target_industry_pack_ids: string[];
}

export interface CrawlHistory {
  id: string;
  source_id: string;
  crawl_started_at: string;
  crawl_completed_at: string | null;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  results_count: number;
  changes_detected: number;
  new_regulations: number;
  updated_regulations: number;
  error_message: string | null;
  crawl_data: unknown[];
  created_at: string;
}

export interface CrawlStats {
  source_id: string;
  results_count: number;
  changes_detected: number;
  new_regulations: number;
  updated_regulations: number;
}

export interface CrawlResult {
  success: boolean;
  sources_processed: number;
  stats: CrawlStats[];
  totals: {
    total_results: number;
    total_changes: number;
    total_new: number;
    total_updated: number;
  };
  error?: string;
}

// Query keys
export const regulationSourcesKeys = {
  all: ['regulation-sources'] as const,
  list: () => [...regulationSourcesKeys.all, 'list'] as const,
  detail: (id: string) => [...regulationSourcesKeys.all, 'detail', id] as const,
  history: () => [...regulationSourcesKeys.all, 'history'] as const,
  historyBySource: (sourceId: string) => [...regulationSourcesKeys.all, 'history', sourceId] as const,
};

export function useRegulationSources() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Track which crawl target is currently running
  const [crawlingTarget, setCrawlingTarget] = useState<CrawlingTarget>(null);
  // Fetch all sources
  const {
    data: sources = [],
    isLoading: isLoadingSources,
    error: sourcesError,
    refetch: refetchSources,
  } = useQuery({
    queryKey: regulationSourcesKeys.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regulation_sources')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as RegulationSource[];
    },
  });

  // Fetch crawl history
  const {
    data: crawlHistory = [],
    isLoading: isLoadingHistory,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: regulationSourcesKeys.history(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regulation_crawl_history')
        .select('*')
        .order('crawl_started_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as CrawlHistory[];
    },
  });

  // Create source mutation
  const createSourceMutation = useMutation({
    mutationFn: async (source: Omit<RegulationSource, 'id' | 'created_at' | 'updated_at' | 'last_crawled_at' | 'next_crawl_at'>) => {
      const { data, error } = await supabase
        .from('regulation_sources')
        .insert([{
          source_name: source.source_name,
          source_url: source.source_url,
          jurisdiction: source.jurisdiction,
          category: source.category,
          search_query: source.search_query,
          crawl_frequency: source.crawl_frequency,
          is_active: source.is_active,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: regulationSourcesKeys.list() });
      toast({
        title: 'Thành công',
        description: 'Đã thêm nguồn quy định mới',
      });
    },
    onError: (error) => {
      toast({
        title: 'Lỗi',
        description: error instanceof Error ? error.message : 'Không thể thêm nguồn',
        variant: 'destructive',
      });
    },
  });

  // Update source mutation
  const updateSourceMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RegulationSource> & { id: string }) => {
      const updateData: Record<string, unknown> = {};
      if (updates.source_name !== undefined) updateData.source_name = updates.source_name;
      if (updates.source_url !== undefined) updateData.source_url = updates.source_url;
      if (updates.jurisdiction !== undefined) updateData.jurisdiction = updates.jurisdiction;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.search_query !== undefined) updateData.search_query = updates.search_query;
      if (updates.crawl_frequency !== undefined) updateData.crawl_frequency = updates.crawl_frequency;
      if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
      if (updates.target_industry_category_ids !== undefined) updateData.target_industry_category_ids = updates.target_industry_category_ids;
      if (updates.target_industry_pack_ids !== undefined) updateData.target_industry_pack_ids = updates.target_industry_pack_ids;

      const { data, error } = await supabase
        .from('regulation_sources')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: regulationSourcesKeys.list() });
      toast({
        title: 'Thành công',
        description: 'Đã cập nhật nguồn quy định',
      });
    },
    onError: (error) => {
      toast({
        title: 'Lỗi',
        description: error instanceof Error ? error.message : 'Không thể cập nhật nguồn',
        variant: 'destructive',
      });
    },
  });

  // Delete source mutation
  const deleteSourceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('regulation_sources')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: regulationSourcesKeys.list() });
      toast({
        title: 'Thành công',
        description: 'Đã xóa nguồn quy định',
      });
    },
    onError: (error) => {
      toast({
        title: 'Lỗi',
        description: error instanceof Error ? error.message : 'Không thể xóa nguồn',
        variant: 'destructive',
      });
    },
  });

  // Trigger crawl mutation
  const triggerCrawlMutation = useMutation({
    mutationFn: async (options: { source_id?: string; crawl_all?: boolean } = {}) => {
      const { data, error } = await supabase.functions.invoke('auto-crawl-regulations', {
        body: options,
      });

      if (error) throw error;
      return data as CrawlResult;
    },
    onMutate: (variables) => {
      // Set crawling target BEFORE the mutation starts
      if (variables.source_id) {
        setCrawlingTarget({ mode: 'single', sourceId: variables.source_id });
      } else if (variables.crawl_all) {
        setCrawlingTarget({ mode: 'all' });
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: regulationSourcesKeys.list() });
      queryClient.invalidateQueries({ queryKey: regulationSourcesKeys.history() });
      queryClient.invalidateQueries({ queryKey: ['regulation-propagation'] });
      
      if (data.success) {
        toast({
          title: 'Crawl hoàn tất',
          description: `Tìm thấy ${data.totals.total_results} kết quả, ${data.totals.total_new} quy định mới, ${data.totals.total_updated} cập nhật`,
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Lỗi Crawl',
        description: error instanceof Error ? error.message : 'Không thể thực hiện crawl',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      // Clear crawling target when done (success or error)
      setCrawlingTarget(null);
    },
  });

  // Toggle source active status
  const toggleSourceActive = useCallback(
    (id: string, isActive: boolean) => {
      updateSourceMutation.mutate({ id, is_active: isActive });
    },
    [updateSourceMutation]
  );

  // Seed initial VN sources - Living System: Optimized for document download
  const seedInitialSourcesMutation = useMutation({
    mutationFn: async () => {
      // Priority sources for Living System:
      // 1. VBPL.vn - Best for direct PDF/DOCX download (no CAPTCHA)
      // 2. LuatVietnam.vn - Good alternative with structured data
      // 3. VanBan.ChinhPhu.vn - Official but harder to scrape
      const vnSources = [
        // === VBPL.VN - Priority Source (Easy Download) ===
        {
          source_name: 'VBPL - Thuế & Kế toán (Ưu tiên)',
          source_url: 'https://vbpl.vn',
          jurisdiction: 'VN',
          category: 'tax',
          search_query: 'Luật thuế site:vbpl.vn/van-ban',
          crawl_frequency: 'weekly',
          is_active: true,
          properties: { priority: 1, supports_download: true },
        },
        {
          source_name: 'VBPL - Quảng cáo & Marketing (Ưu tiên)',
          source_url: 'https://vbpl.vn',
          jurisdiction: 'VN',
          category: 'advertising',
          search_query: 'Luật quảng cáo site:vbpl.vn/van-ban',
          crawl_frequency: 'weekly',
          is_active: true,
          properties: { priority: 1, supports_download: true },
        },
        {
          source_name: 'VBPL - Bất động sản (Ưu tiên)',
          source_url: 'https://vbpl.vn',
          jurisdiction: 'VN',
          category: 'land',
          search_query: 'Luật đất đai site:vbpl.vn/van-ban',
          crawl_frequency: 'weekly',
          is_active: true,
          properties: { priority: 1, supports_download: true },
        },
        {
          source_name: 'VBPL - Ngân hàng & Tài chính (Ưu tiên)',
          source_url: 'https://vbpl.vn',
          jurisdiction: 'VN',
          category: 'finance',
          search_query: 'Luật ngân hàng site:vbpl.vn/van-ban',
          crawl_frequency: 'weekly',
          is_active: true,
          properties: { priority: 1, supports_download: true },
        },
        {
          source_name: 'VBPL - Thực phẩm & Đồ uống (Ưu tiên)',
          source_url: 'https://vbpl.vn',
          jurisdiction: 'VN',
          category: 'general',
          search_query: 'Luật an toàn thực phẩm site:vbpl.vn/van-ban',
          crawl_frequency: 'weekly',
          is_active: true,
          properties: { priority: 1, supports_download: true },
        },
        // === LuatVietnam.vn - Alternative Source ===
        {
          source_name: 'Luật Việt Nam - Tổng hợp',
          source_url: 'https://luatvietnam.vn',
          jurisdiction: 'VN',
          category: 'general',
          search_query: 'Luật mới 2026 site:luatvietnam.vn',
          crawl_frequency: 'weekly',
          is_active: true,
          properties: { priority: 2, supports_download: true },
        },
        // === VanBan.ChinhPhu.vn - Official but harder ===
        {
          source_name: 'Văn bản Chính phủ - Official (Backup)',
          source_url: 'https://vanban.chinhphu.vn',
          jurisdiction: 'VN',
          category: 'general',
          search_query: 'Luật Quản lý thuế site:vanban.chinhphu.vn',
          crawl_frequency: 'weekly',
          is_active: false, // Disabled by default - harder to scrape
          properties: { priority: 3, supports_download: false, needs_captcha: true },
        },
        // === ThưViệnPhápLuật.vn - Easy HTML Full Text (Priority 0.5) ===
        {
          source_name: 'TVPL - Thuế & Kế toán',
          source_url: 'https://thuvienphapluat.vn',
          jurisdiction: 'VN',
          category: 'tax',
          search_query: 'Luật thuế site:thuvienphapluat.vn',
          crawl_frequency: 'weekly',
          is_active: true,
          properties: { priority: 0.5, supports_download: false, html_fulltext: true },
        },
        {
          source_name: 'TVPL - Quảng cáo & Marketing',
          source_url: 'https://thuvienphapluat.vn',
          jurisdiction: 'VN',
          category: 'advertising',
          search_query: 'Luật quảng cáo site:thuvienphapluat.vn',
          crawl_frequency: 'weekly',
          is_active: true,
          properties: { priority: 0.5, supports_download: false, html_fulltext: true },
        },
        {
          source_name: 'TVPL - Bất động sản',
          source_url: 'https://thuvienphapluat.vn',
          jurisdiction: 'VN',
          category: 'land',
          search_query: 'Luật đất đai site:thuvienphapluat.vn',
          crawl_frequency: 'weekly',
          is_active: true,
          properties: { priority: 0.5, supports_download: false, html_fulltext: true },
        },
        {
          source_name: 'TVPL - Ngân hàng & Tài chính',
          source_url: 'https://thuvienphapluat.vn',
          jurisdiction: 'VN',
          category: 'finance',
          search_query: 'Luật ngân hàng site:thuvienphapluat.vn',
          crawl_frequency: 'weekly',
          is_active: true,
          properties: { priority: 0.5, supports_download: false, html_fulltext: true },
        },
        {
          source_name: 'TVPL - Thực phẩm & Y tế',
          source_url: 'https://thuvienphapluat.vn',
          jurisdiction: 'VN',
          category: 'general',
          search_query: 'Luật an toàn thực phẩm site:thuvienphapluat.vn',
          crawl_frequency: 'weekly',
          is_active: true,
          properties: { priority: 0.5, supports_download: false, html_fulltext: true },
        },
        {
          source_name: 'TVPL - Lao động',
          source_url: 'https://thuvienphapluat.vn',
          jurisdiction: 'VN',
          category: 'labor',
          search_query: 'Bộ luật lao động site:thuvienphapluat.vn',
          crawl_frequency: 'weekly',
          is_active: true,
          properties: { priority: 0.5, supports_download: false, html_fulltext: true },
        },
      ];

      // Check existing sources to avoid duplicates
      const { data: existing } = await supabase
        .from('regulation_sources')
        .select('source_name');

      const existingNames = new Set((existing || []).map((s: { source_name: string }) => s.source_name));
      const toInsert = vnSources.filter(s => !existingNames.has(s.source_name));

      if (toInsert.length === 0) {
        return { inserted: 0, skipped: vnSources.length };
      }

      const { error } = await supabase
        .from('regulation_sources')
        .insert(toInsert);

      if (error) throw error;
      return { inserted: toInsert.length, skipped: vnSources.length - toInsert.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: regulationSourcesKeys.list() });
      toast({
        title: 'Seed hoàn tất',
        description: `Đã thêm ${data.inserted} nguồn VN (VBPL.vn + TVPL), bỏ qua ${data.skipped} nguồn đã tồn tại`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Lỗi Seed',
        description: error instanceof Error ? error.message : 'Không thể seed dữ liệu',
        variant: 'destructive',
      });
    },
  });

  return {
    // Data
    sources,
    crawlHistory,
    
    // Loading states
    isLoadingSources,
    isLoadingHistory,
    isCrawling: triggerCrawlMutation.isPending,
    crawlingTarget, // NEW: expose which target is being crawled
    isCreating: createSourceMutation.isPending,
    isUpdating: updateSourceMutation.isPending,
    isDeleting: deleteSourceMutation.isPending,
    isSeeding: seedInitialSourcesMutation.isPending,
    
    // Errors
    sourcesError,
    
    // Actions
    createSource: createSourceMutation.mutate,
    updateSource: updateSourceMutation.mutate,
    deleteSource: deleteSourceMutation.mutate,
    toggleSourceActive,
    triggerCrawl: triggerCrawlMutation.mutate,
    triggerCrawlAsync: triggerCrawlMutation.mutateAsync,
    seedInitialSources: seedInitialSourcesMutation.mutate,
    
    // Refetch
    refetchSources,
    refetchHistory,
  };
}

export default useRegulationSources;

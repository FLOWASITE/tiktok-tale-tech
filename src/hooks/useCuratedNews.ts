import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { CuratedNews } from '@/types/curatedData';

export function useCuratedNews() {
  const { currentOrganization } = useOrganizationContext();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.id;

  const { data: news = [], isLoading, error, refetch } = useQuery({
    queryKey: ['curated-news', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curated_news')
        .select('*')
        .order('news_date', { ascending: false });
      
      if (error) throw error;
      return data as CuratedNews[];
    },
    enabled: true,
  });

  const createNews = useMutation({
    mutationFn: async (newsItem: Partial<CuratedNews>) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('curated_news')
        .insert([{
          title: newsItem.title!,
          summary: newsItem.summary || null,
          source_url: newsItem.source_url || null,
          news_date: newsItem.news_date || new Date().toISOString().split('T')[0],
          expires_at: newsItem.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          industries: newsItem.industries || [],
          relevance_score: newsItem.relevance_score || 50,
          suggested_angles: newsItem.suggested_angles || [],
          is_active: newsItem.is_active ?? true,
          organization_id: orgId || null,
          created_by: userData.user?.id || null,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curated-news'] });
      toast.success('Đã thêm tin tức mới');
    },
    onError: (error) => {
      toast.error('Không thể thêm tin tức: ' + error.message);
    },
  });

  const updateNews = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CuratedNews> & { id: string }) => {
      const { data, error } = await supabase
        .from('curated_news')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curated-news'] });
      toast.success('Đã cập nhật tin tức');
    },
    onError: (error) => {
      toast.error('Không thể cập nhật: ' + error.message);
    },
  });

  const deleteNews = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('curated_news')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curated-news'] });
      toast.success('Đã xóa tin tức');
    },
    onError: (error) => {
      toast.error('Không thể xóa: ' + error.message);
    },
  });

  // Get active news (not expired)
  const getActiveNews = useCallback(() => {
    const now = new Date();
    return news.filter(item => {
      if (!item.is_active) return false;
      const expiresAt = new Date(item.expires_at);
      return expiresAt > now;
    });
  }, [news]);

  return {
    news,
    isLoading,
    error,
    refetch,
    createNews: createNews.mutate,
    updateNews: updateNews.mutate,
    deleteNews: deleteNews.mutate,
    isCreating: createNews.isPending,
    isUpdating: updateNews.isPending,
    isDeleting: deleteNews.isPending,
    getActiveNews,
  };
}

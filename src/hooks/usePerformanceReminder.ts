import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PendingPerformanceItem {
  id: string;
  topic: string;
  contentId: string;
  contentType: 'multichannel' | 'script' | 'carousel';
  contentTitle: string;
  publishedAt: string;
  daysSincePublish: number;
}

interface UsePerformanceReminderOptions {
  enabled?: boolean;
  minHoursSincePublish?: number;
}

export function usePerformanceReminder(options: UsePerformanceReminderOptions = {}) {
  const { enabled = true, minHoursSincePublish = 24 } = options;
  
  const [pendingItems, setPendingItems] = useState<PendingPerformanceItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPendingItems = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPendingItems([]);
        return;
      }

      // Get user's organization
      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle();

      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - minHoursSincePublish);
      const cutoffISO = cutoffDate.toISOString();

      // Query topic_history for items that:
      // 1. Have been published (usage_status = 'published' or published_at is not null)
      // 2. Don't have a performance_score
      // 3. Were published more than minHoursSincePublish ago
      let query = supabase
        .from('topic_history')
        .select(`
          id,
          topic,
          content_id,
          content_type,
          published_at,
          performance_score
        `)
        .eq('usage_status', 'published')
        .is('performance_score', null)
        .not('content_id', 'is', null)
        .not('published_at', 'is', null)
        .lt('published_at', cutoffISO)
        .order('published_at', { ascending: false })
        .limit(10);

      if (membership?.organization_id) {
        query = query.eq('organization_id', membership.organization_id);
      } else {
        query = query.eq('user_id', user.id);
      }

      const { data: topicData, error: topicError } = await query;

      if (topicError) throw topicError;

      if (!topicData || topicData.length === 0) {
        setPendingItems([]);
        return;
      }

      // Fetch content titles for each item
      const items: PendingPerformanceItem[] = [];

      for (const topic of topicData) {
        let contentTitle = 'Nội dung không xác định';
        
        if (topic.content_type === 'multichannel' && topic.content_id) {
          const { data: content } = await supabase
            .from('multi_channel_contents')
            .select('title')
            .eq('id', topic.content_id)
            .maybeSingle();
          if (content?.title) contentTitle = content.title;
        } else if (topic.content_type === 'script' && topic.content_id) {
          const { data: script } = await supabase
            .from('scripts')
            .select('title')
            .eq('id', topic.content_id)
            .maybeSingle();
          if (script?.title) contentTitle = script.title;
        } else if (topic.content_type === 'carousel' && topic.content_id) {
          const { data: carousel } = await supabase
            .from('carousels')
            .select('title')
            .eq('id', topic.content_id)
            .maybeSingle();
          if (carousel?.title) contentTitle = carousel.title;
        }

        const publishedDate = new Date(topic.published_at!);
        const now = new Date();
        const daysSincePublish = Math.floor((now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60 * 24));

        items.push({
          id: topic.id,
          topic: topic.topic,
          contentId: topic.content_id!,
          contentType: topic.content_type as 'multichannel' | 'script' | 'carousel',
          contentTitle,
          publishedAt: topic.published_at!,
          daysSincePublish,
        });
      }

      setPendingItems(items);
    } catch (err) {
      console.error('Error fetching pending performance items:', err);
      setError('Không thể tải danh sách cần cập nhật');
    } finally {
      setIsLoading(false);
    }
  }, [enabled, minHoursSincePublish]);

  useEffect(() => {
    fetchPendingItems();
  }, [fetchPendingItems]);

  const dismissItem = useCallback((id: string) => {
    setPendingItems(prev => prev.filter(item => item.id !== id));
  }, []);

  return {
    pendingItems,
    isLoading,
    error,
    refetch: fetchPendingItems,
    dismissItem,
    hasPendingItems: pendingItems.length > 0,
    pendingCount: pendingItems.length,
  };
}

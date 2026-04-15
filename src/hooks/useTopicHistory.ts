import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { 
  EnhancedTopicSuggestion, 
  TopicCategory, 
  TopicFormat, 
  TopicScores,
  calculateOverallScore 
} from '@/types/topicDiscovery';
import { ContentGoal } from '@/types/multichannel';
import { toast } from 'sonner';

export type UsageStatus = 'draft' | 'suggested' | 'selected' | 'created' | 'published';
export type FeedbackType = 'positive' | 'negative' | 'neutral';

export interface TopicHistoryItem {
  id: string;
  topic: string;
  category: TopicCategory;
  contentGoal: ContentGoal;
  format: TopicFormat;
  pillar?: string;
  contentId?: string;
  contentType?: 'carousel' | 'script' | 'multichannel';
  campaignId?: string;
  scores?: TopicScores;
  relatedKeywords?: string[];
  reasoning?: string;
  wasUsed: boolean;
  usageStatus: UsageStatus;
  performanceScore?: number;
  actualEngagement?: {
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
  };
  isFavorite: boolean;
  feedback?: FeedbackType;
  feedbackNote?: string;
  createdAt: string;
  usedAt?: string;
  publishedAt?: string;
}

interface TopicHistoryStats {
  totalTopics: number;
  usedTopics: number;
  averagePerformance: number;
  topPillar: string | null;
  mostUsedCategory: TopicCategory | null;
  suggestionToUsageRate: number;
  favoriteCount: number;
}

interface UseTopicHistoryOptions {
  brandTemplateId?: string;
  contentGoal?: ContentGoal;
  format?: TopicFormat;
  formats?: TopicFormat[]; // Filter by multiple formats
  campaignId?: string; // Filter by campaign
  limit?: number;
  enabled?: boolean;
  excludeDrafts?: boolean; // Exclude draft status topics
}

export function useTopicHistory(options: UseTopicHistoryOptions = {}) {
  const { brandTemplateId, contentGoal, format, formats, campaignId, limit = 50, enabled = true, excludeDrafts = false } = options;
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();
  
  const [history, setHistory] = useState<TopicHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch history
  const fetchHistory = useCallback(async () => {
    if (!enabled || !user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('topic_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (currentOrganization?.id) {
        query = query.eq('organization_id', currentOrganization.id);
      } else {
        query = query.eq('user_id', user.id);
      }

      if (brandTemplateId) {
        query = query.eq('brand_template_id', brandTemplateId);
      }

      if (contentGoal) {
        query = query.eq('content_goal', contentGoal);
      }

      if (format) {
        query = query.eq('format', format);
      }

      // Filter by multiple formats (OR condition)
      if (formats && formats.length > 0) {
        query = query.in('format', formats);
      }

      // Filter by campaign
      if (campaignId) {
        query = query.eq('campaign_id', campaignId);
      }

      // Exclude draft status if specified
      if (excludeDrafts) {
        query = query.neq('usage_status', 'draft');
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const mappedData: TopicHistoryItem[] = (data || []).map(item => ({
        id: item.id,
        topic: item.topic,
        category: item.category as TopicCategory,
        contentGoal: item.content_goal as ContentGoal,
        format: item.format as TopicFormat,
        pillar: item.pillar,
        contentId: item.content_id,
        contentType: item.content_type as 'carousel' | 'script' | 'multichannel' | undefined,
        campaignId: item.campaign_id || undefined,
        scores: item.scores as unknown as TopicScores | undefined,
        relatedKeywords: item.related_keywords,
        reasoning: item.reasoning,
        wasUsed: item.was_used,
        usageStatus: item.usage_status as UsageStatus,
        performanceScore: item.performance_score,
        actualEngagement: item.actual_engagement as TopicHistoryItem['actualEngagement'],
        isFavorite: item.is_favorite,
        feedback: item.feedback as FeedbackType | undefined,
        feedbackNote: item.feedback_note,
        createdAt: item.created_at,
        usedAt: item.used_at,
        publishedAt: item.published_at,
      }));

      setHistory(mappedData);
    } catch (err) {
      console.error('Error fetching topic history:', err);
      setError('Không thể tải lịch sử topic');
    } finally {
      setIsLoading(false);
    }
  }, [user, currentOrganization?.id, brandTemplateId, contentGoal, format, campaignId, limit, enabled]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Save topic to history
  const saveTopic = useCallback(async (
    topic: EnhancedTopicSuggestion,
    status: UsageStatus = 'selected',
    topicFormat: TopicFormat = 'multichannel'
  ) => {
    if (!user) return null;

    setIsSaving(true);
    try {
      const insertData = {
        topic: topic.topic,
        category: topic.category,
        content_goal: contentGoal || 'education',
        format: topicFormat,
        pillar: topic.pillar,
        scores: topic.scores || {},
        related_keywords: topic.relatedKeywords || [],
        reasoning: topic.reasoning,
        usage_status: status,
        was_used: status !== 'suggested',
        user_id: user.id,
        organization_id: currentOrganization?.id || null,
        brand_template_id: brandTemplateId || null,
      };

      const { data, error: insertError } = await supabase
        .from('topic_history')
        .insert(insertData)
        .select()
        .single();

      if (insertError) throw insertError;

      // Update local state
      const newItem: TopicHistoryItem = {
        id: data.id,
        topic: data.topic,
        category: data.category as TopicCategory,
        contentGoal: data.content_goal as ContentGoal,
        format: data.format as TopicFormat,
        pillar: data.pillar,
        scores: data.scores as unknown as TopicScores | undefined,
        relatedKeywords: data.related_keywords,
        reasoning: data.reasoning,
        wasUsed: data.was_used,
        usageStatus: data.usage_status as UsageStatus,
        isFavorite: data.is_favorite,
        createdAt: data.created_at,
      };

      setHistory(prev => [newItem, ...prev]);
      return data.id;
    } catch (err) {
      console.error('Error saving topic:', err);
      toast.error('Không thể lưu topic');
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [user, currentOrganization?.id, brandTemplateId, contentGoal]);

  // Mark topic as used with content reference
  const markAsUsed = useCallback(async (
    topicId: string,
    contentId: string,
    contentType: 'carousel' | 'script' | 'multichannel'
  ) => {
    try {
      const { error: updateError } = await supabase
        .from('topic_history')
        .update({
          content_id: contentId,
          content_type: contentType,
          was_used: true,
          usage_status: 'created',
          used_at: new Date().toISOString(),
        })
        .eq('id', topicId);

      if (updateError) throw updateError;

      setHistory(prev => prev.map(item => 
        item.id === topicId 
          ? { ...item, contentId, contentType, wasUsed: true, usageStatus: 'created', usedAt: new Date().toISOString() }
          : item
      ));
    } catch (err) {
      console.error('Error marking topic as used:', err);
    }
  }, []);

  // Mark topic as selected (when user picks from history)
  const markAsSelected = useCallback(async (topicId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('topic_history')
        .update({
          usage_status: 'selected',
          was_used: true,
          used_at: new Date().toISOString(),
        })
        .eq('id', topicId);

      if (updateError) throw updateError;

      setHistory(prev => prev.map(item =>
        item.id === topicId
          ? { ...item, usageStatus: 'selected', wasUsed: true, usedAt: new Date().toISOString() }
          : item
      ));
    } catch (err) {
      console.error('Error marking topic as selected:', err);
    }
  }, []);

  // Mark topic as published
  const markAsPublished = useCallback(async (topicId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('topic_history')
        .update({
          usage_status: 'published',
          published_at: new Date().toISOString(),
        })
        .eq('id', topicId);

      if (updateError) throw updateError;

      setHistory(prev => prev.map(item => 
        item.id === topicId 
          ? { ...item, usageStatus: 'published', publishedAt: new Date().toISOString() }
          : item
      ));
    } catch (err) {
      console.error('Error marking topic as published:', err);
    }
  }, []);

  // Update performance score
  const updatePerformance = useCallback(async (
    topicId: string,
    performanceScore: number,
    actualEngagement?: TopicHistoryItem['actualEngagement']
  ) => {
    try {
      const { error: updateError } = await supabase
        .from('topic_history')
        .update({
          performance_score: performanceScore,
          actual_engagement: actualEngagement || {},
        })
        .eq('id', topicId);

      if (updateError) throw updateError;

      setHistory(prev => prev.map(item => 
        item.id === topicId 
          ? { ...item, performanceScore, actualEngagement }
          : item
      ));
    } catch (err) {
      console.error('Error updating performance:', err);
    }
  }, []);

  // Toggle favorite
  const toggleFavorite = useCallback(async (topicId: string) => {
    const item = history.find(h => h.id === topicId);
    if (!item) return;

    const newValue = !item.isFavorite;

    try {
      const { error: updateError } = await supabase
        .from('topic_history')
        .update({ is_favorite: newValue })
        .eq('id', topicId);

      if (updateError) throw updateError;

      setHistory(prev => prev.map(h => 
        h.id === topicId ? { ...h, isFavorite: newValue } : h
      ));

      toast.success(newValue ? 'Đã thêm vào yêu thích' : 'Đã bỏ yêu thích');
    } catch (err) {
      console.error('Error toggling favorite:', err);
      toast.error('Không thể cập nhật');
    }
  }, [history]);

  // Submit feedback
  const submitFeedback = useCallback(async (
    topicId: string,
    feedback: FeedbackType,
    feedbackNote?: string
  ) => {
    try {
      const { error: updateError } = await supabase
        .from('topic_history')
        .update({
          feedback,
          feedback_note: feedbackNote || null,
        })
        .eq('id', topicId);

      if (updateError) throw updateError;

      setHistory(prev => prev.map(h => 
        h.id === topicId ? { ...h, feedback, feedbackNote } : h
      ));

      toast.success('Cảm ơn phản hồi của bạn!');
    } catch (err) {
      console.error('Error submitting feedback:', err);
      toast.error('Không thể gửi phản hồi');
    }
  }, []);

  // Delete topic
  const deleteTopic = useCallback(async (topicId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('topic_history')
        .delete()
        .eq('id', topicId);

      if (deleteError) throw deleteError;

      setHistory(prev => prev.filter(h => h.id !== topicId));
      toast.success('Đã xóa topic');
    } catch (err) {
      console.error('Error deleting topic:', err);
      toast.error('Không thể xóa topic');
    }
  }, []);

  // Link topic to campaign
  const linkToCampaign = useCallback(async (topicId: string, campaignIdToLink: string | null) => {
    try {
      const { error: updateError } = await supabase
        .from('topic_history')
        .update({ campaign_id: campaignIdToLink })
        .eq('id', topicId);

      if (updateError) throw updateError;

      setHistory(prev => prev.map(h =>
        h.id === topicId ? { ...h, campaignId: campaignIdToLink || undefined } : h
      ));

      toast.success(campaignIdToLink ? 'Đã liên kết với chiến dịch' : 'Đã bỏ liên kết chiến dịch');
    } catch (err) {
      console.error('Error linking to campaign:', err);
      toast.error('Không thể cập nhật liên kết chiến dịch');
    }
  }, []);

  // Save bulk topics (for auto-saving AI suggestions as drafts)
  const saveBulkTopics = useCallback(async (
    topics: EnhancedTopicSuggestion[],
    status: UsageStatus = 'draft',
    topicFormat: TopicFormat = 'multichannel'
  ): Promise<string[]> => {
    if (!user || topics.length === 0) return [];

    setIsSaving(true);
    const savedIds: string[] = [];

    try {
      const insertData = topics.map(topic => ({
        topic: topic.topic,
        category: topic.category,
        content_goal: contentGoal || 'education',
        format: topicFormat,
        pillar: topic.pillar || null,
        scores: topic.scores || {},
        related_keywords: topic.relatedKeywords || [],
        reasoning: topic.reasoning || null,
        usage_status: status,
        was_used: false,
        is_favorite: false,
        user_id: user.id,
        organization_id: currentOrganization?.id || null,
        brand_template_id: brandTemplateId || null,
      }));

      const { data, error: insertError } = await supabase
        .from('topic_history')
        .insert(insertData)
        .select();

      if (insertError) throw insertError;

      // Update local state
      const newItems: TopicHistoryItem[] = (data || []).map(item => ({
        id: item.id,
        topic: item.topic,
        category: item.category as TopicCategory,
        contentGoal: item.content_goal as ContentGoal,
        format: item.format as TopicFormat,
        pillar: item.pillar,
        scores: item.scores as unknown as TopicScores | undefined,
        relatedKeywords: item.related_keywords,
        reasoning: item.reasoning,
        wasUsed: item.was_used,
        usageStatus: item.usage_status as UsageStatus,
        isFavorite: item.is_favorite,
        createdAt: item.created_at,
      }));

      setHistory(prev => [...newItems, ...prev]);
      savedIds.push(...(data || []).map(d => d.id));

      return savedIds;
    } catch (err) {
      console.error('Error bulk saving topics:', err);
      return [];
    } finally {
      setIsSaving(false);
    }
  }, [user, currentOrganization?.id, brandTemplateId, contentGoal]);

  // Check which topics already exist in history
  const checkExistingTopics = useCallback((topics: EnhancedTopicSuggestion[]): EnhancedTopicSuggestion[] => {
    const existingTopicTexts = new Set(history.map(h => h.topic.toLowerCase().trim()));
    return topics.filter(t => !existingTopicTexts.has(t.topic.toLowerCase().trim()));
  }, [history]);

  // Confirm/Keep a draft topic (change status from draft to suggested)
  const confirmDraft = useCallback(async (topicId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('topic_history')
        .update({ usage_status: 'suggested' })
        .eq('id', topicId);

      if (updateError) throw updateError;

      setHistory(prev => prev.map(h =>
        h.id === topicId ? { ...h, usageStatus: 'suggested' } : h
      ));

      toast.success('Đã lưu vào ngân hàng ý tưởng');
    } catch (err) {
      console.error('Error confirming draft:', err);
      toast.error('Không thể xác nhận topic');
    }
  }, []);

  // Get draft topics
  const drafts = useMemo(() =>
    history.filter(h => h.usageStatus === 'draft'),
    [history]
  );

  // Computed values
  const favorites = useMemo(() => 
    history.filter(h => h.isFavorite),
    [history]
  );

  const topPerformers = useMemo(() => 
    history
      .filter(h => h.performanceScore !== undefined && h.performanceScore >= 70)
      .sort((a, b) => (b.performanceScore || 0) - (a.performanceScore || 0))
      .slice(0, 10),
    [history]
  );

  const recentlyUsed = useMemo(() => 
    history
      .filter(h => h.wasUsed)
      .slice(0, 10),
    [history]
  );

  const stats: TopicHistoryStats = useMemo(() => {
    const usedTopics = history.filter(h => h.wasUsed);
    const withPerformance = history.filter(h => h.performanceScore !== undefined);
    
    // Calculate most used category
    const categoryCount: Record<string, number> = {};
    history.forEach(h => {
      categoryCount[h.category] = (categoryCount[h.category] || 0) + 1;
    });
    const mostUsedCategory = Object.entries(categoryCount)
      .sort(([, a], [, b]) => b - a)[0]?.[0] as TopicCategory | undefined;

    // Calculate top pillar
    const pillarCount: Record<string, number> = {};
    history.filter(h => h.pillar).forEach(h => {
      pillarCount[h.pillar!] = (pillarCount[h.pillar!] || 0) + 1;
    });
    const topPillar = Object.entries(pillarCount)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || null;

    return {
      totalTopics: history.length,
      usedTopics: usedTopics.length,
      averagePerformance: withPerformance.length > 0
        ? Math.round(withPerformance.reduce((sum, h) => sum + (h.performanceScore || 0), 0) / withPerformance.length)
        : 0,
      topPillar,
      mostUsedCategory: mostUsedCategory || null,
      suggestionToUsageRate: history.length > 0
        ? Math.round((usedTopics.length / history.length) * 100)
        : 0,
      favoriteCount: favorites.length,
    };
  }, [history, favorites.length]);

  // Get learning context for AI
  const getLearningContext = useCallback(() => {
    const topPerformerTopics = topPerformers.map(t => t.topic).slice(0, 5);
    const recentTopics = history.slice(0, 10).map(t => t.topic);
    const negativeFeedback = history
      .filter(h => h.feedback === 'negative')
      .map(h => h.topic)
      .slice(0, 5);
    
    const preferredCategories = Object.entries(
      history.reduce((acc, h) => {
        if (h.wasUsed) acc[h.category] = (acc[h.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    )
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([cat]) => cat);

    const preferredPillars = Object.entries(
      history.reduce((acc, h) => {
        if (h.pillar && h.wasUsed) acc[h.pillar] = (acc[h.pillar] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    )
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([pillar]) => pillar);

    return {
      topPerformers: topPerformerTopics,
      recentTopics,
      negativeFeedback,
      preferredCategories,
      preferredPillars,
    };
  }, [history, topPerformers]);

  // Find or create a topic_history row and return its ID
  const ensureSelectedTopic = useCallback(async (
    topicText: string,
    topicFormat: TopicFormat = 'multichannel'
  ): Promise<string | null> => {
    if (!user) return null;

    try {
      // Try to find existing row with same topic text for this org
      let query = supabase
        .from('topic_history')
        .select('id, usage_status')
        .eq('topic', topicText)
        .limit(1);

      if (currentOrganization?.id) {
        query = query.eq('organization_id', currentOrganization.id);
      } else {
        query = query.eq('user_id', user.id);
      }

      const { data: existing } = await query;

      if (existing && existing.length > 0) {
        const row = existing[0];
        // Update to selected if not already created/published
        if (!['created', 'published'].includes(row.usage_status)) {
          await supabase
            .from('topic_history')
            .update({ usage_status: 'selected', was_used: true, used_at: new Date().toISOString() })
            .eq('id', row.id);
          setHistory(prev => prev.map(h =>
            h.id === row.id ? { ...h, usageStatus: 'selected', wasUsed: true, usedAt: new Date().toISOString() } : h
          ));
        }
        return row.id;
      }

      // Insert new row
      const { data: newRow, error: insertError } = await supabase
        .from('topic_history')
        .insert({
          topic: topicText,
          category: 'evergreen',
          content_goal: contentGoal || 'education',
          format: topicFormat,
          usage_status: 'selected',
          was_used: true,
          used_at: new Date().toISOString(),
          user_id: user.id,
          organization_id: currentOrganization?.id || null,
          brand_template_id: brandTemplateId || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const newItem: TopicHistoryItem = {
        id: newRow.id,
        topic: newRow.topic,
        category: newRow.category as TopicCategory,
        contentGoal: newRow.content_goal as ContentGoal,
        format: newRow.format as TopicFormat,
        pillar: newRow.pillar,
        scores: newRow.scores as unknown as TopicScores | undefined,
        relatedKeywords: newRow.related_keywords,
        reasoning: newRow.reasoning,
        wasUsed: true,
        usageStatus: 'selected',
        isFavorite: false,
        createdAt: newRow.created_at,
        usedAt: newRow.used_at,
      };
      setHistory(prev => [newItem, ...prev]);
      return newRow.id;
    } catch (err) {
      console.error('Error ensuring selected topic:', err);
      return null;
    }
  }, [user, currentOrganization?.id, brandTemplateId, contentGoal]);

  return {
    history,
    drafts,
    favorites,
    topPerformers,
    recentlyUsed,
    stats,
    isLoading,
    isSaving,
    error,
    saveTopic,
    saveBulkTopics,
    checkExistingTopics,
    confirmDraft,
    markAsSelected,
    markAsUsed,
    markAsPublished,
    updatePerformance,
    toggleFavorite,
    submitFeedback,
    deleteTopic,
    linkToCampaign,
    ensureSelectedTopic,
    refresh: fetchHistory,
    getLearningContext,
  };
}

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface TrendingTopic {
  id: string;
  topic: string;
  category: string;
  velocity_score: number;
  peak_status: 'rising' | 'peaking' | 'declining';
  peak_prediction: string;
  related_keywords: string[];
  engagement_potential: number;
  competition_level: 'low' | 'medium' | 'high';
  suggested_angles: string[];
  source: string;
  created_at: string;
  expires_at: string;
}

type AIErrorCode = 'RATE_LIMIT' | 'CREDITS_EXHAUSTED' | null;

interface UseTrendingTopicsOptions {
  brandTemplateId?: string;
}

export function useTrendingTopics(options: UseTrendingTopicsOptions = {}) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();
  const [topics, setTopics] = useState<TrendingTopic[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<AIErrorCode>(null);
  const [source, setSource] = useState<'cache' | 'ai' | null>(null);

  const fetchTrendingTopics = useCallback(async (forceRefresh = false) => {
    if (!user || !currentOrganization) {
      setError('Cần đăng nhập và chọn tổ chức');
      return;
    }

    setIsLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('discover-trending-topics', {
        body: {
          brandTemplateId: options.brandTemplateId,
          organizationId: currentOrganization.id,
          forceRefresh,
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (!data.success) {
        if (data.errorCode === 'RATE_LIMIT') {
          setErrorCode('RATE_LIMIT');
          toast.error('Đã vượt giới hạn. Vui lòng thử lại sau.');
        } else if (data.errorCode === 'CREDITS_EXHAUSTED') {
          setErrorCode('CREDITS_EXHAUSTED');
          toast.error('Đã hết credits AI. Vui lòng nâng cấp gói.');
        } else {
          throw new Error(data.error || 'Không thể lấy trending topics');
        }
        return;
      }

      setTopics(data.data || []);
      setSource(data.source);
      
      if (data.source === 'ai') {
        toast.success(`Đã phát hiện ${data.data?.length || 0} xu hướng mới`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi không xác định';
      setError(message);
      toast.error('Lỗi khi lấy trending topics: ' + message);
    } finally {
      setIsLoading(false);
    }
  }, [user, currentOrganization, options.brandTemplateId]);

  const refresh = useCallback(() => {
    return fetchTrendingTopics(true);
  }, [fetchTrendingTopics]);

  const clearTopics = useCallback(() => {
    setTopics([]);
    setSource(null);
    setError(null);
    setErrorCode(null);
  }, []);

  return {
    topics,
    isLoading,
    error,
    errorCode,
    source,
    fetchTrendingTopics,
    refresh,
    clearTopics,
  };
}

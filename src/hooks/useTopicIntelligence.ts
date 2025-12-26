import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { ContentGoal } from '@/types/multichannel';
import { toast } from 'sonner';

export interface TopicGap {
  pillar: string;
  gapType: 'missing' | 'underperforming' | 'overdue';
  severity: 'high' | 'medium' | 'low';
  reason: string;
  suggestedTopics: string[];
  priority: number;
}

export interface TopicCluster {
  clusterId: string;
  clusterName: string;
  topics: string[];
  topKeywords: string[];
  avgPerformance: number;
}

export interface KeywordExpansion {
  lsiKeywords: string[];
  trendingKeywords: string[];
  longTailKeywords: string[];
  competitorKeywords: string[];
  keywordClusters: { theme: string; keywords: string[] }[];
}

export interface TopicRefinement {
  original: string;
  refinedVersions: {
    topic: string;
    improvement: string;
    angle: string;
    brandFitScore: number;
  }[];
  bestChoice: string;
  reasoning: string;
}

export interface GapAnalysisResult {
  gaps: TopicGap[];
  insights: string;
  recommendations: string[];
}

export interface ClusterAnalysisResult {
  clusters: TopicCluster[];
  unclustered: string[];
  summary: string;
}

interface UseTopicIntelligenceOptions {
  brandTemplateId?: string;
  contentGoal?: ContentGoal;
}

// Error code type for specific error handling
export type AIErrorCode = 'CREDITS_EXHAUSTED' | 'RATE_LIMIT' | 'UNKNOWN';

export function useTopicIntelligence(options: UseTopicIntelligenceOptions = {}) {
  const { brandTemplateId, contentGoal } = options;
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();
  
  const [isLoading, setIsLoading] = useState(false);
  const [gaps, setGaps] = useState<GapAnalysisResult | null>(null);
  const [clusters, setClusters] = useState<ClusterAnalysisResult | null>(null);
  const [keywords, setKeywords] = useState<KeywordExpansion | null>(null);
  const [refinement, setRefinement] = useState<TopicRefinement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<AIErrorCode | null>(null);

  // Helper to handle API errors consistently
  const handleApiError = useCallback((err: any, fallbackMessage: string) => {
    console.error(fallbackMessage, err);
    
    // Check for specific error codes from edge function
    if (err?.context?.body) {
      try {
        const body = JSON.parse(err.context.body);
        if (body.errorCode === 'CREDITS_EXHAUSTED') {
          setError(body.error || 'AI credits đã hết');
          setErrorCode('CREDITS_EXHAUSTED');
          toast.error('AI credits đã hết. Vui lòng nạp thêm tại Settings → Usage.');
          return;
        }
        if (body.errorCode === 'RATE_LIMIT') {
          setError(body.error || 'Rate limit exceeded');
          setErrorCode('RATE_LIMIT');
          toast.error('Quá giới hạn request. Vui lòng thử lại sau.');
          return;
        }
      } catch {
        // Ignore parse errors
      }
    }
    
    // Check error message for 402/429 patterns
    const errMessage = err?.message || '';
    if (errMessage.includes('402') || errMessage.includes('credits')) {
      setError('AI credits đã hết');
      setErrorCode('CREDITS_EXHAUSTED');
      toast.error('AI credits đã hết. Vui lòng nạp thêm tại Settings → Usage.');
      return;
    }
    if (errMessage.includes('429') || errMessage.includes('rate')) {
      setError('Rate limit exceeded');
      setErrorCode('RATE_LIMIT');
      toast.error('Quá giới hạn request. Vui lòng thử lại sau.');
      return;
    }
    
    setError(errMessage || fallbackMessage);
    setErrorCode('UNKNOWN');
    toast.error(fallbackMessage);
  }, []);

  const analyzeGaps = useCallback(async () => {
    if (!user) return null;
    
    setIsLoading(true);
    setError(null);
    setErrorCode(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-topic-gaps', {
        body: {
          brandTemplateId,
          contentGoal,
          organizationId: currentOrganization?.id,
          analysisType: 'gap',
        },
      });

      if (fnError) throw fnError;
      
      if (data.success && data.result?.gaps) {
        setGaps(data.result as GapAnalysisResult);
        return data.result as GapAnalysisResult;
      } else {
        if (data.errorCode) {
          handleApiError({ message: data.error, context: { body: JSON.stringify(data) } }, 'Không thể phân tích gaps');
          return null;
        }
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: any) {
      handleApiError(err, 'Không thể phân tích gaps');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, brandTemplateId, contentGoal, currentOrganization?.id, handleApiError]);

  const analyzeClusters = useCallback(async () => {
    if (!user) return null;
    
    setIsLoading(true);
    setError(null);
    setErrorCode(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-topic-gaps', {
        body: {
          brandTemplateId,
          contentGoal,
          organizationId: currentOrganization?.id,
          analysisType: 'cluster',
        },
      });

      if (fnError) throw fnError;
      
      if (data.success && data.result?.clusters) {
        setClusters(data.result as ClusterAnalysisResult);
        return data.result as ClusterAnalysisResult;
      } else {
        if (data.errorCode) {
          handleApiError({ message: data.error, context: { body: JSON.stringify(data) } }, 'Không thể phân cụm topics');
          return null;
        }
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: any) {
      handleApiError(err, 'Không thể phân cụm topics');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, brandTemplateId, contentGoal, currentOrganization?.id, handleApiError]);

  const expandKeywords = useCallback(async () => {
    if (!user) return null;
    
    setIsLoading(true);
    setError(null);
    setErrorCode(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-topic-gaps', {
        body: {
          brandTemplateId,
          contentGoal,
          organizationId: currentOrganization?.id,
          analysisType: 'keywords',
        },
      });

      if (fnError) throw fnError;
      
      if (data.success && data.result?.lsiKeywords) {
        setKeywords(data.result as KeywordExpansion);
        return data.result as KeywordExpansion;
      } else {
        if (data.errorCode) {
          handleApiError({ message: data.error, context: { body: JSON.stringify(data) } }, 'Không thể mở rộng keywords');
          return null;
        }
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: any) {
      handleApiError(err, 'Không thể mở rộng keywords');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, brandTemplateId, contentGoal, currentOrganization?.id, handleApiError]);

  const refineTopic = useCallback(async (topicToRefine: string) => {
    if (!user || !topicToRefine) return null;
    
    setIsLoading(true);
    setError(null);
    setErrorCode(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-topic-gaps', {
        body: {
          brandTemplateId,
          contentGoal,
          organizationId: currentOrganization?.id,
          analysisType: 'refine',
          topicToRefine,
        },
      });

      if (fnError) throw fnError;
      
      if (data.success && data.result?.refinedVersions) {
        setRefinement(data.result as TopicRefinement);
        return data.result as TopicRefinement;
      } else {
        if (data.errorCode) {
          handleApiError({ message: data.error, context: { body: JSON.stringify(data) } }, 'Không thể tinh chỉnh topic');
          return null;
        }
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: any) {
      handleApiError(err, 'Không thể tinh chỉnh topic');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, brandTemplateId, contentGoal, currentOrganization?.id, handleApiError]);

  const clearResults = useCallback(() => {
    setGaps(null);
    setClusters(null);
    setKeywords(null);
    setRefinement(null);
    setError(null);
    setErrorCode(null);
  }, []);

  return {
    isLoading,
    error,
    errorCode,
    // Gap Analysis
    gaps,
    analyzeGaps,
    // Clustering
    clusters,
    analyzeClusters,
    // Keyword Expansion
    keywords,
    expandKeywords,
    // Topic Refinement
    refinement,
    refineTopic,
    // Utils
    clearResults,
  };
}

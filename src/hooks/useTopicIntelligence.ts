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

  const analyzeGaps = useCallback(async () => {
    if (!user) return null;
    
    setIsLoading(true);
    setError(null);
    
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
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: any) {
      console.error('Gap analysis error:', err);
      setError(err.message);
      toast.error('Không thể phân tích gaps');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, brandTemplateId, contentGoal, currentOrganization?.id]);

  const analyzeClusters = useCallback(async () => {
    if (!user) return null;
    
    setIsLoading(true);
    setError(null);
    
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
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: any) {
      console.error('Cluster analysis error:', err);
      setError(err.message);
      toast.error('Không thể phân cụm topics');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, brandTemplateId, contentGoal, currentOrganization?.id]);

  const expandKeywords = useCallback(async () => {
    if (!user) return null;
    
    setIsLoading(true);
    setError(null);
    
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
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: any) {
      console.error('Keyword expansion error:', err);
      setError(err.message);
      toast.error('Không thể mở rộng keywords');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, brandTemplateId, contentGoal, currentOrganization?.id]);

  const refineTopic = useCallback(async (topicToRefine: string) => {
    if (!user || !topicToRefine) return null;
    
    setIsLoading(true);
    setError(null);
    
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
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: any) {
      console.error('Topic refinement error:', err);
      setError(err.message);
      toast.error('Không thể tinh chỉnh topic');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, brandTemplateId, contentGoal, currentOrganization?.id]);

  const clearResults = useCallback(() => {
    setGaps(null);
    setClusters(null);
    setKeywords(null);
    setRefinement(null);
    setError(null);
  }, []);

  return {
    isLoading,
    error,
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

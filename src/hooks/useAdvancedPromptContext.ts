import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ContentGoal } from '@/types/multichannel';
import { TopicFormat, TopicScores } from '@/types/topicDiscovery';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

interface BrandContext {
  brandName: string;
  brandPositioning?: string;
  toneOfVoice?: string[];
  preferredWords?: string[];
  forbiddenWords?: string[];
  industry?: string[];
  formality?: string;
  languageStyle?: string[];
  allowEmoji?: boolean;
  contentPillars?: ContentPillar[];
}

interface ContentPillar {
  name: string;
  weight: number;
  keywords: string[];
}

interface IndustryContext {
  targetAudience?: string;
  forbiddenTerms?: string[];
  complianceRulesCount: number;
  hasBrandVoice: boolean;
}

interface TopPerformerTopic {
  topic: string;
  score: number;
  category?: string;
  pillar?: string;
}

interface LearningContext {
  topPerformers: TopPerformerTopic[];
  recentTopics: string[];
  negativeFeedbackCount: number;
  preferredCategories: string[];
  preferredPillars: string[];
  averagePerformance: number;
  totalTopicsUsed: number;
}

export interface AdvancedPromptContext {
  brand: BrandContext | null;
  industry: IndustryContext | null;
  learning: LearningContext | null;
  qualityScore: PromptQualityScore;
}

export interface PromptQualityScore {
  brandContextScore: number;
  industryContextScore: number;
  learningDataScore: number;
  overallScore: number;
}

interface UseAdvancedPromptContextOptions {
  brandTemplateId?: string;
  contentGoal?: ContentGoal;
  format?: TopicFormat;
  enabled?: boolean;
}

export function useAdvancedPromptContext(options: UseAdvancedPromptContextOptions) {
  const { brandTemplateId, contentGoal, format, enabled = true } = options;
  const { currentOrganization } = useOrganizationContext();
  
  const [context, setContext] = useState<AdvancedPromptContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContext = useCallback(async () => {
    if (!enabled || !brandTemplateId) {
      setContext(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch brand template
      const { data: brandTemplate, error: brandError } = await supabase
        .from('brand_templates')
        .select(`
          brand_name,
          brand_positioning,
          tone_of_voice,
          preferred_words,
          forbidden_words,
          industry,
          formality_level,
          language_style,
          allow_emoji,
          content_pillars,
          industry_template_id
        `)
        .eq('id', brandTemplateId)
        .single();

      if (brandError) throw brandError;

      let brandContext: BrandContext | null = null;
      let industryContext: IndustryContext | null = null;

      if (brandTemplate) {
        brandContext = {
          brandName: brandTemplate.brand_name,
          brandPositioning: brandTemplate.brand_positioning || undefined,
          toneOfVoice: brandTemplate.tone_of_voice || undefined,
          preferredWords: brandTemplate.preferred_words || undefined,
          forbiddenWords: brandTemplate.forbidden_words || undefined,
          industry: brandTemplate.industry || undefined,
          formality: brandTemplate.formality_level || undefined,
          languageStyle: brandTemplate.language_style || undefined,
          allowEmoji: brandTemplate.allow_emoji ?? undefined,
          contentPillars: Array.isArray(brandTemplate.content_pillars) 
            ? (brandTemplate.content_pillars as unknown as ContentPillar[]) 
            : undefined,
        };

        // Fetch industry context if linked
        if (brandTemplate.industry_template_id) {
          const { data: industryData } = await supabase
            .from('industry_templates')
            .select(`
              target_audience,
              forbidden_terms,
              compliance_rules,
              brand_voice
            `)
            .eq('id', brandTemplate.industry_template_id)
            .single();

          if (industryData) {
            const complianceRules = industryData.compliance_rules as any[] || [];
            industryContext = {
              targetAudience: industryData.target_audience || undefined,
              forbiddenTerms: industryData.forbidden_terms || undefined,
              complianceRulesCount: complianceRules.length,
              hasBrandVoice: !!industryData.brand_voice,
            };
          }
        }
      }

      // Fetch learning context from topic history
      let learningContext: LearningContext | null = null;
      
      const { data: topicHistory } = await supabase
        .from('topic_history')
        .select('*')
        .eq('brand_template_id', brandTemplateId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (topicHistory && topicHistory.length > 0) {
        // Extract top performers
        const topPerformers = topicHistory
          .filter(t => t.was_used && t.performance_score && t.performance_score >= 60)
          .sort((a, b) => (b.performance_score || 0) - (a.performance_score || 0))
          .slice(0, 5)
          .map(t => ({
            topic: t.topic,
            score: t.performance_score || 0,
            category: t.category,
            pillar: t.pillar || undefined,
          }));

        // Recent topics (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentTopics = topicHistory
          .filter(t => new Date(t.created_at || '') > sevenDaysAgo)
          .map(t => t.topic)
          .slice(0, 10);

        // Negative feedback count
        const negativeFeedbackCount = topicHistory.filter(t => t.feedback === 'negative' || t.feedback === 'skip').length;

        // Preferred categories
        const categoryStats: Record<string, { count: number; totalScore: number }> = {};
        topicHistory.filter(t => t.was_used).forEach(t => {
          if (!categoryStats[t.category]) {
            categoryStats[t.category] = { count: 0, totalScore: 0 };
          }
          categoryStats[t.category].count++;
          categoryStats[t.category].totalScore += t.performance_score || 50;
        });

        const preferredCategories = Object.entries(categoryStats)
          .map(([cat, stats]) => ({
            category: cat,
            avgScore: stats.totalScore / stats.count,
          }))
          .filter(c => c.avgScore >= 60)
          .sort((a, b) => b.avgScore - a.avgScore)
          .slice(0, 3)
          .map(c => c.category);

        // Preferred pillars
        const pillarStats: Record<string, { count: number; totalScore: number }> = {};
        topicHistory.filter(t => t.was_used && t.pillar).forEach(t => {
          if (!pillarStats[t.pillar!]) {
            pillarStats[t.pillar!] = { count: 0, totalScore: 0 };
          }
          pillarStats[t.pillar!].count++;
          pillarStats[t.pillar!].totalScore += t.performance_score || 50;
        });

        const preferredPillars = Object.entries(pillarStats)
          .map(([pillar, stats]) => ({
            pillar,
            avgScore: stats.totalScore / stats.count,
          }))
          .filter(p => p.avgScore >= 60)
          .sort((a, b) => b.avgScore - a.avgScore)
          .slice(0, 3)
          .map(p => p.pillar);

        // Average performance
        const usedRecords = topicHistory.filter(t => t.was_used && t.performance_score !== null);
        const averagePerformance = usedRecords.length > 0
          ? Math.round(usedRecords.reduce((sum, t) => sum + (t.performance_score || 0), 0) / usedRecords.length)
          : 50;

        learningContext = {
          topPerformers,
          recentTopics,
          negativeFeedbackCount,
          preferredCategories,
          preferredPillars,
          averagePerformance,
          totalTopicsUsed: topicHistory.filter(t => t.was_used).length,
        };
      }

      // Calculate quality score
      const qualityScore = calculateQualityScore(brandContext, industryContext, learningContext);

      setContext({
        brand: brandContext,
        industry: industryContext,
        learning: learningContext,
        qualityScore,
      });
    } catch (err) {
      console.error('Error fetching advanced prompt context:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch context');
    } finally {
      setIsLoading(false);
    }
  }, [brandTemplateId, enabled]);

  useEffect(() => {
    fetchContext();
  }, [fetchContext]);

  return {
    context,
    isLoading,
    error,
    refresh: fetchContext,
  };
}

function calculateQualityScore(
  brand: BrandContext | null,
  industry: IndustryContext | null,
  learning: LearningContext | null
): PromptQualityScore {
  // Brand context score
  let brandScore = 0;
  if (brand) {
    brandScore += brand.brandName ? 20 : 0;
    brandScore += brand.brandPositioning ? 20 : 0;
    brandScore += (brand.toneOfVoice?.length || 0) > 0 ? 20 : 0;
    brandScore += (brand.preferredWords?.length || 0) > 0 ? 10 : 0;
    brandScore += (brand.forbiddenWords?.length || 0) > 0 ? 10 : 0;
    brandScore += (brand.contentPillars?.length || 0) > 0 ? 20 : 0;
  }

  // Industry context score
  let industryScore = 0;
  if (industry) {
    industryScore += industry.targetAudience ? 25 : 0;
    industryScore += (industry.forbiddenTerms?.length || 0) > 0 ? 25 : 0;
    industryScore += industry.complianceRulesCount > 0 ? 25 : 0;
    industryScore += industry.hasBrandVoice ? 25 : 0;
  }

  // Learning data score
  let learningScore = 0;
  if (learning) {
    learningScore += learning.totalTopicsUsed >= 10 ? 30 : learning.totalTopicsUsed * 3;
    learningScore += learning.topPerformers.length >= 5 ? 30 : learning.topPerformers.length * 6;
    learningScore += learning.negativeFeedbackCount > 0 ? 20 : 0;
    learningScore += learning.preferredCategories.length > 0 ? 10 : 0;
    learningScore += learning.preferredPillars.length > 0 ? 10 : 0;
  }

  // Overall weighted score
  const overallScore = Math.round(
    brandScore * 0.4 +
    industryScore * 0.3 +
    learningScore * 0.3
  );

  return {
    brandContextScore: Math.min(100, brandScore),
    industryContextScore: Math.min(100, industryScore),
    learningDataScore: Math.min(100, learningScore),
    overallScore: Math.min(100, overallScore),
  };
}

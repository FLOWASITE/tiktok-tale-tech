/**
 * Learning Context Utilities
 * 
 * Functions to fetch and process topic history for AI learning
 */

import { LearningContext, TopPerformerTopic, NegativeFeedbackItem } from './prompt-utils.ts';

interface TopicHistoryRecord {
  id: string;
  topic: string;
  category: string;
  format: string;
  pillar: string | null;
  content_goal: string;
  was_used: boolean;
  performance_score: number | null;
  feedback: string | null;
  feedback_note: string | null;
  scores: Record<string, number> | null;
  created_at: string;
  is_favorite: boolean;
  // Actual engagement metrics
  actual_engagement: {
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
  } | null;
  usage_status: string | null;
  published_at: string | null;
}

// Enhanced learning context with actual performance insights
export interface PerformanceInsight {
  topicPattern: string;
  avgScore: number;
  avgEngagement: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
  };
  sampleTopics: string[];
  count: number;
}

/**
 * Fetch learning context from topic_history table
 */
export async function fetchLearningContext(
  supabase: any,
  brandTemplateId: string | null,
  organizationId: string | null,
  limit: number = 50
): Promise<LearningContext | null> {
  try {
    // Build query
    let query = supabase
      .from('topic_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filter by brand template or organization
    if (brandTemplateId) {
      query = query.eq('brand_template_id', brandTemplateId);
    } else if (organizationId) {
      query = query.eq('organization_id', organizationId);
    } else {
      // No context available
      return null;
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      console.log('No topic history found for learning context');
      return null;
    }

    const records = data as TopicHistoryRecord[];

    // Extract top performers (used topics with high performance) - include actual engagement
    const topPerformers: TopPerformerTopic[] = records
      .filter(r => r.was_used && r.performance_score !== null && r.performance_score >= 60)
      .sort((a, b) => (b.performance_score || 0) - (a.performance_score || 0))
      .slice(0, 10)
      .map(r => ({
        topic: r.topic,
        score: r.performance_score || 0,
        category: r.category,
        pillar: r.pillar || undefined,
        format: r.format,
        // Include actual engagement data for richer context
        engagement: r.actual_engagement || undefined,
      }));

    // Analyze performance patterns by category
    const performanceByCategory: Record<string, { scores: number[]; engagement: typeof records[0]['actual_engagement'][] }> = {};
    records.filter(r => r.usage_status === 'published' && r.performance_score !== null).forEach(r => {
      if (!performanceByCategory[r.category]) {
        performanceByCategory[r.category] = { scores: [], engagement: [] };
      }
      performanceByCategory[r.category].scores.push(r.performance_score!);
      if (r.actual_engagement) {
        performanceByCategory[r.category].engagement.push(r.actual_engagement);
      }
    });

    // Calculate engagement averages for top performing categories
    const performanceInsights: PerformanceInsight[] = Object.entries(performanceByCategory)
      .filter(([_, data]) => data.scores.length >= 2)
      .map(([category, data]) => {
        const avgScore = Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length);
        const avgEngagement = {
          likes: Math.round(data.engagement.reduce((sum, e) => sum + (e?.likes || 0), 0) / Math.max(data.engagement.length, 1)),
          comments: Math.round(data.engagement.reduce((sum, e) => sum + (e?.comments || 0), 0) / Math.max(data.engagement.length, 1)),
          shares: Math.round(data.engagement.reduce((sum, e) => sum + (e?.shares || 0), 0) / Math.max(data.engagement.length, 1)),
          views: Math.round(data.engagement.reduce((sum, e) => sum + (e?.views || 0), 0) / Math.max(data.engagement.length, 1)),
        };
        const sampleTopics = records
          .filter(r => r.category === category && r.performance_score !== null && r.performance_score >= 70)
          .slice(0, 3)
          .map(r => r.topic);
        return {
          topicPattern: category,
          avgScore,
          avgEngagement,
          sampleTopics,
          count: data.scores.length,
        };
      })
      .filter(p => p.avgScore >= 60)
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 5);

    // Extract recent topics (last 7 days) to avoid repetition
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentTopics = records
      .filter(r => new Date(r.created_at) > sevenDaysAgo)
      .map(r => r.topic)
      .slice(0, 10);

    // Extract negative feedback items
    const negativeFeedback: NegativeFeedbackItem[] = records
      .filter(r => r.feedback === 'negative' || r.feedback === 'skip')
      .slice(0, 10)
      .map(r => ({
        topic: r.topic,
        feedback: r.feedback || 'negative',
        reason: r.feedback_note || undefined,
      }));

    // Calculate preferred categories (most used with good performance)
    const categoryStats: Record<string, { count: number; totalScore: number }> = {};
    records.filter(r => r.was_used).forEach(r => {
      if (!categoryStats[r.category]) {
        categoryStats[r.category] = { count: 0, totalScore: 0 };
      }
      categoryStats[r.category].count++;
      categoryStats[r.category].totalScore += r.performance_score || 50;
    });

    const preferredCategories = Object.entries(categoryStats)
      .map(([cat, stats]) => ({
        category: cat,
        avgScore: stats.totalScore / stats.count,
        count: stats.count,
      }))
      .filter(c => c.avgScore >= 60 && c.count >= 2)
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 3)
      .map(c => c.category);

    // Calculate preferred pillars
    const pillarStats: Record<string, { count: number; totalScore: number }> = {};
    records.filter(r => r.was_used && r.pillar).forEach(r => {
      if (!pillarStats[r.pillar!]) {
        pillarStats[r.pillar!] = { count: 0, totalScore: 0 };
      }
      pillarStats[r.pillar!].count++;
      pillarStats[r.pillar!].totalScore += r.performance_score || 50;
    });

    const preferredPillars = Object.entries(pillarStats)
      .map(([pillar, stats]) => ({
        pillar,
        avgScore: stats.totalScore / stats.count,
        count: stats.count,
      }))
      .filter(p => p.avgScore >= 60 && p.count >= 2)
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 3)
      .map(p => p.pillar);

    // Calculate average performance
    const usedRecords = records.filter(r => r.was_used && r.performance_score !== null);
    const averagePerformance = usedRecords.length > 0
      ? Math.round(usedRecords.reduce((sum, r) => sum + (r.performance_score || 0), 0) / usedRecords.length)
      : 50;

    const totalTopicsUsed = records.filter(r => r.was_used).length;

    // Calculate total engagement from published content
    const publishedRecords = records.filter(r => r.usage_status === 'published' && r.actual_engagement);
    const totalEngagement = {
      likes: publishedRecords.reduce((sum, r) => sum + (r.actual_engagement?.likes || 0), 0),
      comments: publishedRecords.reduce((sum, r) => sum + (r.actual_engagement?.comments || 0), 0),
      shares: publishedRecords.reduce((sum, r) => sum + (r.actual_engagement?.shares || 0), 0),
      views: publishedRecords.reduce((sum, r) => sum + (r.actual_engagement?.views || 0), 0),
    };

    console.log(`Learning context built: ${topPerformers.length} top performers, ${recentTopics.length} recent topics, ${negativeFeedback.length} negative feedback, ${performanceInsights.length} performance insights`);

    return {
      topPerformers,
      recentTopics,
      negativeFeedback,
      preferredCategories,
      preferredPillars,
      averagePerformance,
      totalTopicsUsed,
      // Enhanced performance data
      performanceInsights,
      totalEngagement,
      publishedCount: publishedRecords.length,
    };
  } catch (err) {
    console.error('Error fetching learning context:', err);
    return null;
  }
}

/**
 * Log prompt analytics for tracking and improvement
 */
export async function logPromptAnalytics(
  supabase: any,
  data: {
    functionName: string;
    contentId?: string;
    brandTemplateId?: string;
    organizationId?: string;
    contextRichnessScore: number;
    learningDataScore: number;
    executionTimeMs: number;
    tokenCount?: number;
    modelUsed?: string;
  }
): Promise<void> {
  try {
    await supabase.from('prompt_analytics').insert({
      function_name: data.functionName,
      content_id: data.contentId || null,
      brand_template_id: data.brandTemplateId || null,
      organization_id: data.organizationId || null,
      context_richness_score: data.contextRichnessScore,
      learning_data_score: data.learningDataScore,
      execution_time_ms: data.executionTimeMs,
      token_count: data.tokenCount || null,
      model_used: data.modelUsed || 'google/gemini-2.5-flash',
    });
  } catch (err) {
    // Don't fail the main request for analytics errors
    console.warn('Failed to log prompt analytics:', err);
  }
}

/**
 * Update prompt analytics with output quality data
 */
export async function updatePromptAnalyticsOutput(
  supabase: any,
  contentId: string,
  data: {
    outputAccepted?: boolean;
    userEdited?: boolean;
    editPercentage?: number;
    performanceScore?: number;
  }
): Promise<void> {
  try {
    await supabase
      .from('prompt_analytics')
      .update({
        output_accepted: data.outputAccepted,
        user_edited: data.userEdited,
        edit_percentage: data.editPercentage,
        performance_score: data.performanceScore,
      })
      .eq('content_id', contentId);
  } catch (err) {
    console.warn('Failed to update prompt analytics:', err);
  }
}

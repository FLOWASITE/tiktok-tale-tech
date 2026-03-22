import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FeedbackRequest {
  topicHistoryId: string;
  feedback: 'positive' | 'negative';
  feedbackNote?: string;
  brandTemplateId?: string;
  contentGoal?: string;
}

interface LearningStats {
  totalFeedback: number;
  positiveFeedback: number;
  negativeFeedback: number;
  feedbackRate: number;
  topPositivePatterns: string[];
  topNegativePatterns: string[];
  personalizationLevel: number;
  learningProgress: {
    dataPoints: number;
    categories: Record<string, number>;
    pillars: Record<string, number>;
  };
}

Deno.serve(withPerf({ functionName: 'learn-from-feedback' }, async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { topicHistoryId, feedback, feedbackNote, brandTemplateId, contentGoal } = await req.json() as FeedbackRequest;

    console.log(`Processing feedback: ${feedback} for topic ${topicHistoryId}`);

    if (!topicHistoryId || !feedback) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: topicHistoryId and feedback' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['positive', 'negative'].includes(feedback)) {
      return new Response(
        JSON.stringify({ error: 'Feedback must be either "positive" or "negative"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Update the topic_history record with feedback
    const { data: updatedTopic, error: updateError } = await supabase
      .from('topic_history')
      .update({
        feedback,
        feedback_note: feedbackNote || null,
      })
      .eq('id', topicHistoryId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating topic feedback:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update feedback', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Updated topic ${topicHistoryId} with feedback: ${feedback}`);

    // 2. Aggregate learning patterns for this brand/goal combination
    const learningStats = await aggregateLearningPatterns(
      supabase,
      brandTemplateId || updatedTopic.brand_template_id,
      contentGoal || updatedTopic.content_goal
    );

    console.log('Learning stats aggregated:', JSON.stringify(learningStats, null, 2));

    // 3. Return updated learning stats
    return new Response(
      JSON.stringify({
        success: true,
        updatedTopic: {
          id: updatedTopic.id,
          topic: updatedTopic.topic,
          feedback: updatedTopic.feedback,
          feedbackNote: updatedTopic.feedback_note,
        },
        learningStats,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in learn-from-feedback:', errorMessage);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));

async function aggregateLearningPatterns(
  supabase: any,
  brandTemplateId?: string,
  contentGoal?: string
): Promise<LearningStats> {
  // Build query for all feedback data
  let query = supabase
    .from('topic_history')
    .select('*')
    .not('feedback', 'is', null);

  if (brandTemplateId) {
    query = query.eq('brand_template_id', brandTemplateId);
  }

  if (contentGoal) {
    query = query.eq('content_goal', contentGoal);
  }

  const { data: feedbackData, error } = await query;

  if (error) {
    console.error('Error fetching feedback data:', error);
    return getDefaultLearningStats();
  }

  if (!feedbackData || feedbackData.length === 0) {
    return getDefaultLearningStats();
  }

  // Aggregate feedback counts
  const positiveFeedback = feedbackData.filter((t: any) => t.feedback === 'positive');
  const negativeFeedback = feedbackData.filter((t: any) => t.feedback === 'negative');

  // Extract patterns from positive feedback
  const positivePatterns = extractPatterns(positiveFeedback);
  const negativePatterns = extractPatterns(negativeFeedback);

  // Calculate category distribution
  const categories: Record<string, number> = {};
  const pillars: Record<string, number> = {};

  feedbackData.forEach((topic: any) => {
    if (topic.category) {
      categories[topic.category] = (categories[topic.category] || 0) + 1;
    }
    if (topic.pillar) {
      pillars[topic.pillar] = (pillars[topic.pillar] || 0) + 1;
    }
  });

  // Calculate personalization level (0-100)
  const dataPoints = feedbackData.length;
  const uniqueCategories = Object.keys(categories).length;
  const uniquePillars = Object.keys(pillars).length;
  
  // More data = higher personalization level
  const dataScore = Math.min(dataPoints * 5, 40); // Max 40 points from data count
  const diversityScore = Math.min((uniqueCategories * 10) + (uniquePillars * 5), 30); // Max 30 points
  const feedbackQualityScore = Math.min(
    (positiveFeedback.length + negativeFeedback.length) * 3,
    30
  ); // Max 30 points

  const personalizationLevel = Math.min(
    dataScore + diversityScore + feedbackQualityScore,
    100
  );

  return {
    totalFeedback: feedbackData.length,
    positiveFeedback: positiveFeedback.length,
    negativeFeedback: negativeFeedback.length,
    feedbackRate: feedbackData.length > 0 
      ? Math.round((positiveFeedback.length / feedbackData.length) * 100) 
      : 0,
    topPositivePatterns: positivePatterns.slice(0, 5),
    topNegativePatterns: negativePatterns.slice(0, 5),
    personalizationLevel,
    learningProgress: {
      dataPoints,
      categories,
      pillars,
    },
  };
}

function extractPatterns(topics: any[]): string[] {
  const patternCounts: Record<string, number> = {};

  topics.forEach((topic) => {
    // Extract patterns from category
    if (topic.category) {
      patternCounts[`category:${topic.category}`] = 
        (patternCounts[`category:${topic.category}`] || 0) + 1;
    }

    // Extract patterns from pillar
    if (topic.pillar) {
      patternCounts[`pillar:${topic.pillar}`] = 
        (patternCounts[`pillar:${topic.pillar}`] || 0) + 1;
    }

    // Extract patterns from format
    if (topic.format) {
      patternCounts[`format:${topic.format}`] = 
        (patternCounts[`format:${topic.format}`] || 0) + 1;
    }

    // Extract keywords from related_keywords
    if (topic.related_keywords && Array.isArray(topic.related_keywords)) {
      topic.related_keywords.forEach((keyword: string) => {
        patternCounts[`keyword:${keyword}`] = 
          (patternCounts[`keyword:${keyword}`] || 0) + 1;
      });
    }
  });

  // Sort by count and return top patterns
  return Object.entries(patternCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([pattern]) => pattern.split(':')[1]) // Remove prefix
    .filter(Boolean);
}

function getDefaultLearningStats(): LearningStats {
  return {
    totalFeedback: 0,
    positiveFeedback: 0,
    negativeFeedback: 0,
    feedbackRate: 0,
    topPositivePatterns: [],
    topNegativePatterns: [],
    personalizationLevel: 0,
    learningProgress: {
      dataPoints: 0,
      categories: {},
      pillars: {},
    },
  };
}

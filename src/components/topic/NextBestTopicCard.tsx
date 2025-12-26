import { useState } from 'react';
import { 
  Zap, RefreshCw, ArrowRight, Target, Clock, 
  Sparkles, ThumbsUp, ThumbsDown, FileText
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useTopicRecommendations, NextBestTopic } from '@/hooks/useTopicRecommendations';
import { TopicCreditsAlert } from './TopicCreditsAlert';
import { ContentGoal } from '@/types/multichannel';
import { cn } from '@/lib/utils';

interface NextBestTopicCardProps {
  brandTemplateId?: string;
  contentGoal?: ContentGoal;
  onSelectTopic: (topic: string) => void;
}

const formatLabels: Record<string, string> = {
  post: 'Bài viết',
  video: 'Video',
  carousel: 'Carousel',
  story: 'Story',
  reel: 'Reel',
  article: 'Bài dài',
};

const timingLabels: Record<string, { label: string; color: string }> = {
  now: { label: 'Ngay bây giờ', color: 'bg-emerald-500' },
  today: { label: 'Hôm nay', color: 'bg-emerald-500' },
  this_week: { label: 'Tuần này', color: 'bg-blue-500' },
  next_week: { label: 'Tuần sau', color: 'bg-amber-500' },
  anytime: { label: 'Linh hoạt', color: 'bg-muted' },
};

export function NextBestTopicCard({
  brandTemplateId,
  contentGoal,
  onSelectTopic,
}: NextBestTopicCardProps) {
  const [feedbackGiven, setFeedbackGiven] = useState<'positive' | 'negative' | null>(null);

  const { 
    nextBest, 
    getNextBestTopic, 
    submitFeedback,
    isLoading,
    error,
    errorCode,
  } = useTopicRecommendations({ brandTemplateId, contentGoal });

  const handleGetRecommendation = async () => {
    setFeedbackGiven(null);
    await getNextBestTopic();
  };

  const handleFeedback = async (type: 'positive' | 'negative') => {
    if (!nextBest) return;
    setFeedbackGiven(type);
    await submitFeedback(nextBest.topic, type);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-emerald-500';
    if (confidence >= 60) return 'text-amber-500';
    return 'text-muted-foreground';
  };

  const timing = nextBest?.timing ? timingLabels[nextBest.timing] || timingLabels.anytime : null;
  const showCreditsError = errorCode === 'CREDITS_EXHAUSTED' || errorCode === 'RATE_LIMIT';

  return (
    <Card className="gradient-card border-border/50 overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-full" />
      
      <CardHeader className="pb-3 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-violet-600 shadow-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">Next Best Topic</CardTitle>
              <CardDescription className="text-xs">
                AI đề xuất topic tốt nhất để tạo tiếp theo
              </CardDescription>
            </div>
          </div>
          <Button
            onClick={handleGetRecommendation}
            disabled={isLoading}
            size="sm"
            variant={nextBest ? 'outline' : 'default'}
            className="gap-2"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {nextBest ? 'Gợi ý khác' : 'Lấy gợi ý'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="relative">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
        ) : showCreditsError ? (
          <TopicCreditsAlert 
            errorCode={errorCode || undefined} 
            errorMessage={error || undefined}
            onRetry={errorCode === 'RATE_LIMIT' ? handleGetRecommendation : undefined}
          />
        ) : !nextBest ? (
          <div className="text-center py-8">
            <Zap className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              Nhấn "Lấy gợi ý" để AI đề xuất topic phù hợp nhất
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Main Topic */}
            <div 
              className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-violet-500/10 border border-primary/20 cursor-pointer hover:border-primary/40 transition-all group"
              onClick={() => onSelectTopic(nextBest.topic)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-medium text-lg group-hover:text-primary transition-colors">
                    {nextBest.topic}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {nextBest.reason}
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 mt-1" />
              </div>
            </div>

            {/* Meta Info */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="gap-1">
                <Target className="w-3 h-3" />
                {nextBest.pillar}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <FileText className="w-3 h-3" />
                {formatLabels[nextBest.suggestedFormat] || nextBest.suggestedFormat}
              </Badge>
              {timing && (
                <Badge variant="outline" className="gap-1">
                  <Clock className="w-3 h-3" />
                  <span className={cn('w-1.5 h-1.5 rounded-full', timing.color)} />
                  {timing.label}
                </Badge>
              )}
            </div>

            {/* Confidence Score */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Độ tin cậy AI</span>
                <span className={cn('font-medium', getConfidenceColor(nextBest.confidence))}>
                  {nextBest.confidence}%
                </span>
              </div>
              <Progress value={nextBest.confidence} className="h-1.5" />
            </div>

            {/* Feedback */}
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <span className="text-xs text-muted-foreground">Gợi ý này có hữu ích?</span>
              <div className="flex gap-1">
                <Button
                  variant={feedbackGiven === 'positive' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleFeedback('positive')}
                  disabled={feedbackGiven !== null}
                >
                  <ThumbsUp className={cn('w-4 h-4', feedbackGiven === 'positive' && 'text-primary-foreground')} />
                </Button>
                <Button
                  variant={feedbackGiven === 'negative' ? 'destructive' : 'ghost'}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleFeedback('negative')}
                  disabled={feedbackGiven !== null}
                >
                  <ThumbsDown className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

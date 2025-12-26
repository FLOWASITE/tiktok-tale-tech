import { useState } from 'react';
import { 
  AlertTriangle, RefreshCw, CheckCircle2, XCircle, 
  ArrowRight, Shield, Lightbulb
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTopicRecommendations, TopicConflict } from '@/hooks/useTopicRecommendations';
import { TopicCreditsAlert } from './TopicCreditsAlert';
import { ContentGoal } from '@/types/multichannel';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TopicConflictCheckerProps {
  brandTemplateId?: string;
  contentGoal?: ContentGoal;
  initialTopics?: string[];
}

const conflictTypeConfig: Record<string, { label: string; icon: typeof AlertTriangle; color: string }> = {
  duplicate: {
    label: 'Trùng lặp',
    icon: XCircle,
    color: 'text-red-500',
  },
  contradiction: {
    label: 'Mâu thuẫn',
    icon: AlertTriangle,
    color: 'text-amber-500',
  },
  cannibalization: {
    label: 'Cạnh tranh nội bộ',
    icon: Shield,
    color: 'text-orange-500',
  },
  timing: {
    label: 'Xung đột thời gian',
    icon: AlertTriangle,
    color: 'text-blue-500',
  },
};

const severityConfig: Record<string, { label: string; bgClass: string; borderClass: string }> = {
  high: {
    label: 'Nghiêm trọng',
    bgClass: 'bg-red-500/10',
    borderClass: 'border-red-500/30',
  },
  medium: {
    label: 'Trung bình',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/30',
  },
  low: {
    label: 'Nhẹ',
    bgClass: 'bg-blue-500/10',
    borderClass: 'border-blue-500/30',
  },
};

export function TopicConflictChecker({
  brandTemplateId,
  contentGoal,
  initialTopics = [],
}: TopicConflictCheckerProps) {
  const [topicsInput, setTopicsInput] = useState(initialTopics.join('\n'));

  const { 
    conflicts, 
    checkConflicts, 
    isLoading,
    error,
    errorCode,
  } = useTopicRecommendations({ brandTemplateId, contentGoal });

  const handleCheck = async () => {
    const topics = topicsInput
      .split('\n')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    if (topics.length < 2) {
      toast.error('Cần ít nhất 2 topics để kiểm tra xung đột');
      return;
    }

    await checkConflicts(topics);
  };

  const hasConflicts = conflicts && conflicts.conflicts.length > 0;
  const showCreditsError = errorCode === 'CREDITS_EXHAUSTED' || errorCode === 'RATE_LIMIT';

  return (
    <Card className="gradient-card border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-base">Kiểm tra xung đột</CardTitle>
            <CardDescription className="text-xs">
              Phát hiện topics trùng lặp hoặc mâu thuẫn
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Input */}
        <div className="space-y-2">
          <Textarea
            placeholder="Nhập các topics (mỗi dòng một topic)..."
            value={topicsInput}
            onChange={(e) => setTopicsInput(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {topicsInput.split('\n').filter(t => t.trim()).length} topics
            </span>
            <Button
              onClick={handleCheck}
              disabled={isLoading || topicsInput.trim().length === 0}
              size="sm"
              className="gap-2"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Shield className="w-4 h-4" />
              )}
              Kiểm tra
            </Button>
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : showCreditsError ? (
          <TopicCreditsAlert 
            errorCode={errorCode || undefined} 
            errorMessage={error || undefined}
            onRetry={errorCode === 'RATE_LIMIT' ? handleCheck : undefined}
          />
        ) : conflicts ? (
          <div className="space-y-3">
            {/* Summary */}
            {hasConflicts ? (
              <Alert variant="destructive" className="border-red-500/30 bg-red-500/10">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Phát hiện {conflicts.conflicts.length} xung đột
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-emerald-500/30 bg-emerald-500/10">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <AlertDescription className="text-emerald-700 dark:text-emerald-400">
                  Không phát hiện xung đột nào
                </AlertDescription>
              </Alert>
            )}

            {/* Conflict List */}
            {hasConflicts && (
              <div className="space-y-2">
                {conflicts.conflicts.map((conflict, index) => {
                  const typeConfig = conflictTypeConfig[conflict.type];
                  const sevConfig = severityConfig[conflict.severity];
                  const Icon = typeConfig?.icon || AlertTriangle;

                  return (
                    <div
                      key={index}
                      className={cn(
                        'p-3 rounded-lg border',
                        sevConfig.bgClass,
                        sevConfig.borderClass
                      )}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', typeConfig?.color)} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px]">
                              {typeConfig?.label}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              {sevConfig.label}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="pl-6 space-y-2">
                        <div className="flex flex-wrap gap-1">
                          {conflict.topics.map((topic, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {topic}
                            </Badge>
                          ))}
                        </div>

                        <p className="text-xs text-muted-foreground">
                          {conflict.explanation}
                        </p>

                        <div className="flex items-start gap-1.5 p-2 rounded bg-background/50">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <p className="text-xs">{conflict.resolution}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Summary text */}
            {conflicts.summary && (
              <p className="text-sm text-muted-foreground pt-2 border-t border-border/50">
                {conflicts.summary}
              </p>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

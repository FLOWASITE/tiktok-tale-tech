import { useState } from 'react';
import { 
  AlertTriangle, TrendingDown, Clock, Lightbulb, 
  RefreshCw, Target, Sparkles, ChevronDown, ChevronUp, 
  ArrowRight, CheckCircle2, XCircle, Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTopicIntelligence, TopicGap, GapAnalysisResult } from '@/hooks/useTopicIntelligence';
import { TopicCreditsAlert } from './TopicCreditsAlert';
import { ContentGoal } from '@/types/multichannel';
import { cn } from '@/lib/utils';

interface TopicGapAnalysisProps {
  brandTemplateId?: string;
  contentGoal?: ContentGoal;
  onSelectTopic: (topic: string) => void;
}

const gapTypeConfig = {
  missing: {
    icon: XCircle,
    label: 'Thiếu content',
    bgClass: 'bg-red-500/10',
    textClass: 'text-red-600 dark:text-red-400',
    borderClass: 'border-red-500/30',
  },
  underperforming: {
    icon: TrendingDown,
    label: 'Hiệu suất thấp',
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-600 dark:text-amber-400',
    borderClass: 'border-amber-500/30',
  },
  overdue: {
    icon: Clock,
    label: 'Đã lâu không dùng',
    bgClass: 'bg-blue-500/10',
    textClass: 'text-blue-600 dark:text-blue-400',
    borderClass: 'border-blue-500/30',
  },
};

const severityConfig = {
  high: { label: 'Cao', color: 'bg-red-500' },
  medium: { label: 'Trung bình', color: 'bg-amber-500' },
  low: { label: 'Thấp', color: 'bg-emerald-500' },
};

export function TopicGapAnalysis({
  brandTemplateId,
  contentGoal,
  onSelectTopic,
}: TopicGapAnalysisProps) {
  const [expandedGaps, setExpandedGaps] = useState<Set<string>>(new Set());
  
  const { 
    gaps, 
    analyzeGaps, 
    isLoading,
    error,
    errorCode,
  } = useTopicIntelligence({ brandTemplateId, contentGoal });

  const toggleGapExpanded = (pillar: string) => {
    setExpandedGaps(prev => {
      const next = new Set(prev);
      if (next.has(pillar)) {
        next.delete(pillar);
      } else {
        next.add(pillar);
      }
      return next;
    });
  };

  const handleAnalyze = async () => {
    await analyzeGaps();
  };

  const sortedGaps = gaps?.gaps
    ? [...gaps.gaps].sort((a, b) => b.priority - a.priority)
    : [];

  const highPriorityCount = sortedGaps.filter(g => g.severity === 'high').length;
  const totalSuggestions = sortedGaps.reduce((sum, g) => sum + g.suggestedTopics.length, 0);
  const showCreditsError = errorCode === 'CREDITS_EXHAUSTED' || errorCode === 'RATE_LIMIT';

  return (
    <Card className="gradient-card border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">Gap Analysis</CardTitle>
              <CardDescription className="text-xs">
                Phân tích lỗ hổng trong content strategy
              </CardDescription>
            </div>
          </div>
          <Button 
            onClick={handleAnalyze} 
            disabled={isLoading}
            size="sm"
            className="gap-2"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {gaps ? 'Phân tích lại' : 'Phân tích'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : showCreditsError ? (
          <TopicCreditsAlert 
            errorCode={errorCode || undefined} 
            errorMessage={error || undefined}
            onRetry={errorCode === 'RATE_LIMIT' ? handleAnalyze : undefined}
          />
        ) : !gaps ? (
          <div className="text-center py-8">
            <Target className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-2">
              Phân tích gaps để tìm cơ hội content
            </p>
            <p className="text-xs text-muted-foreground">
              AI sẽ phân tích topics đã có và đề xuất cải thiện
            </p>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold text-red-500">{highPriorityCount}</p>
                <p className="text-xs text-muted-foreground">Ưu tiên cao</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold">{sortedGaps.length}</p>
                <p className="text-xs text-muted-foreground">Gaps phát hiện</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold text-emerald-500">{totalSuggestions}</p>
                <p className="text-xs text-muted-foreground">Topics đề xuất</p>
              </div>
            </div>

            {/* Insights */}
            {gaps.insights && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm">{gaps.insights}</p>
                </div>
              </div>
            )}

            {/* Gap Items */}
            <div className="space-y-3">
              {sortedGaps.map((gap, index) => {
                const config = gapTypeConfig[gap.gapType];
                const sevConfig = severityConfig[gap.severity];
                const isExpanded = expandedGaps.has(gap.pillar);
                const GapIcon = config.icon;

                return (
                  <Collapsible 
                    key={`${gap.pillar}-${index}`} 
                    open={isExpanded}
                    onOpenChange={() => toggleGapExpanded(gap.pillar)}
                  >
                    <div 
                      className={cn(
                        'rounded-lg border transition-all',
                        config.bgClass,
                        config.borderClass,
                        isExpanded && 'ring-1 ring-primary/20'
                      )}
                    >
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/30 transition-colors">
                          <div className={cn('p-1.5 rounded-lg', config.bgClass)}>
                            <GapIcon className={cn('w-4 h-4', config.textClass)} />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{gap.pillar}</span>
                              <Badge variant="outline" className={cn('text-[10px]', config.textClass)}>
                                {config.label}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {gap.reason}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1">
                                    <div className={cn('w-2 h-2 rounded-full', sevConfig.color)} />
                                    <span className="text-xs">{gap.priority}/10</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Mức độ ưu tiên: {sevConfig.label}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="px-3 pb-3 pt-0 space-y-3 border-t border-border/50">
                          <p className="text-xs text-muted-foreground pt-3">
                            Topics đề xuất:
                          </p>
                          <div className="space-y-2">
                            {gap.suggestedTopics.map((topic, i) => (
                              <div 
                                key={i}
                                className="flex items-center gap-2 p-2 rounded-md bg-background/50 hover:bg-background transition-colors group cursor-pointer"
                                onClick={() => onSelectTopic(topic)}
                              >
                                <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                <span className="flex-1 text-sm truncate">{topic}</span>
                                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            ))}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>

            {/* Recommendations */}
            {gaps.recommendations && gaps.recommendations.length > 0 && (
              <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Khuyến nghị
                </p>
                <ul className="space-y-1.5">
                  {gaps.recommendations.map((rec, i) => (
                    <li key={i} className="text-xs flex items-start gap-2">
                      <span className="text-emerald-500 mt-1">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

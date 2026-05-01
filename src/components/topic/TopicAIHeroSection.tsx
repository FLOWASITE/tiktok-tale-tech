import { useState } from 'react';
import { 
  Zap, RefreshCw, ArrowRight, Target, Clock, 
  Sparkles, ThumbsUp, ThumbsDown, FileText, 
  MessageSquare, Video, Images, SkipForward,
  Wand2, TrendingUp, Leaf, Calendar, ChevronRight,
  Package, Rocket, Gift
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTopicRecommendations } from '@/hooks/useTopicRecommendations';
import { TopicCreditsAlert } from './TopicCreditsAlert';
import { TopicFormatSelector } from './TopicFormatSelector';
import { ContentGoal } from '@/types/multichannel';
import { ContentPurpose, MarketingFramework } from '@/types/topicDiscovery';
import { cn } from '@/lib/utils';

interface TopicAIHeroSectionProps {
  brandTemplateId?: string;
  contentGoal?: ContentGoal;
  onNavigate: (path: string, state?: any) => void;
  variant?: 'default' | 'compact';
  onContentPurposeSelect?: (purpose: ContentPurpose, framework: MarketingFramework) => void;
}

const categoryConfig = {
  evergreen: { icon: Leaf, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Evergreen' },
  trending: { icon: TrendingUp, color: 'text-orange-500', bg: 'bg-orange-500/10', label: 'Trending' },
  seasonal: { icon: Calendar, color: 'text-violet-500', bg: 'bg-violet-500/10', label: 'Seasonal' },
  reactive: { icon: Zap, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Reactive' },
};

const timingLabels: Record<string, { label: string; color: string }> = {
  now: { label: 'Ngay bây giờ', color: 'bg-emerald-500' },
  today: { label: 'Hôm nay', color: 'bg-emerald-500' },
  this_week: { label: 'Tuần này', color: 'bg-blue-500' },
  next_week: { label: 'Tuần sau', color: 'bg-amber-500' },
  anytime: { label: 'Linh hoạt', color: 'bg-muted' },
};

export function TopicAIHeroSection({
  brandTemplateId,
  contentGoal,
  onNavigate,
  variant = 'default',
}: TopicAIHeroSectionProps) {
  const [feedbackGiven, setFeedbackGiven] = useState<'positive' | 'negative' | null>(null);
  const [formatSelectorOpen, setFormatSelectorOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

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

  const handleQuickAction = (format: 'multichannel' | 'script' | 'carousel') => {
    if (!nextBest) return;
    
    const paths = {
      multichannel: '/multichannel',
      script: '/videos?tab=scripts',
      carousel: '/carousel',
    };
    
    onNavigate(paths[format], { 
      prefillTopic: nextBest.topic,
      prefillGoal: contentGoal,
      fromTopics: true 
    });
  };

  const handleTopicClick = () => {
    if (!nextBest) return;
    setSelectedTopic(nextBest.topic);
    setFormatSelectorOpen(true);
  };

  const handleFormatSelect = (format: 'multichannel' | 'script' | 'carousel') => {
    if (!selectedTopic) return;
    handleQuickAction(format);
    setFormatSelectorOpen(false);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-emerald-500';
    if (confidence >= 60) return 'text-amber-500';
    return 'text-muted-foreground';
  };

  const timing = nextBest?.timing ? timingLabels[nextBest.timing] || timingLabels.anytime : null;
  const showCreditsError = errorCode === 'CREDITS_EXHAUSTED' || errorCode === 'RATE_LIMIT';
  
  // Determine category from pillar or format
  const inferredCategory = nextBest?.pillar?.toLowerCase().includes('evergreen') ? 'evergreen' 
    : nextBest?.timing === 'now' ? 'reactive'
    : 'trending';
  const category = inferredCategory ? categoryConfig[inferredCategory] : categoryConfig.trending;
  const CategoryIcon = category?.icon || Sparkles;

  const isCompact = variant === 'compact';

  return (
    <>
      <Card className={cn(
        'relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-background via-background to-primary/5',
        isCompact && 'border'
      )}>
        {/* Animated background elements - hide in compact mode */}
        {!isCompact && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-bl from-primary/20 to-transparent rounded-full blur-2xl animate-pulse" />
            <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-gradient-to-tr from-violet-500/10 to-transparent rounded-full blur-xl" />
          </div>
        )}
        
        <CardContent className={cn('relative', isCompact ? 'p-4' : 'p-6')}>
          {/* Header */}
          <div className={cn('flex items-center justify-between', isCompact ? 'mb-3' : 'mb-5')}>
            <div className="flex items-center gap-3">
              <div className={cn(
                'rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-primary shadow-lg shadow-primary/25',
                isCompact ? 'p-2' : 'p-3'
              )}>
                <Wand2 className={cn('text-primary-foreground', isCompact ? 'w-4 h-4' : 'w-6 h-6')} />
              </div>
              <div>
                <h2 className={cn('font-bold flex items-center gap-2', isCompact ? 'text-base' : 'text-xl')}>
                  AI Gợi Ý Tốt Nhất
                  {!isCompact && (
                    <Badge variant="secondary" className="text-xs font-normal">
                      Smart Pick
                    </Badge>
                  )}
                </h2>
                {!isCompact && (
                  <p className="text-sm text-muted-foreground">
                    Topic được AI đề xuất dựa trên brand & mục tiêu của bạn
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {nextBest && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={handleGetRecommendation}
                        disabled={isLoading}
                      >
                        <SkipForward className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Bỏ qua, lấy gợi ý khác</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <Button
                onClick={handleGetRecommendation}
                disabled={isLoading}
                className="gap-2 shadow-lg"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {nextBest ? 'Gợi ý mới' : 'Lấy gợi ý AI'}
              </Button>
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-28 rounded-xl" />
              <div className="flex gap-3">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
          ) : showCreditsError ? (
            <TopicCreditsAlert 
              errorCode={errorCode || undefined} 
              errorMessage={error || undefined}
              onRetry={errorCode === 'RATE_LIMIT' ? handleGetRecommendation : undefined}
            />
          ) : !nextBest ? (
          <div className="text-center py-8 space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Zap className="w-10 h-10 text-primary/50" />
              </div>
              <div>
                <p className="font-medium text-lg">Sẵn sàng khám phá ý tưởng mới?</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Nhấn "Lấy gợi ý AI" để AI phân tích và đề xuất topic tốt nhất cho bạn
                </p>
              </div>
              
              {/* Quick Actions - Available without AI suggestion for conversion goal */}
              {contentGoal === 'conversion' && (
                <div className="pt-4 border-t border-border/50 space-y-3">
                  <p className="text-xs text-muted-foreground">Hoặc bắt đầu ngay với:</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="gap-1.5 text-blue-600 bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20"
                            onClick={() => onNavigate('/multichannel', {
                              prefillGoal: 'conversion',
                              contentPurpose: 'service_intro',
                              marketingFramework: 'FAB',
                              fromTopics: true,
                            })}
                          >
                            <Package className="w-3.5 h-3.5" />
                            Giới thiệu dịch vụ
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">Framework FAB</p>
                          <p className="text-xs text-muted-foreground">Features → Advantages → Benefits</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="gap-1.5 text-purple-600 bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/20"
                            onClick={() => onNavigate('/multichannel', {
                              prefillGoal: 'conversion',
                              contentPurpose: 'product_launch',
                              marketingFramework: 'AIDA',
                              fromTopics: true,
                            })}
                          >
                            <Rocket className="w-3.5 h-3.5" />
                            Ra mắt sản phẩm
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">Framework AIDA</p>
                          <p className="text-xs text-muted-foreground">Attention → Interest → Desire → Action</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="gap-1.5 text-orange-600 bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/20"
                            onClick={() => onNavigate('/multichannel', {
                              prefillGoal: 'conversion',
                              contentPurpose: 'promotion',
                              marketingFramework: 'PAS',
                              fromTopics: true,
                            })}
                          >
                            <Gift className="w-3.5 h-3.5" />
                            Khuyến mãi
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">Framework PAS</p>
                          <p className="text-xs text-muted-foreground">Problem → Agitate → Solution</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {/* Featured Topic Card */}
              <div 
                className="group relative p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-violet-500/10 to-primary/5 border border-primary/20 cursor-pointer hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300"
                onClick={handleTopicClick}
              >
                {/* Category Badge */}
                {category && (
                  <div className={cn('absolute -top-3 left-4 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 border', category.bg, category.color, 'border-current/20')}>
                    <CategoryIcon className="w-3 h-3" />
                    {category.label}
                  </div>
                )}

                <div className="flex items-start justify-between gap-4 mt-2">
                  <div className="flex-1 space-y-2">
                    <p className="font-semibold text-xl group-hover:text-primary transition-colors leading-tight">
                      {nextBest.topic}
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {nextBest.reason}
                    </p>
                  </div>
                  <div className="shrink-0 p-2 rounded-full bg-primary/10 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                    <ChevronRight className="w-5 h-5 text-primary group-hover:text-primary-foreground transition-colors" />
                  </div>
                </div>

                {/* Meta Info Row */}
                <div className="flex flex-wrap items-center gap-2 mt-4">
                  {nextBest.pillar && (
                    <Badge variant="outline" className="gap-1 bg-background/50">
                      <Target className="w-3 h-3" />
                      {nextBest.pillar}
                    </Badge>
                  )}
                  {timing && (
                    <Badge variant="outline" className="gap-1 bg-background/50">
                      <Clock className="w-3 h-3" />
                      <span className={cn('w-1.5 h-1.5 rounded-full', timing.color)} />
                      {timing.label}
                    </Badge>
                  )}
                  
                  {/* Confidence Score */}
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Độ tin cậy</span>
                    <div className="flex items-center gap-1.5">
                      <Progress value={nextBest.confidence} className="h-1.5 w-16" />
                      <span className={cn('text-sm font-semibold', getConfidenceColor(nextBest.confidence))}>
                        {nextBest.confidence}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-muted-foreground mr-1">Tạo nhanh:</span>
                <Button
                  variant="outline"
                  className="gap-2 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                  onClick={() => handleQuickAction('multichannel')}
                >
                  <MessageSquare className="w-4 h-4" />
                  Multi-channel
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 hover:bg-violet-600 hover:text-white hover:border-violet-600 transition-all"
                  onClick={() => handleQuickAction('script')}
                >
                  <Video className="w-4 h-4" />
                  Video Script
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all"
                  onClick={() => handleQuickAction('carousel')}
                >
                  <Images className="w-4 h-4" />
                  Carousel
                </Button>
              </div>

              {/* Sales Quick Actions - Show when goal is conversion */}
              {contentGoal === 'conversion' && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
                  <span className="text-xs text-muted-foreground">Bán hàng:</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="gap-1.5 text-blue-600 bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20"
                          onClick={() => onNavigate('/multichannel', {
                            prefillTopic: nextBest?.topic || 'Giới thiệu dịch vụ',
                            prefillGoal: 'conversion',
                            contentPurpose: 'service_intro',
                            marketingFramework: 'FAB',
                            fromTopics: true,
                          })}
                        >
                          <Package className="w-3.5 h-3.5" />
                          Giới thiệu dịch vụ
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">Framework FAB</p>
                        <p className="text-xs text-muted-foreground">Features → Advantages → Benefits</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="gap-1.5 text-purple-600 bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/20"
                          onClick={() => onNavigate('/multichannel', {
                            prefillTopic: nextBest?.topic || 'Ra mắt sản phẩm mới',
                            prefillGoal: 'conversion',
                            contentPurpose: 'product_launch',
                            marketingFramework: 'AIDA',
                            fromTopics: true,
                          })}
                        >
                          <Rocket className="w-3.5 h-3.5" />
                          Ra mắt sản phẩm
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">Framework AIDA</p>
                        <p className="text-xs text-muted-foreground">Attention → Interest → Desire → Action</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="gap-1.5 text-orange-600 bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/20"
                          onClick={() => onNavigate('/multichannel', {
                            prefillTopic: nextBest?.topic || 'Chương trình khuyến mãi',
                            prefillGoal: 'conversion',
                            contentPurpose: 'promotion',
                            marketingFramework: 'PAS',
                            fromTopics: true,
                          })}
                        >
                          <Gift className="w-3.5 h-3.5" />
                          Khuyến mãi
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">Framework PAS</p>
                        <p className="text-xs text-muted-foreground">Problem → Agitate → Solution</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}

              {/* Feedback Section */}
              <div className="flex items-center gap-3 pt-3 border-t border-border/50">
                <span className="text-xs text-muted-foreground">Hữu ích?</span>
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

      {/* Format Selector Modal */}
      <TopicFormatSelector
        open={formatSelectorOpen}
        onOpenChange={setFormatSelectorOpen}
        topic={selectedTopic || ''}
        contentGoal={contentGoal}
        onSelectFormat={handleFormatSelect}
      />
    </>
  );
}

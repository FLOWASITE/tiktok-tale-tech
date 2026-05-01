import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, FileText, Video, Layers, Calendar, Clock, 
  Target, TrendingUp, BarChart3, Users, ArrowRight, 
  ExternalLink, Lightbulb, CheckCircle2, Circle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { EnhancedTopicSuggestion, calculateOverallScore, SCORE_THRESHOLDS } from '@/types/topicDiscovery';
import { useTopicContentLinks, TopicContentLink } from '@/hooks/useTopicContentLinks';

interface TopicQuickPreviewProps {
  topic: EnhancedTopicSuggestion;
  topicHistoryId?: string;
  brandTemplateId?: string;
  onCreateContent?: (format: 'multichannel' | 'script' | 'carousel') => void;
  onClose?: () => void;
  className?: string;
}

const formatConfig = [
  { 
    key: 'multichannel' as const, 
    label: 'Multi-channel', 
    icon: Layers, 
    description: 'Tạo nội dung đa kênh',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    path: '/multichannel'
  },
  { 
    key: 'script' as const, 
    label: 'Video Script', 
    icon: Video, 
    description: 'Kịch bản video ngắn',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    path: '/videos?tab=scripts'
  },
  { 
    key: 'carousel' as const, 
    label: 'Carousel', 
    icon: FileText, 
    description: 'Bài viết nhiều slide',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    path: '/carousel'
  },
];

const scoreDetails = [
  { key: 'brandFit' as const, label: 'Phù hợp thương hiệu', icon: Target },
  { key: 'trend' as const, label: 'Mức độ trending', icon: TrendingUp },
  { key: 'competition' as const, label: 'Cạnh tranh thấp', icon: BarChart3 },
  { key: 'engagement' as const, label: 'Tiềm năng tương tác', icon: Users },
];

export function TopicQuickPreview({
  topic,
  topicHistoryId,
  brandTemplateId,
  onCreateContent,
  onClose,
  className,
}: TopicQuickPreviewProps) {
  const navigate = useNavigate();
  const [relatedContent, setRelatedContent] = useState<TopicContentLink[]>([]);
  const { getLinksByTopic } = useTopicContentLinks({ enabled: false });

  const overallScore = topic.scores ? calculateOverallScore(topic.scores) : null;

  // Fetch related content if we have a topic history ID
  useEffect(() => {
    if (topicHistoryId) {
      getLinksByTopic(topicHistoryId).then(setRelatedContent);
    }
  }, [topicHistoryId, getLinksByTopic]);

  const handleCreateContent = (format: 'multichannel' | 'script' | 'carousel') => {
    if (onCreateContent) {
      onCreateContent(format);
    } else {
      const config = formatConfig.find(f => f.key === format);
      if (config) {
        const params = new URLSearchParams({ topic: topic.topic });
        if (brandTemplateId) params.set('brandId', brandTemplateId);
        navigate(`${config.path}?${params.toString()}`);
      }
    }
  };

  const getContentPath = (contentType: string, contentId: string) => {
    switch (contentType) {
      case 'multichannel': return `/multichannel/${contentId}`;
      case 'script': return `/videos?tab=scripts&view=${contentId}`;
      case 'carousel': return `/carousel?view=${contentId}`;
      default: return '#';
    }
  };

  const getScoreLevel = (value: number) => {
    if (value >= SCORE_THRESHOLDS.excellent) return { label: 'Xuất sắc', color: 'text-emerald-500' };
    if (value >= SCORE_THRESHOLDS.good) return { label: 'Tốt', color: 'text-amber-500' };
    if (value >= SCORE_THRESHOLDS.fair) return { label: 'Khá', color: 'text-orange-500' };
    return { label: 'Cần cải thiện', color: 'text-red-500' };
  };

  return (
    <div className={cn(
      'bg-popover border rounded-xl shadow-xl overflow-hidden',
      'min-w-[340px] max-w-[400px]',
      className
    )}>
      {/* Header with gradient */}
      <div className="relative px-4 py-3 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm line-clamp-2">{topic.topic}</h4>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-[10px]">
                {topic.category}
              </Badge>
              {topic.pillar && (
                <Badge variant="outline" className="text-[10px]">
                  {topic.pillar}
                </Badge>
              )}
            </div>
          </div>
          {overallScore !== null && (
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white',
              'bg-gradient-to-br shadow-lg',
              overallScore >= SCORE_THRESHOLDS.excellent ? 'from-emerald-500 to-teal-600' :
              overallScore >= SCORE_THRESHOLDS.good ? 'from-amber-500 to-yellow-600' :
              'from-orange-500 to-red-500'
            )}>
              {overallScore}
            </div>
          )}
        </div>
      </div>

      <ScrollArea className="max-h-[400px]">
        <div className="p-4 space-y-4">
          {/* AI Reasoning */}
          {topic.reasoning && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Lightbulb className="w-3.5 h-3.5" />
                Tại sao AI gợi ý topic này?
              </div>
              <p className="text-sm text-foreground/90 bg-muted/50 rounded-lg p-3 leading-relaxed">
                {topic.reasoning}
              </p>
            </div>
          )}

          {/* Detailed Scores */}
          {topic.scores && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                Phân tích chi tiết
              </div>
              <div className="grid grid-cols-2 gap-2">
                {scoreDetails.map(({ key, label, icon: Icon }) => {
                  const value = topic.scores![key];
                  const level = getScoreLevel(value);
                  return (
                    <div key={key} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] text-muted-foreground truncate">{label}</div>
                        <div className={cn('text-xs font-medium', level.color)}>
                          {value}/100
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Best time to post */}
          {topic.bestTimeToPost && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <div>
                <div className="text-[10px] text-muted-foreground">Thời gian đăng tốt nhất</div>
                <div className="text-xs font-medium">{topic.bestTimeToPost}</div>
              </div>
            </div>
          )}

          {/* Related Event */}
          {topic.relatedEvent && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              <div>
                <div className="text-[10px] text-amber-700 dark:text-amber-400">Sự kiện liên quan</div>
                <div className="text-xs font-medium text-amber-800 dark:text-amber-300">
                  {topic.relatedEvent} {topic.eventDate && `(${topic.eventDate})`}
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Quick Create Buttons */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">
              Tạo nội dung nhanh
            </div>
            <div className="grid grid-cols-3 gap-2">
              {formatConfig.map(({ key, label, icon: Icon, bgColor, color }) => {
                const isSupported = topic.formats.includes(key);
                return (
                  <TooltipProvider key={key}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            'h-auto py-2 px-2 flex flex-col items-center gap-1',
                            isSupported && 'hover:bg-primary/10 hover:border-primary/50',
                            !isSupported && 'opacity-50'
                          )}
                          onClick={() => handleCreateContent(key)}
                          disabled={!isSupported}
                        >
                          <div className={cn('p-1.5 rounded-md', bgColor)}>
                            <Icon className={cn('w-3.5 h-3.5', color)} />
                          </div>
                          <span className="text-[10px] font-medium">{label}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isSupported 
                          ? `Tạo ${label}` 
                          : `Topic không phù hợp với ${label}`
                        }
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          </div>

          {/* Related Content */}
          {relatedContent.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">
                  Nội dung đã tạo từ topic này
                </div>
                <div className="space-y-1.5">
                  {relatedContent.slice(0, 3).map((content) => {
                    const config = formatConfig.find(f => f.key === content.contentType);
                    const Icon = config?.icon || FileText;
                    const isPublished = content.contentStatus === 'published';
                    
                    return (
                      <div
                        key={content.id}
                        className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => navigate(getContentPath(content.contentType, content.contentId))}
                      >
                        <Icon className={cn('w-3.5 h-3.5', config?.color || 'text-muted-foreground')} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">
                            {content.contentTitle || 'Nội dung không tên'}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            {isPublished ? (
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                            ) : (
                              <Circle className="w-2.5 h-2.5" />
                            )}
                            {content.contentStatus || 'draft'}
                          </div>
                        </div>
                        <ExternalLink className="w-3 h-3 text-muted-foreground" />
                      </div>
                    );
                  })}
                  {relatedContent.length > 3 && (
                    <Button variant="ghost" size="sm" className="w-full h-7 text-xs">
                      Xem thêm {relatedContent.length - 3} nội dung
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Keywords */}
          {topic.relatedKeywords && topic.relatedKeywords.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">
                  Từ khóa liên quan
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {topic.relatedKeywords.map((keyword) => (
                    <Badge key={keyword} variant="outline" className="text-[10px]">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

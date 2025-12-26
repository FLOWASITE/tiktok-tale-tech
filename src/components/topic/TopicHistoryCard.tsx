import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Star, 
  StarOff, 
  ThumbsUp, 
  ThumbsDown, 
  Trash2, 
  ExternalLink,
  Clock,
  TrendingUp,
  Leaf,
  Calendar,
  Zap,
  CheckCircle2,
  FileEdit,
  Send,
  RotateCcw
} from 'lucide-react';
import { TopicHistoryItem, UsageStatus, FeedbackType } from '@/hooks/useTopicHistory';
import { calculateOverallScore, getScoreColor, SCORE_THRESHOLDS } from '@/types/topicDiscovery';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { TopicLinkedContents } from './TopicLinkedContents';

interface TopicHistoryCardProps {
  item: TopicHistoryItem;
  onToggleFavorite: (id: string) => void;
  onFeedback: (id: string, feedback: FeedbackType) => void;
  onDelete: (id: string) => void;
  onReuse: (item: TopicHistoryItem) => void;
  onViewContent?: (contentId: string, contentType: string) => void;
}

const categoryIcons: Record<string, React.ElementType> = {
  evergreen: Leaf,
  trending: TrendingUp,
  seasonal: Calendar,
  reactive: Zap,
};

const categoryColors: Record<string, string> = {
  evergreen: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  trending: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  seasonal: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  reactive: 'bg-red-500/10 text-red-600 border-red-500/20',
};

const statusConfig: Record<UsageStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'Nháp', color: 'bg-slate-500/10 text-slate-600 border-dashed border-slate-400', icon: Clock },
  suggested: { label: 'Đề xuất', color: 'bg-muted text-muted-foreground', icon: Clock },
  selected: { label: 'Đã chọn', color: 'bg-blue-500/10 text-blue-600', icon: CheckCircle2 },
  created: { label: 'Đã tạo', color: 'bg-amber-500/10 text-amber-600', icon: FileEdit },
  published: { label: 'Đã đăng', color: 'bg-emerald-500/10 text-emerald-600', icon: Send },
};

export function TopicHistoryCard({
  item,
  onToggleFavorite,
  onFeedback,
  onDelete,
  onReuse,
  onViewContent,
}: TopicHistoryCardProps) {
  const CategoryIcon = categoryIcons[item.category] || Leaf;
  const status = statusConfig[item.usageStatus];
  const StatusIcon = status.icon;
  
  const overallScore = item.scores ? calculateOverallScore(item.scores) : null;
  const scoreColor = overallScore ? getScoreColor(overallScore) : 'slate';

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm line-clamp-2 mb-2">{item.topic}</p>
            <div className="flex flex-wrap gap-1.5">
              {/* Category badge */}
              <Badge variant="outline" className={cn('text-xs', categoryColors[item.category])}>
                <CategoryIcon className="h-3 w-3 mr-1" />
                {item.category}
              </Badge>
              
              {/* Status badge */}
              <Badge variant="outline" className={cn('text-xs', status.color)}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {status.label}
              </Badge>

              {/* Pillar badge */}
              {item.pillar && (
                <Badge variant="secondary" className="text-xs">
                  {item.pillar}
                </Badge>
              )}
            </div>
          </div>

          {/* Overall score */}
          {overallScore !== null && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <div className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold',
                    scoreColor === 'emerald' && 'bg-emerald-500/10 text-emerald-600',
                    scoreColor === 'amber' && 'bg-amber-500/10 text-amber-600',
                    scoreColor === 'red' && 'bg-red-500/10 text-red-600',
                  )}>
                    {overallScore}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left" className="w-48">
                  <p className="font-medium mb-2">Điểm chi tiết</p>
                  {item.scores && (
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Brand Fit:</span>
                        <span className="font-medium">{item.scores.brandFit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Trending:</span>
                        <span className="font-medium">{item.scores.trend}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Ít cạnh tranh:</span>
                        <span className="font-medium">{item.scores.competition}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tương tác:</span>
                        <span className="font-medium">{item.scores.engagement}</span>
                      </div>
                    </div>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Performance score (if available) */}
        {item.performanceScore !== undefined && (
          <div className="mb-3 p-2 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Hiệu suất thực tế</span>
              <span className={cn(
                'font-bold',
                item.performanceScore >= 70 ? 'text-emerald-600' : 
                item.performanceScore >= 40 ? 'text-amber-600' : 'text-red-600'
              )}>
                {item.performanceScore}/100
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  'h-full rounded-full transition-all',
                  item.performanceScore >= 70 ? 'bg-emerald-500' : 
                  item.performanceScore >= 40 ? 'bg-amber-500' : 'bg-red-500'
                )}
                style={{ width: `${item.performanceScore}%` }}
              />
            </div>
          </div>
        )}

        {/* Timestamp */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <Clock className="h-3 w-3" />
          {format(new Date(item.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
          {item.publishedAt && (
            <>
              <span>•</span>
              <span className="text-emerald-600">
                Đăng: {format(new Date(item.publishedAt), 'dd/MM', { locale: vi })}
              </span>
            </>
          )}
        </div>

        {/* Linked Contents */}
        <TopicLinkedContents 
          topicHistoryId={item.id} 
          onViewContent={onViewContent}
        />

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-1">
            {/* Favorite */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onToggleFavorite(item.id)}
                  >
                    {item.isFavorite ? (
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                    ) : (
                      <StarOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {item.isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Feedback buttons */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn('h-8 w-8', item.feedback === 'positive' && 'text-emerald-600')}
                    onClick={() => onFeedback(item.id, 'positive')}
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Topic hay</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn('h-8 w-8', item.feedback === 'negative' && 'text-red-600')}
                    onClick={() => onFeedback(item.id, 'negative')}
                  >
                    <ThumbsDown className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Topic không phù hợp</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* View content */}
            {item.contentId && item.contentType && onViewContent && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onViewContent(item.contentId!, item.contentType!)}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Xem nội dung</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Reuse */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => onReuse(item)}
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    Dùng lại
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Sử dụng topic này</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Delete */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => onDelete(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Xóa</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  TrendingUp, 
  Flame, 
  Zap, 
  Clock, 
  RefreshCw, 
  ArrowUpRight,
  Target,
  Users,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { useTrendingTopics, TrendingTopic } from '@/hooks/useTrendingTopics';
import { TopicCreditsAlert } from './TopicCreditsAlert';
import { cn } from '@/lib/utils';
import { SOURCE_CONFIG, TrendingSource } from '@/types/curatedData';

interface TrendingDiscoveryPanelProps {
  brandTemplateId?: string;
  onSelectTopic: (topic: string, angles?: string[]) => void;
}

const categoryConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  'tin_tuc': { label: 'Tin tức', icon: <Zap className="w-3 h-3" />, color: 'bg-red-500/10 text-red-600 border-red-500/20' },
  'mua_vu': { label: 'Mùa vụ', icon: <Clock className="w-3 h-3" />, color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  'seasonal': { label: 'Theo mùa', icon: <Flame className="w-3 h-3" />, color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  'tiktok_trend': { label: 'TikTok', icon: <Flame className="w-3 h-3" />, color: 'bg-pink-500/10 text-pink-600 border-pink-500/20' },
  'web_trending': { label: 'Web', icon: <TrendingUp className="w-3 h-3" />, color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  'evergreen': { label: 'Evergreen', icon: <Target className="w-3 h-3" />, color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  'nganh_chuyen': { label: 'Ngành', icon: <Users className="w-3 h-3" />, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
};

const peakStatusConfig: Record<string, { label: string; color: string; pulse: boolean }> = {
  'rising': { label: '📈 Đang lên', color: 'text-emerald-500', pulse: false },
  'peaking': { label: '🔥 Đỉnh cao', color: 'text-orange-500', pulse: true },
  'declining': { label: '📉 Đang giảm', color: 'text-muted-foreground', pulse: false },
};

const competitionColors: Record<string, string> = {
  'low': 'text-emerald-500',
  'medium': 'text-amber-500',
  'high': 'text-red-500',
};

function VelocityBar({ score }: { score: number }) {
  const getColor = () => {
    if (score >= 80) return 'bg-gradient-to-r from-orange-500 to-red-500';
    if (score >= 60) return 'bg-gradient-to-r from-amber-500 to-orange-500';
    if (score >= 40) return 'bg-gradient-to-r from-emerald-500 to-amber-500';
    return 'bg-muted-foreground/30';
  };

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all", getColor())}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs font-medium tabular-nums">{score}</span>
    </div>
  );
}

function TrendingTopicCard({ 
  topic, 
  onSelect 
}: { 
  topic: TrendingTopic; 
  onSelect: () => void;
}) {
  const category = categoryConfig[topic.category] || categoryConfig['evergreen'];
  const peakStatus = peakStatusConfig[topic.peak_status] || peakStatusConfig['rising'];

  return (
    <div 
      className={cn(
        "group p-3 rounded-lg border bg-card/50 hover:bg-accent/50 cursor-pointer transition-all",
        topic.peak_status === 'peaking' && "ring-1 ring-orange-500/30"
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", category.color)}>
              {category.icon}
              <span className="ml-1">{category.label}</span>
            </Badge>
            {/* Source badge */}
            {topic.source && SOURCE_CONFIG[topic.source as TrendingSource] && (
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", SOURCE_CONFIG[topic.source as TrendingSource].color)}>
                {SOURCE_CONFIG[topic.source as TrendingSource].icon}
                <span className="ml-1">{SOURCE_CONFIG[topic.source as TrendingSource].label}</span>
              </Badge>
            )}
            <span className={cn("text-xs font-medium", peakStatus.color, peakStatus.pulse && "animate-pulse")}>
              {peakStatus.label}
            </span>
          </div>
          <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
            {topic.topic}
          </h4>
        </div>
        <Button 
          size="icon" 
          variant="ghost" 
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        >
          <ArrowUpRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3" />
              <VelocityBar score={topic.velocity_score} />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">
              <strong>Velocity Score:</strong> Tốc độ tăng trưởng<br />
              {topic.velocity_score >= 80 ? '🔥 Viral - Đang bùng nổ' :
               topic.velocity_score >= 60 ? '📈 Trending mạnh' :
               topic.velocity_score >= 40 ? '🌱 Đang lên' : '📊 Ổn định'}
            </p>
          </TooltipContent>
        </Tooltip>

        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={cn("font-medium", competitionColors[topic.competition_level])}>
                {topic.competition_level === 'low' ? 'Ít cạnh tranh' :
                 topic.competition_level === 'medium' ? 'Vừa' : 'Nhiều cạnh tranh'}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Mức độ cạnh tranh từ đối thủ</p>
            </TooltipContent>
          </Tooltip>

          {topic.peak_prediction && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {topic.peak_prediction}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Thời điểm dự đoán đạt đỉnh</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {topic.suggested_angles && topic.suggested_angles.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <div className="flex flex-wrap gap-1">
            {topic.suggested_angles.slice(0, 2).map((angle, idx) => (
              <span 
                key={idx} 
                className="text-[10px] px-1.5 py-0.5 rounded bg-primary/5 text-primary/80"
              >
                💡 {angle}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function TrendingDiscoveryPanel({ brandTemplateId, onSelectTopic }: TrendingDiscoveryPanelProps) {
  const { 
    topics, 
    isLoading, 
    error, 
    errorCode, 
    source, 
    fetchTrendingTopics, 
    refresh 
  } = useTrendingTopics({ brandTemplateId });

  useEffect(() => {
    fetchTrendingTopics();
  }, [fetchTrendingTopics]);

  // Sort by velocity score
  const sortedTopics = [...topics].sort((a, b) => b.velocity_score - a.velocity_score);
  const hotTopics = sortedTopics.filter(t => t.velocity_score >= 70);
  const risingTopics = sortedTopics.filter(t => t.velocity_score < 70 && t.velocity_score >= 40);
  const steadyTopics = sortedTopics.filter(t => t.velocity_score < 40);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-orange-500 to-red-500">
              <Flame className="w-4 h-4 text-white" />
            </div>
            <CardTitle className="text-base font-semibold">Xu hướng đang hot</CardTitle>
            {source === 'cache' && (
              <Badge variant="outline" className="text-[10px]">Cache</Badge>
            )}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => refresh()}
                disabled={isLoading}
              >
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Làm mới xu hướng</TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {(errorCode === 'CREDITS_EXHAUSTED' || errorCode === 'RATE_LIMIT') && (
          <TopicCreditsAlert errorCode={errorCode} />
        )}

        {isLoading && topics.length === 0 ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 rounded-lg border">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : error && topics.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => refresh()}>
              Thử lại
            </Button>
          </div>
        ) : topics.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground mb-3">
              Khám phá xu hướng đang hot trong ngành của bạn
            </p>
            <Button 
              onClick={() => refresh()} 
              disabled={isLoading}
              className="gap-2"
            >
              <Flame className="w-4 h-4" />
              Phát hiện xu hướng
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-2">
            <div className="space-y-4">
              {hotTopics.length > 0 && (
                <div>
                  <h5 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Flame className="w-3 h-3 text-orange-500" />
                    Hot nhất ({hotTopics.length})
                  </h5>
                  <div className="space-y-2">
                    {hotTopics.map((topic) => (
                      <TrendingTopicCard 
                        key={topic.id} 
                        topic={topic} 
                        onSelect={() => onSelectTopic(topic.topic, topic.suggested_angles)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {risingTopics.length > 0 && (
                <div>
                  <h5 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                    Đang lên ({risingTopics.length})
                  </h5>
                  <div className="space-y-2">
                    {risingTopics.map((topic) => (
                      <TrendingTopicCard 
                        key={topic.id} 
                        topic={topic} 
                        onSelect={() => onSelectTopic(topic.topic, topic.suggested_angles)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {steadyTopics.length > 0 && (
                <div>
                  <h5 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Target className="w-3 h-3" />
                    Ổn định ({steadyTopics.length})
                  </h5>
                  <div className="space-y-2">
                    {steadyTopics.map((topic) => (
                      <TrendingTopicCard 
                        key={topic.id} 
                        topic={topic} 
                        onSelect={() => onSelectTopic(topic.topic, topic.suggested_angles)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

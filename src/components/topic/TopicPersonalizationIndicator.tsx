import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Brain, Database, Heart, Sparkles, TrendingUp,
  Target, Users, BookOpen, Zap, ChevronRight, Star,
  BarChart3, ArrowUpRight, Lightbulb
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LearningSource {
  type: 'used' | 'favorite' | 'top_performer' | 'brand_voice' | 'industry';
  label: string;
  count?: number;
  value?: string;
  impact: 'high' | 'medium' | 'low';
}

interface TopicPersonalizationIndicatorProps {
  usedTopicsCount: number;
  favoritesCount: number;
  topPerformersCount: number;
  brandName?: string;
  industryName?: string;
  isPersonalized: boolean;
  onLearnMore?: () => void;
}

const impactColors = {
  high: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  medium: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  low: 'bg-muted text-muted-foreground border-border',
};

export function TopicPersonalizationIndicator({
  usedTopicsCount,
  favoritesCount,
  topPerformersCount,
  brandName,
  industryName,
  isPersonalized,
  onLearnMore,
}: TopicPersonalizationIndicatorProps) {
  // Calculate personalization score (0-100)
  const personalizationScore = Math.min(100, 
    (usedTopicsCount * 3) + 
    (favoritesCount * 5) + 
    (topPerformersCount * 10) +
    (brandName ? 15 : 0) +
    (industryName ? 10 : 0)
  );

  const getScoreLabel = (score: number) => {
    if (score >= 80) return { label: 'Xuất sắc', color: 'text-emerald-600' };
    if (score >= 60) return { label: 'Tốt', color: 'text-amber-600' };
    if (score >= 40) return { label: 'Khá', color: 'text-orange-600' };
    return { label: 'Cơ bản', color: 'text-muted-foreground' };
  };

  const scoreInfo = getScoreLabel(personalizationScore);

  // Build learning sources
  const learningSources: LearningSource[] = [];

  if (usedTopicsCount > 0) {
    learningSources.push({
      type: 'used',
      label: 'Topics đã sử dụng',
      count: usedTopicsCount,
      impact: usedTopicsCount >= 10 ? 'high' : usedTopicsCount >= 5 ? 'medium' : 'low',
    });
  }

  if (favoritesCount > 0) {
    learningSources.push({
      type: 'favorite',
      label: 'Topics yêu thích',
      count: favoritesCount,
      impact: favoritesCount >= 5 ? 'high' : favoritesCount >= 2 ? 'medium' : 'low',
    });
  }

  if (topPerformersCount > 0) {
    learningSources.push({
      type: 'top_performer',
      label: 'Top performers',
      count: topPerformersCount,
      impact: 'high',
    });
  }

  if (brandName) {
    learningSources.push({
      type: 'brand_voice',
      label: 'Brand Voice',
      value: brandName,
      impact: 'high',
    });
  }

  if (industryName) {
    learningSources.push({
      type: 'industry',
      label: 'Industry Pack',
      value: industryName,
      impact: 'medium',
    });
  }

  const getSourceIcon = (type: LearningSource['type']) => {
    switch (type) {
      case 'used': return Zap;
      case 'favorite': return Heart;
      case 'top_performer': return Star;
      case 'brand_voice': return Target;
      case 'industry': return BookOpen;
    }
  };

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 via-violet-500/5 to-cyan-500/5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            AI Personalization
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5">
                  <span className={cn('text-xs font-semibold', scoreInfo.color)}>
                    {scoreInfo.label}
                  </span>
                  <div 
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white',
                      personalizationScore >= 80 ? 'bg-emerald-500' :
                      personalizationScore >= 60 ? 'bg-amber-500' :
                      personalizationScore >= 40 ? 'bg-orange-500' :
                      'bg-muted-foreground'
                    )}
                  >
                    {personalizationScore}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Điểm cá nhân hóa: {personalizationScore}/100</p>
                <p className="text-[10px] text-muted-foreground">
                  Dựa trên dữ liệu học tập từ tài khoản của bạn
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Personalization Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Mức độ cá nhân hóa</span>
            <span className="font-medium">{personalizationScore}%</span>
          </div>
          <Progress value={personalizationScore} className="h-2" />
          <p className="text-[10px] text-muted-foreground">
            {personalizationScore < 40 && 'Tiếp tục sử dụng để AI học thêm về preferences của bạn.'}
            {personalizationScore >= 40 && personalizationScore < 70 && 'AI đang học tốt! Thêm favorites và đánh giá để cải thiện.'}
            {personalizationScore >= 70 && 'Gợi ý được cá nhân hóa cao dựa trên dữ liệu phong phú.'}
          </p>
        </div>

        {/* Learning Sources */}
        {learningSources.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Nguồn học tập AI
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {learningSources.map((source, index) => {
                const Icon = getSourceIcon(source.type);
                return (
                  <div 
                    key={index}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-lg border text-xs',
                      impactColors[source.impact]
                    )}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{source.label}</p>
                      <p className="text-[10px] opacity-80">
                        {source.count !== undefined && `${source.count} items`}
                        {source.value && source.value}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {learningSources.length === 0 && (
          <div className="text-center py-4">
            <Lightbulb className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              Chưa có dữ liệu học tập
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Sử dụng và lưu topics để AI học về preferences của bạn
            </p>
          </div>
        )}

        {/* Tips for improving personalization */}
        {personalizationScore < 70 && (
          <div className="bg-muted/30 rounded-lg p-3 space-y-1.5">
            <h5 className="text-xs font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Cách cải thiện gợi ý
            </h5>
            <ul className="text-[10px] text-muted-foreground space-y-0.5">
              {usedTopicsCount < 10 && (
                <li className="flex items-start gap-1.5">
                  <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" />
                  Sử dụng thêm topics để AI hiểu style của bạn
                </li>
              )}
              {favoritesCount < 5 && (
                <li className="flex items-start gap-1.5">
                  <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" />
                  Đánh dấu yêu thích những topics hay để AI học
                </li>
              )}
              {!brandName && (
                <li className="flex items-start gap-1.5">
                  <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" />
                  Chọn Brand Template để gợi ý phù hợp hơn
                </li>
              )}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

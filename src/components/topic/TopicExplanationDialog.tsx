import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Lightbulb, Target, TrendingUp, Users, BarChart3,
  BookmarkPlus, Play, CalendarPlus, Sparkles, Brain,
  MessageSquare, Hash, Flame, ChevronRight, Heart,
  Globe, Database, Link2, FileText,
  type LucideIcon
} from 'lucide-react';
import { EnhancedTopicSuggestion, calculateOverallScore, SCORE_THRESHOLDS } from '@/types/topicDiscovery';
import { cn } from '@/lib/utils';

interface TopicExplanationDialogProps {
  topic: EnhancedTopicSuggestion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect?: (topic: EnhancedTopicSuggestion) => void;
  onSave?: (topic: EnhancedTopicSuggestion) => void;
  onSchedule?: (topic: EnhancedTopicSuggestion) => void;
  brandContext?: {
    brandName?: string;
    toneOfVoice?: string[];
    industry?: string[];
  };
  learningContext?: {
    usedCount: number;
    favoritesCount: number;
    topPerformersCount: number;
  };
}

interface ExplanationFactorProps {
  icon: LucideIcon;
  title: string;
  description: string;
  score?: number;
  color: string;
}

const ExplanationFactor = ({ icon: Icon, title, description, score, color }: ExplanationFactorProps) => (
  <Card className="border-border/50">
    <CardContent className="p-3 flex items-start gap-3">
      <div className={cn('p-2 rounded-lg shrink-0', color)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-medium">{title}</h4>
          {score !== undefined && (
            <Badge 
              variant="secondary" 
              className={cn(
                'text-[10px]',
                score >= SCORE_THRESHOLDS.excellent ? 'bg-emerald-500/10 text-emerald-600' :
                score >= SCORE_THRESHOLDS.good ? 'bg-amber-500/10 text-amber-600' :
                'bg-red-500/10 text-red-600'
              )}
            >
              {score}/100
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
      </div>
    </CardContent>
  </Card>
);

export function TopicExplanationDialog({
  topic,
  open,
  onOpenChange,
  onSelect,
  onSave,
  onSchedule,
  brandContext,
  learningContext,
}: TopicExplanationDialogProps) {
  if (!topic) return null;

  const overallScore = topic.scores ? calculateOverallScore(topic.scores) : 0;

  // Generate explanation factors based on topic data
  const factors: ExplanationFactorProps[] = [];

  // Brand Fit Explanation (with enhanced reasoning)
  if (topic.scores?.brandFit) {
    factors.push({
      icon: Target,
      title: 'Phù hợp với Brand',
      description: topic.scoreBreakdown?.brandFitReason || (brandContext?.brandName 
        ? `Chủ đề này phù hợp với định vị của ${brandContext.brandName}${brandContext.toneOfVoice?.length ? `. Tone ${brandContext.toneOfVoice.slice(0, 2).join(', ')} được phản ánh rõ ràng.` : '.'}`
        : 'Chủ đề phù hợp với các tiêu chí brand positioning của bạn.'),
      score: topic.scores.brandFit,
      color: 'bg-primary/10 text-primary',
    });
  }

  // Trend Explanation (with data source info)
  if (topic.scores?.trend) {
    const hasRealData = topic.dataSources?.hasRealData;
    factors.push({
      icon: Flame,
      title: 'Xu hướng hiện tại',
      description: topic.scoreBreakdown?.trendReason || (hasRealData 
        ? 'Dựa trên dữ liệu thực tế từ web search - điểm đánh giá cao hơn do có số liệu cụ thể.'
        : topic.scores.trend >= 80 
          ? 'Chủ đề đang hot trên các nền tảng. Thời điểm tốt để tạo content về topic này.'
          : topic.scores.trend >= 60
            ? 'Có sự quan tâm ổn định từ audience. Không phải peak nhưng vẫn relevant.'
            : 'Không phải trending topic, nhưng có thể là nội dung evergreen tốt.'),
      score: topic.scores.trend,
      color: 'bg-orange-500/10 text-orange-500',
    });
  }

  // Competition Explanation
  if (topic.scores?.competition) {
    factors.push({
      icon: BarChart3,
      title: 'Mức độ cạnh tranh',
      description: topic.scoreBreakdown?.competitionReason || (topic.scores.competition >= 80
        ? 'Ít cạnh tranh trong lĩnh vực này. Cơ hội tốt để xây dựng authority.'
        : topic.scores.competition >= 60
          ? 'Cạnh tranh vừa phải. Cần góc nhìn độc đáo để nổi bật.'
          : 'Cạnh tranh cao. Nên có USP rõ ràng hoặc chọn góc niche hơn.'),
      score: topic.scores.competition,
      color: 'bg-violet-500/10 text-violet-500',
    });
  }

  // Engagement Explanation
  if (topic.scores?.engagement) {
    factors.push({
      icon: Users,
      title: 'Tiềm năng tương tác',
      description: topic.scoreBreakdown?.engagementReason || (topic.scores.engagement >= 80
        ? 'Dự đoán mức engagement cao dựa trên pattern từ content tương tự.'
        : topic.scores.engagement >= 60
          ? 'Mức tương tác trung bình khá. Có thể tối ưu với hook tốt.'
          : 'Cần creative approach để tăng engagement. Xem xét format phù hợp.'),
      score: topic.scores.engagement,
      color: 'bg-emerald-500/10 text-emerald-500',
    });
  }

  // Data Source factor (Phase 1)
  if (topic.dataSources?.hasRealData) {
    factors.push({
      icon: Globe,
      title: 'Nguồn dữ liệu thực',
      description: `Topic sử dụng dữ liệu từ Perplexity web search.${topic.dataSources.statistics?.length ? ` Bao gồm ${topic.dataSources.statistics.length} số liệu thực tế.` : ''}${topic.dataSources.citations?.length ? ` Có ${topic.dataSources.citations.length} nguồn tham khảo.` : ''}`,
      color: 'bg-blue-500/10 text-blue-500',
    });
  }

  // Learning Context - if AI learned from history
  if (learningContext && (learningContext.usedCount > 0 || learningContext.favoritesCount > 0)) {
    factors.push({
      icon: Brain,
      title: 'Học từ dữ liệu của bạn',
      description: `AI đã phân tích ${learningContext.usedCount} topics đã sử dụng${learningContext.favoritesCount > 0 ? `, ${learningContext.favoritesCount} topics yêu thích` : ''}${learningContext.topPerformersCount > 0 ? ` và ${learningContext.topPerformersCount} topics hiệu suất cao` : ''} để tạo gợi ý này.`,
      color: 'bg-cyan-500/10 text-cyan-500',
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-violet-500/20">
              <Lightbulb className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-base font-semibold leading-tight">
                Tại sao AI gợi ý chủ đề này?
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Phân tích chi tiết lý do gợi ý
              </p>
            </div>
            {/* Overall Score */}
            <div 
              className={cn(
                'w-12 h-12 rounded-xl flex flex-col items-center justify-center text-white shadow-lg',
                'bg-gradient-to-br',
                overallScore >= SCORE_THRESHOLDS.excellent ? 'from-emerald-500 to-teal-600' :
                overallScore >= SCORE_THRESHOLDS.good ? 'from-amber-500 to-yellow-600' :
                overallScore >= SCORE_THRESHOLDS.fair ? 'from-orange-500 to-amber-600' :
                'from-red-500 to-rose-600'
              )}
            >
              <span className="text-lg font-bold">{overallScore}</span>
              <span className="text-[8px] -mt-0.5">điểm</span>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh]">
          <div className="px-6 py-4 space-y-4">
            {/* Topic Title */}
            <Card className="bg-muted/30 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-sm">{topic.topic}</h3>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <Badge variant="outline" className="text-[10px]">
                        {topic.category === 'evergreen' ? 'Evergreen' :
                         topic.category === 'trending' ? 'Trending' :
                         topic.category === 'seasonal' ? 'Seasonal' : 'Reactive'}
                      </Badge>
                      {topic.pillar && (
                        <Badge variant="secondary" className="text-[10px]">
                          {topic.pillar}
                        </Badge>
                      )}
                      {topic.topicType && (
                        <Badge variant="outline" className="text-[10px]">
                          {topic.topicType}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Reasoning */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                Lý do từ AI
              </h4>
              <p className="text-sm text-foreground leading-relaxed bg-muted/30 rounded-lg p-3">
                {topic.reasoning || 'Chủ đề này được gợi ý dựa trên phân tích brand, xu hướng thị trường và mục tiêu content của bạn.'}
              </p>
            </div>

            {/* Data Source Info - Phase 1 */}
            {topic.dataSources?.hasRealData && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  Nguồn dữ liệu
                </h4>
                <Card className="border-blue-500/30 bg-blue-500/5">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {topic.dataSources.perplexity && (
                        <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/30 gap-1">
                          <Globe className="w-3 h-3" />
                          Perplexity Web Search
                        </Badge>
                      )}
                      {topic.dataSources.dataType === 'statistic' && (
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1">
                          <Database className="w-3 h-3" />
                          Số liệu thực
                        </Badge>
                      )}
                    </div>
                    
                    {topic.dataSources.statistics && topic.dataSources.statistics.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-medium text-muted-foreground">Số liệu sử dụng:</p>
                        {topic.dataSources.statistics.map((stat, i) => (
                          <p key={i} className="text-xs text-foreground/80 pl-2 border-l-2 border-blue-500/30">
                            {stat}
                          </p>
                        ))}
                      </div>
                    )}
                    
                    {topic.dataSources.citations && topic.dataSources.citations.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                          <Link2 className="w-3 h-3" />
                          Nguồn tham khảo:
                        </p>
                        {topic.dataSources.citations.slice(0, 3).map((cite, i) => (
                          <a 
                            key={i} 
                            href={cite} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[10px] text-blue-500 hover:underline block truncate"
                          >
                            {cite}
                          </a>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Factor Cards */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                Phân tích chi tiết
              </h4>
              <div className="space-y-2">
                {factors.map((factor, index) => (
                  <ExplanationFactor key={index} {...factor} />
                ))}
              </div>
            </div>

            {/* Keywords */}
            {topic.relatedKeywords && topic.relatedKeywords.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" />
                  Từ khóa liên quan
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {topic.relatedKeywords.map((kw) => (
                    <Badge key={kw} variant="outline" className="text-xs px-2">
                      {kw}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-border/50 flex gap-2">
          <Button 
            className="flex-1 gap-2"
            onClick={() => {
              if (onSelect && topic) {
                onSelect(topic);
                onOpenChange(false);
              }
            }}
          >
            <Play className="w-4 h-4" />
            Sử dụng ngay
          </Button>
          {onSave && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                onSave(topic);
                onOpenChange(false);
              }}
            >
              <BookmarkPlus className="w-4 h-4" />
            </Button>
          )}
          {onSchedule && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                onSchedule(topic);
                onOpenChange(false);
              }}
            >
              <CalendarPlus className="w-4 h-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

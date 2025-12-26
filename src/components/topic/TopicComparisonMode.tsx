import React, { useMemo, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Target,
  TrendingUp,
  BarChart3,
  Users,
  Check,
  X,
  Sparkles,
  Trophy,
  ImageIcon,
  Video,
  Layers,
  FileText,
  PieChart,
  Mic,
  Briefcase,
  BookMarked,
  Presentation,
  Radio,
  Smile,
  Vote,
  Quote,
  Mail,
} from 'lucide-react';
import { EnhancedTopicSuggestion, TopicFormat, calculateOverallScore, SCORE_THRESHOLDS } from '@/types/topicDiscovery';
import { cn } from '@/lib/utils';

interface TopicComparisonModeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topics: EnhancedTopicSuggestion[];
  onSelectBest: (topic: EnhancedTopicSuggestion) => void;
  onClearSelection: () => void;
}

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];

const formatIcons: Record<TopicFormat, typeof ImageIcon> = {
  carousel: ImageIcon,
  script: Video,
  multichannel: Layers,
  blog_post: FileText,
  infographic: PieChart,
  podcast: Mic,
  case_study: Briefcase,
  whitepaper: BookMarked,
  webinar: Presentation,
  live_stream: Radio,
  ugc: Users,
  meme: Smile,
  poll: Vote,
  testimonial: Quote,
  newsletter: Mail,
};

const formatLabels: Record<TopicFormat, string> = {
  carousel: 'Carousel',
  script: 'Video Script',
  multichannel: 'Đa kênh',
  blog_post: 'Blog Post',
  infographic: 'Infographic',
  podcast: 'Podcast',
  case_study: 'Case Study',
  whitepaper: 'Whitepaper',
  webinar: 'Webinar',
  live_stream: 'Live Stream',
  ugc: 'UGC',
  meme: 'Meme',
  poll: 'Poll/Quiz',
  testimonial: 'Testimonial',
  newsletter: 'Newsletter',
};

export function TopicComparisonMode({
  open,
  onOpenChange,
  topics,
  onSelectBest,
  onClearSelection,
}: TopicComparisonModeProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation: Escape to close, Enter to select best
  useKeyboardNavigation({
    onEscape: () => onOpenChange(false),
    onEnter: () => {
      if (bestTopic) onSelectBest(bestTopic.topic);
    },
    focusTrapRef: dialogRef,
    enabled: open,
  });

  // Focus first button when dialog opens
  useEffect(() => {
    if (open && dialogRef.current) {
      const firstButton = dialogRef.current.querySelector('button') as HTMLElement;
      firstButton?.focus();
    }
  }, [open]);
  // Radar chart data
  const radarData = useMemo(() => {
    const metrics = [
      { key: 'brandFit', label: 'Brand Fit' },
      { key: 'trend', label: 'Trending' },
      { key: 'competition', label: 'Cạnh tranh' },
      { key: 'engagement', label: 'Tương tác' },
    ];

    return metrics.map(({ key, label }) => {
      const dataPoint: Record<string, string | number> = { metric: label };
      topics.forEach((topic, idx) => {
        dataPoint[`topic${idx}`] = topic.scores?.[key as keyof typeof topic.scores] || 0;
      });
      return dataPoint;
    });
  }, [topics]);

  // Calculate overall scores and find best
  const topicScores = useMemo(() => {
    return topics.map((topic) => ({
      topic,
      score: topic.scores ? calculateOverallScore(topic.scores) : 0,
    }));
  }, [topics]);

  const bestTopic = useMemo(() => {
    if (topicScores.length === 0) return null;
    return topicScores.reduce((best, current) =>
      current.score > best.score ? current : best
    );
  }, [topicScores]);

  // All formats from all topics
  const allFormats: TopicFormat[] = ['carousel', 'script', 'multichannel'];

  // AI Recommendation reasoning
  const getRecommendationReason = () => {
    if (!bestTopic) return '';
    const { topic, score } = bestTopic;
    const reasons: string[] = [];

    if (topic.scores) {
      if (topic.scores.brandFit >= 80) reasons.push('phù hợp tuyệt vời với thương hiệu');
      if (topic.scores.trend >= 80) reasons.push('đang trending mạnh');
      if (topic.scores.competition >= 80) reasons.push('ít cạnh tranh');
      if (topic.scores.engagement >= 80) reasons.push('tiềm năng tương tác cao');
    }

    if (reasons.length === 0) {
      return `Topic này có điểm tổng hợp cao nhất (${score}/100), cân bằng tốt giữa các tiêu chí.`;
    }

    return `Topic này ${reasons.join(', ')} với điểm tổng hợp ${score}/100.`;
  };

  if (topics.length < 2) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        ref={dialogRef}
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        data-keyboard-navigation
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            So sánh {topics.length} Topics
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Radar Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">So sánh điểm số</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    {topics.map((topic, idx) => (
                      <Radar
                        key={topic.topic}
                        name={topic.topic.slice(0, 30) + (topic.topic.length > 30 ? '...' : '')}
                        dataKey={`topic${idx}`}
                        stroke={CHART_COLORS[idx]}
                        fill={CHART_COLORS[idx]}
                        fillOpacity={0.2}
                        strokeWidth={2}
                      />
                    ))}
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Comparison Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Chi tiết so sánh</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">Tiêu chí</th>
                      {topics.map((topic, idx) => (
                        <th key={topic.topic} className="text-center py-2 px-2 font-medium" style={{ color: CHART_COLORS[idx] }}>
                          <div className="max-w-[150px] truncate" title={topic.topic}>
                            {topic.topic.slice(0, 20)}{topic.topic.length > 20 ? '...' : ''}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Category */}
                    <tr className="border-b">
                      <td className="py-2 px-2 text-muted-foreground">Loại</td>
                      {topics.map((topic) => (
                        <td key={topic.topic} className="text-center py-2 px-2">
                          <Badge variant="outline" className="text-xs capitalize">
                            {topic.category}
                          </Badge>
                        </td>
                      ))}
                    </tr>

                    {/* Scores */}
                    {['brandFit', 'trend', 'competition', 'engagement'].map((key) => {
                      const labels: Record<string, { icon: typeof Target; label: string }> = {
                        brandFit: { icon: Target, label: 'Brand Fit' },
                        trend: { icon: TrendingUp, label: 'Trending' },
                        competition: { icon: BarChart3, label: 'Cạnh tranh' },
                        engagement: { icon: Users, label: 'Tương tác' },
                      };
                      const { icon: Icon, label } = labels[key];
                      const values = topics.map((t) => t.scores?.[key as keyof typeof t.scores] || 0);
                      const maxValue = Math.max(...values);

                      return (
                        <tr key={key} className="border-b">
                          <td className="py-2 px-2 text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Icon className="w-3.5 h-3.5" />
                              {label}
                            </div>
                          </td>
                          {topics.map((topic, idx) => {
                            const value = topic.scores?.[key as keyof typeof topic.scores] || 0;
                            const isMax = value === maxValue && maxValue > 0;
                            return (
                              <td key={topic.topic} className="text-center py-2 px-2">
                                <span
                                  className={cn(
                                    'font-medium',
                                    isMax && 'text-emerald-600 dark:text-emerald-400',
                                    value >= SCORE_THRESHOLDS.excellent && 'text-emerald-600 dark:text-emerald-400',
                                    value >= SCORE_THRESHOLDS.good && value < SCORE_THRESHOLDS.excellent && 'text-amber-600 dark:text-amber-400',
                                    value < SCORE_THRESHOLDS.good && 'text-red-600 dark:text-red-400'
                                  )}
                                >
                                  {value}
                                  {isMax && <Trophy className="w-3 h-3 inline ml-1 text-amber-500" />}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}

                    {/* Overall Score */}
                    <tr className="border-b bg-muted/30">
                      <td className="py-2 px-2 font-medium">Điểm tổng hợp</td>
                      {topicScores.map(({ topic, score }, idx) => (
                        <td key={topic.topic} className="text-center py-2 px-2">
                          <span
                            className={cn(
                              'font-bold text-lg',
                              bestTopic?.topic === topic && 'text-emerald-600 dark:text-emerald-400'
                            )}
                          >
                            {score}
                            {bestTopic?.topic === topic && <Trophy className="w-4 h-4 inline ml-1 text-amber-500" />}
                          </span>
                        </td>
                      ))}
                    </tr>

                    {/* Format Compatibility */}
                    {allFormats.map((format) => {
                      const FormatIcon = formatIcons[format];
                      return (
                        <tr key={format} className="border-b">
                          <td className="py-2 px-2 text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <FormatIcon className="w-3.5 h-3.5" />
                              {formatLabels[format]}
                            </div>
                          </td>
                          {topics.map((topic) => {
                            const supported = topic.formats.includes(format);
                            return (
                              <td key={topic.topic} className="text-center py-2 px-2">
                                {supported ? (
                                  <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                                ) : (
                                  <X className="w-4 h-4 text-muted-foreground/50 mx-auto" />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}

                    {/* Pillar */}
                    <tr className="border-b">
                      <td className="py-2 px-2 text-muted-foreground">Pillar</td>
                      {topics.map((topic) => (
                        <td key={topic.topic} className="text-center py-2 px-2">
                          {topic.pillar ? (
                            <Badge variant="secondary" className="text-xs">
                              {topic.pillar}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* AI Recommendation */}
          {bestTopic && (
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-violet-500/5">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium flex items-center gap-2 mb-1">
                      AI khuyến nghị
                      <Trophy className="w-4 h-4 text-amber-500" />
                    </h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      <span className="font-medium text-foreground">"{bestTopic.topic.topic}"</span>
                      {' '}là lựa chọn tốt nhất. {getRecommendationReason()}
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => onSelectBest(bestTopic.topic)}>
                        <Check className="w-4 h-4 mr-1" />
                        Chọn topic này
                      </Button>
                      <Button variant="outline" size="sm" onClick={onClearSelection}>
                        Hủy so sánh
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

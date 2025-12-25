import { useState, useEffect } from 'react';
import { TrendingUp, BarChart3, ThumbsUp, MessageCircle, Share2, Eye, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useTopicPerformanceTracking } from '@/hooks/useTopicPerformanceTracking';
import { cn } from '@/lib/utils';

interface TopicPerformanceUpdaterProps {
  contentId: string;
  currentScore?: number;
  trigger?: React.ReactNode;
  onUpdate?: (score: number) => void;
}

export function TopicPerformanceUpdater({
  contentId,
  currentScore,
  trigger,
  onUpdate,
}: TopicPerformanceUpdaterProps) {
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState(currentScore || 50);
  const [engagement, setEngagement] = useState({
    likes: 0,
    comments: 0,
    shares: 0,
    views: 0,
  });
  const [useManual, setUseManual] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const { updateTopicPerformance, calculatePerformanceScore, findTopicByContentId } = useTopicPerformanceTracking();

  // Check if topic is linked
  const [topicLinked, setTopicLinked] = useState<boolean>(false);
  
  useEffect(() => {
    const checkTopic = async () => {
      const topic = await findTopicByContentId(contentId);
      setTopicLinked(!!topic);
      if (topic?.performance_score) {
        setScore(topic.performance_score);
      }
    };
    if (open) {
      checkTopic();
    }
  }, [contentId, open, findTopicByContentId]);

  const handleEngagementChange = (field: keyof typeof engagement, value: string) => {
    const numValue = parseInt(value) || 0;
    const newEngagement = { ...engagement, [field]: numValue };
    setEngagement(newEngagement);

    // Auto-calculate score from engagement
    if (!useManual && newEngagement.views > 0) {
      const calculatedScore = calculatePerformanceScore(newEngagement);
      if (calculatedScore !== null) {
        setScore(calculatedScore);
      }
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const success = await updateTopicPerformance(contentId, score, engagement);
      if (success) {
        onUpdate?.(score);
        setOpen(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-emerald-500';
    if (s >= 60) return 'text-amber-500';
    if (s >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getScoreLabel = (s: number) => {
    if (s >= 80) return 'Xuất sắc';
    if (s >= 60) return 'Tốt';
    if (s >= 40) return 'Trung bình';
    return 'Cần cải thiện';
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-1.5">
            <TrendingUp className="w-4 h-4" />
            {currentScore ? (
              <span className={cn('font-medium', getScoreColor(currentScore))}>
                {currentScore}
              </span>
            ) : (
              'Cập nhật hiệu suất'
            )}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="font-medium text-sm">Cập nhật hiệu suất</h4>
              <p className="text-xs text-muted-foreground">
                Đánh giá hiệu quả của content
              </p>
            </div>
            {topicLinked === false && (
              <Badge variant="outline" className="text-xs text-amber-600">
                Không có topic
              </Badge>
            )}
          </div>

          {topicLinked === false ? (
            <p className="text-sm text-muted-foreground">
              Content này chưa được liên kết với topic nào. Để theo dõi hiệu suất, hãy tạo content từ Topics Hub.
            </p>
          ) : (
            <>
              {/* Manual Score Input */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Điểm hiệu suất</Label>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-2xl font-bold', getScoreColor(score))}>
                      {score}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {getScoreLabel(score)}
                    </Badge>
                  </div>
                </div>
                <Slider
                  value={[score]}
                  onValueChange={([v]) => {
                    setScore(v);
                    setUseManual(true);
                  }}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Engagement Metrics */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Số liệu thực tế (tuỳ chọn)</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => setUseManual(!useManual)}
                  >
                    {useManual ? 'Tính tự động' : 'Nhập thủ công'}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Eye className="w-3 h-3" /> Views
                    </Label>
                    <Input
                      type="number"
                      value={engagement.views || ''}
                      onChange={(e) => handleEngagementChange('views', e.target.value)}
                      placeholder="0"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" /> Likes
                    </Label>
                    <Input
                      type="number"
                      value={engagement.likes || ''}
                      onChange={(e) => handleEngagementChange('likes', e.target.value)}
                      placeholder="0"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" /> Comments
                    </Label>
                    <Input
                      type="number"
                      value={engagement.comments || ''}
                      onChange={(e) => handleEngagementChange('comments', e.target.value)}
                      placeholder="0"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Share2 className="w-3 h-3" /> Shares
                    </Label>
                    <Input
                      type="number"
                      value={engagement.shares || ''}
                      onChange={(e) => handleEngagementChange('shares', e.target.value)}
                      placeholder="0"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setOpen(false)}
                >
                  <X className="w-3 h-3 mr-1" />
                  Huỷ
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleSave}
                  disabled={isLoading || !topicLinked}
                >
                  <Save className="w-3 h-3 mr-1" />
                  {isLoading ? 'Đang lưu...' : 'Lưu'}
                </Button>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

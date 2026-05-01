import { useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  BookOpen, 
  Hash, 
  Smile, 
  Clock,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Channel } from '@/types/multichannel';
import { cn } from '@/lib/utils';

interface ContentAnalyticsPanelProps {
  content: string;
  channel: Channel;
  className?: string;
}

interface AnalyticsResult {
  readabilityScore: number;
  readabilityLabel: string;
  sentimentScore: number;
  sentimentLabel: string;
  keywordDensity: { word: string; count: number }[];
  engagementScore: number;
  bestTimeToPost: string;
  estimatedReadTime: string;
  emojiCount: number;
  hashtagCount: number;
  mentionCount: number;
  linkCount: number;
}

function analyzeContentMetrics(content: string, channel: Channel): AnalyticsResult {
  const text = typeof content === 'string' ? content : '';

  const words = text.trim().split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
  
  // Readability Score (simplified Flesch-like)
  const readabilityRaw = Math.max(0, Math.min(100, 100 - (avgWordsPerSentence - 15) * 3));
  const readabilityScore = Math.round(readabilityRaw);
  const readabilityLabel = readabilityScore >= 70 ? 'Dễ đọc' 
    : readabilityScore >= 50 ? 'Trung bình' 
    : 'Khó đọc';

  // Sentiment (simple positive/negative word matching)
  const positiveWords = ['tuyệt vời', 'xuất sắc', 'tốt', 'đẹp', 'hay', 'thích', 'yêu', 'hạnh phúc', 'vui', 'thành công', 'ưu đãi', 'miễn phí', 'giảm giá', 'chất lượng', 'hoàn hảo'];
  const negativeWords = ['tệ', 'xấu', 'buồn', 'thất bại', 'lỗi', 'không', 'chán', 'khó', 'đắt'];
  const contentLower = text.toLowerCase();
  const positiveCount = positiveWords.filter(w => contentLower.includes(w)).length;
  const negativeCount = negativeWords.filter(w => contentLower.includes(w)).length;
  const sentimentRaw = ((positiveCount - negativeCount) / Math.max(positiveCount + negativeCount, 1) + 1) * 50;
  const sentimentScore = Math.round(Math.max(0, Math.min(100, sentimentRaw)));
  const sentimentLabel = sentimentScore >= 60 ? 'Tích cực' 
    : sentimentScore >= 40 ? 'Trung lập' 
    : 'Tiêu cực';

  // Keyword density
  const wordFreq: Record<string, number> = {};
  words.forEach(word => {
    const cleaned = word.toLowerCase().replace(/[^a-zA-Z0-9\u00C0-\u1EF9]/g, '');
    if (cleaned.length > 3) {
      wordFreq[cleaned] = (wordFreq[cleaned] || 0) + 1;
    }
  });
  const keywordDensity = Object.entries(wordFreq)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Engagement score based on content characteristics
  const hasEmojis = /[\u{1F600}-\u{1F6FF}]/u.test(text);
  const hasHashtags = /#\w+/.test(text);
  const hasCTA = /liên hệ|đăng ký|mua ngay|xem thêm|click|nhấn|tham gia/i.test(text);
  const hasQuestion = /\?/.test(text);
  const optimalLength = channel === 'twitter' ? (words.length >= 10 && words.length <= 50)
    : channel === 'instagram' ? (words.length >= 30 && words.length <= 150)
    : channel === 'linkedin' ? (words.length >= 100 && words.length <= 400)
    : (words.length >= 50 && words.length <= 500);
  
  let engagementScore = 40;
  if (hasEmojis) engagementScore += 10;
  if (hasHashtags) engagementScore += 10;
  if (hasCTA) engagementScore += 15;
  if (hasQuestion) engagementScore += 10;
  if (optimalLength) engagementScore += 15;
  engagementScore = Math.min(100, engagementScore);

  // Best time to post (mock - would need real data)
  const bestTimes: Record<Channel, string> = {
    facebook: '9:00 - 11:00, 19:00 - 21:00',
    instagram: '11:00 - 13:00, 19:00 - 21:00',
    pinterest: '11:00 - 13:00, 19:00 - 21:00',
    linkedin: '7:00 - 9:00, 17:00 - 18:00',
    twitter: '8:00 - 10:00, 12:00 - 13:00',
    tiktok: '19:00 - 22:00',
    youtube: '14:00 - 16:00, 20:00 - 22:00',
    email: '10:00 - 11:00',
    website: 'Bất kỳ lúc nào',
    blogger: 'Bất kỳ lúc nào',
    wordpress: 'Bất kỳ lúc nào',
    google_maps: 'Bất kỳ lúc nào',
    zalo_oa: '9:00 - 11:00, 14:00 - 16:00',
    telegram: '10:00 - 12:00, 20:00 - 22:00',
    threads: '11:00 - 13:00, 19:00 - 21:00',
  bluesky: 'Bluesky',
  };

  // Counts
  const emojiCount = (text.match(/[\u{1F600}-\u{1F6FF}]/gu) || []).length;
  const hashtagCount = (text.match(/#\w+/g) || []).length;
  const mentionCount = (text.match(/@\w+/g) || []).length;
  const linkCount = (text.match(/https?:\/\/\S+/g) || []).length;

  // Read time (200 words per minute)
  const minutes = Math.ceil(words.length / 200);
  const estimatedReadTime = minutes < 1 ? '< 1 phút' : `${minutes} phút`;

  return {
    readabilityScore,
    readabilityLabel,
    sentimentScore,
    sentimentLabel,
    keywordDensity,
    engagementScore,
    bestTimeToPost: bestTimes[channel],
    estimatedReadTime,
    emojiCount,
    hashtagCount,
    mentionCount,
    linkCount,
  };
}

export function ContentAnalyticsPanel({
  content,
  channel,
  className,
}: ContentAnalyticsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const analytics = useMemo(() => analyzeContentMetrics(content, channel), [content, channel]);

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getProgressColor = (score: number) => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between px-3 py-2 h-auto"
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Phân tích nội dung</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Engagement: {analytics.engagementScore}%
            </Badge>
            {isOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="p-4 space-y-4 border-t border-border/50">
          {/* Scores Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Engagement Score */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Engagement</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={cn('text-2xl font-bold', getScoreColor(analytics.engagementScore))}>
                  {analytics.engagementScore}
                </span>
                <span className="text-xs text-muted-foreground">/100</span>
              </div>
              <Progress 
                value={analytics.engagementScore} 
                className={cn('h-1.5', getProgressColor(analytics.engagementScore))}
              />
            </div>

            {/* Readability */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Độ dễ đọc</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={cn('text-2xl font-bold', getScoreColor(analytics.readabilityScore))}>
                  {analytics.readabilityScore}
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  {analytics.readabilityLabel}
                </Badge>
              </div>
              <Progress 
                value={analytics.readabilityScore} 
                className="h-1.5"
              />
            </div>

            {/* Sentiment */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Smile className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Cảm xúc</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={cn('text-2xl font-bold', getScoreColor(analytics.sentimentScore))}>
                  {analytics.sentimentScore}
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  {analytics.sentimentLabel}
                </Badge>
              </div>
              <Progress 
                value={analytics.sentimentScore} 
                className="h-1.5"
              />
            </div>

            {/* Read Time */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Thời gian đọc</span>
              </div>
              <div className="text-2xl font-bold">
                {analytics.estimatedReadTime}
              </div>
              <p className="text-xs text-muted-foreground">
                Đăng lúc: {analytics.bestTimeToPost}
              </p>
            </div>
          </div>

          {/* Content Elements */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1">
              <Smile className="w-3 h-3" />
              {analytics.emojiCount} emoji
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Hash className="w-3 h-3" />
              {analytics.hashtagCount} hashtag
            </Badge>
            <Badge variant="outline">
              @ {analytics.mentionCount} mention
            </Badge>
            <Badge variant="outline">
              🔗 {analytics.linkCount} link
            </Badge>
          </div>

          {/* Top Keywords */}
          {analytics.keywordDensity.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Từ khóa chính:</span>
              <div className="flex flex-wrap gap-1.5">
                {analytics.keywordDensity.map(({ word, count }) => (
                  <Badge key={word} variant="secondary" className="text-xs">
                    {word} ({count})
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

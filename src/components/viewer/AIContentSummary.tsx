import { useState } from 'react';
import { 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Loader2,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Channel } from '@/types/multichannel';
import { cn } from '@/lib/utils';

interface AIAnalysisResult {
  summary: string;
  strengths: string[];
  improvements: string[];
  overallScore: number;
}

interface AIContentSummaryProps {
  content: string;
  channel: Channel;
  topic: string;
  contentGoal: string;
  brandName: string;
  className?: string;
}

export function AIContentSummary({
  content,
  channel,
  topic,
  contentGoal,
  brandName,
  className,
}: AIContentSummaryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);

  const analyzeContent = async () => {
    if (!content.trim()) {
      toast({ title: 'Không có nội dung', description: 'Không có nội dung để phân tích', variant: 'destructive' });
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-content', {
        body: {
          content,
          channel,
          topic,
          contentGoal,
          brandName,
        },
      });

      if (error) throw error;

      if (data) {
        setAnalysis(data as AIAnalysisResult);
      }
    } catch (error) {
      console.error('Error analyzing content:', error);
      // Fallback to local analysis if edge function fails
      setAnalysis(generateLocalAnalysis(content, channel));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Local fallback analysis
  const generateLocalAnalysis = (text: string, ch: Channel): AIAnalysisResult => {
    const words = text.split(/\s+/).filter(Boolean).length;
    const hasEmojis = /[\u{1F600}-\u{1F6FF}]/u.test(text);
    const hasHashtags = /#\w+/.test(text);
    const hasCTA = /liên hệ|đăng ký|mua ngay|xem thêm|click|nhấn|tham gia/i.test(text);
    const hasQuestion = /\?/.test(text);

    const strengths: string[] = [];
    const improvements: string[] = [];

    // Analyze based on channel
    if (ch === 'instagram' || ch === 'facebook' || ch === 'tiktok') {
      if (hasEmojis) strengths.push('Sử dụng emoji giúp tăng tương tác');
      else improvements.push('Thêm emoji để nội dung sinh động hơn');
      
      if (hasHashtags) strengths.push('Có hashtag giúp tăng reach');
      else improvements.push('Thêm hashtag phù hợp để tăng khả năng tiếp cận');
    }

    if (hasCTA) strengths.push('Có call-to-action rõ ràng');
    else improvements.push('Thêm call-to-action để tăng tỷ lệ chuyển đổi');

    if (hasQuestion) strengths.push('Câu hỏi giúp tăng tương tác');

    if (ch === 'linkedin' && words >= 100) {
      strengths.push('Độ dài phù hợp cho LinkedIn');
    } else if (ch === 'linkedin' && words < 100) {
      improvements.push('Có thể viết dài hơn để phù hợp với LinkedIn');
    }

    if (ch === 'twitter' && words <= 50) {
      strengths.push('Ngắn gọn, súc tích - phù hợp cho X/Twitter');
    } else if (ch === 'twitter' && words > 50) {
      improvements.push('Có thể rút gọn để phù hợp với Twitter');
    }

    if (words >= 50 && words <= 300) {
      strengths.push('Độ dài cân đối, dễ đọc');
    }

    // Default suggestions
    if (strengths.length === 0) {
      strengths.push('Nội dung có cấu trúc rõ ràng');
    }
    if (improvements.length === 0) {
      improvements.push('Có thể thêm số liệu cụ thể để tăng độ tin cậy');
    }

    const score = Math.min(100, 40 + strengths.length * 15 - improvements.length * 5);

    return {
      summary: `Nội dung ${ch} về "${topic}" có ${words} từ. ${hasCTA ? 'Có CTA rõ ràng.' : 'Thiếu CTA.'} ${hasEmojis ? 'Có emoji.' : ''} ${hasHashtags ? 'Có hashtag.' : ''}`,
      strengths,
      improvements,
      overallScore: score,
    };
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
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
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">AI Phân tích & Gợi ý</span>
          </div>
          <div className="flex items-center gap-2">
            {analysis && (
              <Badge variant="outline" className={cn('text-xs', getScoreColor(analysis.overallScore))}>
                Điểm: {analysis.overallScore}/100
              </Badge>
            )}
            {isOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="p-4 border-t border-border/50 space-y-4">
          {!analysis ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-3">
                AI sẽ phân tích nội dung và đưa ra gợi ý cải thiện
              </p>
              <Button
                onClick={analyzeContent}
                disabled={isAnalyzing}
                className="gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang phân tích...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Phân tích với AI
                  </>
                )}
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-64">
              <div className="space-y-4">
                {/* Summary */}
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm">{analysis.summary}</p>
                </div>

                {/* Strengths */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium">Điểm mạnh</span>
                  </div>
                  <ul className="space-y-1.5">
                    {analysis.strengths.map((strength, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-green-500 mt-1">•</span>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Improvements */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium">Gợi ý cải thiện</span>
                  </div>
                  <ul className="space-y-1.5">
                    {analysis.improvements.map((improvement, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-yellow-500 mt-1">•</span>
                        {improvement}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Re-analyze button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={analyzeContent}
                  disabled={isAnalyzing}
                  className="w-full gap-2"
                >
                  <RefreshCw className={cn('w-4 h-4', isAnalyzing && 'animate-spin')} />
                  Phân tích lại
                </Button>
              </div>
            </ScrollArea>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

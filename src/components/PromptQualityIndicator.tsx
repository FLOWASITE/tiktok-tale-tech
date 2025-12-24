import React from 'react';
import { 
  Brain, 
  Building2, 
  GraduationCap, 
  Sparkles,
  AlertCircle,
  CheckCircle2,
  TrendingUp
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AdvancedPromptContext, PromptQualityScore } from '@/hooks/useAdvancedPromptContext';

interface PromptQualityIndicatorProps {
  context: AdvancedPromptContext;
  variant?: 'compact' | 'detailed';
  className?: string;
}

const getScoreColor = (score: number): string => {
  if (score >= 80) return 'text-emerald-500';
  if (score >= 60) return 'text-amber-500';
  return 'text-red-500';
};

const getScoreBgColor = (score: number): string => {
  if (score >= 80) return 'bg-emerald-500/20';
  if (score >= 60) return 'bg-amber-500/20';
  return 'bg-red-500/20';
};

const getProgressColor = (score: number): string => {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-red-500';
};

const getQualityLabel = (score: number): string => {
  if (score >= 80) return 'Xuất sắc';
  if (score >= 60) return 'Tốt';
  if (score >= 40) return 'Trung bình';
  return 'Cần cải thiện';
};

const getSuggestions = (context: AdvancedPromptContext): string[] => {
  const suggestions: string[] = [];
  const { brand, industry, learning, qualityScore } = context;

  if (!brand?.brandPositioning) {
    suggestions.push('Thêm brand positioning để AI hiểu rõ định vị thương hiệu');
  }
  if (!brand?.toneOfVoice?.length) {
    suggestions.push('Định nghĩa tone of voice để nội dung nhất quán');
  }
  if (!brand?.contentPillars?.length) {
    suggestions.push('Tạo content pillars để cân bằng chủ đề');
  }
  if (!industry) {
    suggestions.push('Liên kết Industry Memory để tuân thủ quy định ngành');
  }
  if (!learning || learning.totalTopicsUsed < 5) {
    suggestions.push('Sử dụng nhiều topics hơn để AI học từ performance');
  }
  if (learning && learning.topPerformers.length < 3) {
    suggestions.push('Đánh giá performance topics để AI hiểu patterns thành công');
  }

  return suggestions.slice(0, 3);
};

export function PromptQualityIndicator({ 
  context, 
  variant = 'compact',
  className 
}: PromptQualityIndicatorProps) {
  const { qualityScore } = context;
  const suggestions = getSuggestions(context);

  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full cursor-help",
              getScoreBgColor(qualityScore.overallScore),
              className
            )}>
              <Sparkles className={cn("h-4 w-4", getScoreColor(qualityScore.overallScore))} />
              <span className={cn("text-sm font-medium", getScoreColor(qualityScore.overallScore))}>
                {qualityScore.overallScore}%
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs p-3">
            <div className="space-y-2">
              <p className="font-medium">Chất lượng Prompt: {getQualityLabel(qualityScore.overallScore)}</p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Brand Context:</span>
                  <span className={getScoreColor(qualityScore.brandContextScore)}>
                    {qualityScore.brandContextScore}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Industry Memory:</span>
                  <span className={getScoreColor(qualityScore.industryContextScore)}>
                    {qualityScore.industryContextScore}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Learning Data:</span>
                  <span className={getScoreColor(qualityScore.learningDataScore)}>
                    {qualityScore.learningDataScore}%
                  </span>
                </div>
              </div>
              {suggestions.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Cải thiện:</p>
                  <ul className="text-xs space-y-0.5">
                    {suggestions.slice(0, 2).map((s, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <AlertCircle className="h-3 w-3 mt-0.5 shrink-0 text-amber-500" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Detailed variant
  return (
    <Card className={cn("", className)}>
      <CardContent className="p-4 space-y-4">
        {/* Overall Score */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className={cn("h-5 w-5", getScoreColor(qualityScore.overallScore))} />
            <span className="font-medium">Prompt Quality</span>
          </div>
          <Badge 
            variant="secondary" 
            className={cn(getScoreBgColor(qualityScore.overallScore), "border-0")}
          >
            <span className={getScoreColor(qualityScore.overallScore)}>
              {qualityScore.overallScore}% - {getQualityLabel(qualityScore.overallScore)}
            </span>
          </Badge>
        </div>

        {/* Individual Scores */}
        <div className="space-y-3">
          {/* Brand Context */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5">
                <Brain className="h-4 w-4 text-muted-foreground" />
                <span>Brand Context</span>
              </div>
              <span className={getScoreColor(qualityScore.brandContextScore)}>
                {qualityScore.brandContextScore}%
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn("h-full rounded-full transition-all", getProgressColor(qualityScore.brandContextScore))}
                style={{ width: `${qualityScore.brandContextScore}%` }}
              />
            </div>
            {context.brand && (
              <div className="flex flex-wrap gap-1 mt-1">
                {context.brand.brandPositioning && (
                  <Badge variant="outline" className="text-xs py-0">Định vị</Badge>
                )}
                {context.brand.toneOfVoice?.length && (
                  <Badge variant="outline" className="text-xs py-0">Tone</Badge>
                )}
                {context.brand.contentPillars?.length && (
                  <Badge variant="outline" className="text-xs py-0">Pillars ({context.brand.contentPillars.length})</Badge>
                )}
              </div>
            )}
          </div>

          {/* Industry Context */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>Industry Memory</span>
              </div>
              <span className={getScoreColor(qualityScore.industryContextScore)}>
                {qualityScore.industryContextScore}%
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn("h-full rounded-full transition-all", getProgressColor(qualityScore.industryContextScore))}
                style={{ width: `${qualityScore.industryContextScore}%` }}
              />
            </div>
            {context.industry && (
              <div className="flex flex-wrap gap-1 mt-1">
                {context.industry.targetAudience && (
                  <Badge variant="outline" className="text-xs py-0">{context.industry.targetAudience}</Badge>
                )}
                {context.industry.complianceRulesCount > 0 && (
                  <Badge variant="outline" className="text-xs py-0">
                    {context.industry.complianceRulesCount} rules
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Learning Data */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                <span>Learning Data</span>
              </div>
              <span className={getScoreColor(qualityScore.learningDataScore)}>
                {qualityScore.learningDataScore}%
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn("h-full rounded-full transition-all", getProgressColor(qualityScore.learningDataScore))}
                style={{ width: `${qualityScore.learningDataScore}%` }}
              />
            </div>
            {context.learning && (
              <div className="flex flex-wrap gap-1 mt-1">
                <Badge variant="outline" className="text-xs py-0">
                  {context.learning.totalTopicsUsed} topics used
                </Badge>
                {context.learning.topPerformers.length > 0 && (
                  <Badge variant="outline" className="text-xs py-0">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {context.learning.topPerformers.length} top performers
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="pt-3 border-t space-y-2">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Cải thiện để AI hiểu rõ hơn
            </p>
            <ul className="text-sm space-y-1.5">
              {suggestions.map((suggestion, i) => (
                <li key={i} className="flex items-start gap-2 text-muted-foreground">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Success state */}
        {qualityScore.overallScore >= 80 && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-500/10 rounded-lg p-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>AI có đủ context để tạo nội dung chất lượng cao</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

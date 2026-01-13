/**
 * ContentQualityBadge - Visual indicator for content quality score
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QualityBreakdown {
  artifact_penalty?: number;
  legal_structure?: number;
  completeness?: number;
  readability?: number;
}

interface ContentQualityBadgeProps {
  score: number | null | undefined;
  breakdown?: QualityBreakdown | null;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function ContentQualityBadge({ 
  score, 
  breakdown, 
  showLabel = true,
  size = 'sm',
  className,
}: ContentQualityBadgeProps) {
  if (score === null || score === undefined) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500",
                size === 'sm' ? 'px-1.5 py-0' : 'px-2 py-0.5',
                className
              )}
            >
              <HelpCircle className={cn("mr-1", size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
              {showLabel && 'Chưa chấm'}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Nội dung chưa được chấm điểm chất lượng</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const getQualityConfig = (score: number) => {
    if (score >= 90) {
      return {
        level: 'excellent',
        label: 'Xuất sắc',
        icon: CheckCircle2,
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        borderColor: 'border-green-300 dark:border-green-700',
        textColor: 'text-green-700 dark:text-green-400',
        iconColor: 'text-green-600',
      };
    }
    if (score >= 70) {
      return {
        level: 'good',
        label: 'Tốt',
        icon: CheckCircle2,
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        borderColor: 'border-blue-300 dark:border-blue-700',
        textColor: 'text-blue-700 dark:text-blue-400',
        iconColor: 'text-blue-600',
      };
    }
    if (score >= 50) {
      return {
        level: 'acceptable',
        label: 'Chấp nhận',
        icon: AlertTriangle,
        bgColor: 'bg-amber-100 dark:bg-amber-900/30',
        borderColor: 'border-amber-300 dark:border-amber-700',
        textColor: 'text-amber-700 dark:text-amber-400',
        iconColor: 'text-amber-600',
      };
    }
    return {
      level: 'poor',
      label: 'Cần cải thiện',
      icon: XCircle,
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      borderColor: 'border-red-300 dark:border-red-700',
      textColor: 'text-red-700 dark:text-red-400',
      iconColor: 'text-red-600',
    };
  };

  const config = getQualityConfig(score);
  const Icon = config.icon;

  const formatBreakdownItem = (key: string, value: number | undefined) => {
    if (value === undefined) return null;
    const labels: Record<string, string> = {
      artifact_penalty: 'HTML Artifacts',
      legal_structure: 'Cấu trúc pháp lý',
      completeness: 'Độ đầy đủ',
      readability: 'Dễ đọc',
    };
    return (
      <div key={key} className="flex items-center justify-between gap-4 text-xs">
        <span className="text-muted-foreground">{labels[key] || key}</span>
        <span className="font-mono">
          {key === 'artifact_penalty' ? `-${value}` : `+${value}`}
        </span>
      </div>
    );
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn(
              config.bgColor,
              config.borderColor,
              config.textColor,
              size === 'sm' ? 'px-1.5 py-0 text-xs' : 'px-2 py-0.5 text-sm',
              className
            )}
          >
            <Icon className={cn(config.iconColor, "mr-1", size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
            <span className="font-mono font-medium">{score}</span>
            {showLabel && <span className="ml-1 hidden sm:inline">({config.label})</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="w-56">
          <div className="space-y-2">
            <div className="flex items-center justify-between font-medium">
              <span>Quality Score</span>
              <span className={cn("font-mono", config.textColor)}>{score}/100</span>
            </div>
            {breakdown && (
              <div className="space-y-1 pt-2 border-t">
                {Object.entries(breakdown).map(([key, value]) => 
                  formatBreakdownItem(key, value as number)
                )}
              </div>
            )}
            {config.level === 'poor' && (
              <div className="pt-2 border-t flex items-center gap-1.5 text-xs text-amber-600">
                <Sparkles className="h-3 w-3" />
                <span>Cần AI Cleanup để cải thiện</span>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Calculate content quality score from text
 * This is a client-side estimation - actual scoring happens in edge function
 */
export function estimateContentQuality(text: string | null | undefined): number | null {
  if (!text || text.length < 100) return null;

  let score = 100;
  const breakdown = {
    artifact_penalty: 0,
    legal_structure: 0,
    completeness: 0,
    readability: 0,
  };

  // Artifact detection (negative)
  const artifactPatterns = [
    { pattern: /\[!\[\]\([^)]+\)\]/g, penalty: 5 },
    { pattern: /Đăng nhập|Đăng ký|Tìm kiếm/gi, penalty: 3 },
    { pattern: /Facebook|Twitter|Youtube/gi, penalty: 2 },
    { pattern: /Copyright|Bản quyền/gi, penalty: 2 },
    { pattern: /^\|[\s\|]+\|$/gm, penalty: 2 },
    { pattern: /Văn bản liên quan|Xem thêm/gi, penalty: 2 },
  ];

  for (const { pattern, penalty } of artifactPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      breakdown.artifact_penalty += matches.length * penalty;
    }
  }
  score -= Math.min(breakdown.artifact_penalty, 40);

  // Legal structure detection (positive)
  const legalPatterns = [
    { pattern: /CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM/gi, bonus: 10 },
    { pattern: /Điều\s+\d+/gi, bonus: 2 },
    { pattern: /Chương\s+[IVX\d]+/gi, bonus: 3 },
    { pattern: /Khoản\s+\d+/gi, bonus: 1 },
    { pattern: /QUYẾT ĐỊNH|NGHỊ ĐỊNH|THÔNG TƯ|LUẬT/gi, bonus: 5 },
  ];

  for (const { pattern, bonus } of legalPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      breakdown.legal_structure += Math.min(matches.length * bonus, 20);
    }
  }
  score = Math.min(100, score + Math.min(breakdown.legal_structure, 20));

  // Completeness check
  const hasHeader = /CỘNG HÒA|Độc lập - Tự do/i.test(text);
  const hasBody = /Điều\s+\d+/i.test(text);
  const hasSignature = /Nơi nhận:|BỘ TRƯỞNG|THỦ TƯỚNG|CHỦ TỊCH/i.test(text);
  
  if (hasHeader) breakdown.completeness += 5;
  if (hasBody) breakdown.completeness += 10;
  if (hasSignature) breakdown.completeness += 5;
  score = Math.min(100, score + breakdown.completeness);

  // Readability (text quality)
  const avgLineLength = text.length / (text.split('\n').length || 1);
  if (avgLineLength > 50 && avgLineLength < 200) {
    breakdown.readability += 5;
    score = Math.min(100, score + 5);
  }

  return Math.max(0, Math.min(100, score));
}

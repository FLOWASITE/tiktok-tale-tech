import React from 'react';
import { GitCompareArrows, CheckCircle2, AlertTriangle, XCircle, ChevronDown } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  type CrossChannelDedupResult,
  getDiversityGrade,
  formatSimilarity,
  getPairStatus,
  getChannelDisplayName,
} from '@/types/cross-channel-dedup';
import { cn } from '@/lib/utils';

interface CrossChannelDedupBadgeProps {
  result: CrossChannelDedupResult | null | undefined;
  className?: string;
  showDetails?: boolean;
}

export function CrossChannelDedupBadge({ 
  result, 
  className,
  showDetails = true,
}: CrossChannelDedupBadgeProps) {
  if (!result) return null;

  const gradeInfo = getDiversityGrade(result.overallScore);
  
  // Determine icon based on status
  const StatusIcon = result.hasDuplicates 
    ? XCircle 
    : result.hasWarnings 
      ? AlertTriangle 
      : CheckCircle2;

  const content = (
    <Badge
      variant="outline"
      className={cn(
        'gap-1.5 font-medium cursor-pointer hover:opacity-80 transition-opacity',
        gradeInfo.colorClass,
        className
      )}
    >
      <GitCompareArrows className="h-3.5 w-3.5" />
      <span>Đa dạng: {gradeInfo.grade}</span>
      <span className="text-xs opacity-70">({result.overallScore}%)</span>
      {showDetails && <ChevronDown className="h-3 w-3 opacity-50" />}
    </Badge>
  );

  if (!showDetails) {
    return content;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        {content}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-2">
            <StatusIcon className={cn('h-5 w-5', gradeInfo.iconClass)} />
            <div>
              <h4 className="font-semibold text-sm">{gradeInfo.label}</h4>
              <p className="text-xs text-muted-foreground">{gradeInfo.description}</p>
            </div>
          </div>
          
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Điểm đa dạng</span>
              <span className="font-medium">{result.overallScore}/100</span>
            </div>
            <Progress value={result.overallScore} className="h-2" />
          </div>
        </div>

        {result.pairs.length > 0 && (
          <ScrollArea className="max-h-48">
            <div className="p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                So sánh từng cặp kênh:
              </p>
              {result.pairs.slice(0, 6).map((pair, index) => {
                const pairStatus = getPairStatus(pair);
                return (
                  <div
                    key={index}
                    className={cn(
                      'flex items-center justify-between p-2 rounded-md text-xs',
                      pairStatus.colorClass
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">
                        {getChannelDisplayName(pair.channel1)}
                      </span>
                      <span className="text-muted-foreground">↔</span>
                      <span className="font-medium">
                        {getChannelDisplayName(pair.channel2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{formatSimilarity(pair.similarity)}</span>
                    </div>
                  </div>
                );
              })}
              {result.pairs.length > 6 && (
                <p className="text-xs text-muted-foreground text-center py-1">
                  +{result.pairs.length - 6} cặp khác
                </p>
              )}
            </div>
          </ScrollArea>
        )}

        {result.hasDuplicates && Object.keys(result.diversificationSuggestions).length > 0 && (
          <div className="p-3 border-t bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              💡 Gợi ý cải thiện:
            </p>
            <div className="space-y-1.5">
              {Object.entries(result.diversificationSuggestions).slice(0, 3).map(([channel, suggestion]) => (
                <div key={channel} className="text-xs">
                  <span className="font-medium">{getChannelDisplayName(channel)}:</span>{' '}
                  <span className="text-muted-foreground">{suggestion}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, ChevronRight, TrendingUp, Check } from 'lucide-react';
import { VideoType, VIDEO_TYPE_LABELS, VIDEO_TYPE_CATEGORIES, VideoTypeCategory } from '@/types/script';
import { useVideoTypeRecommendations } from '@/hooks/useVideoTypeRecommendations';
import { cn } from '@/lib/utils';

interface VideoTypeRecommendationsProps {
  topic: string;
  industry?: string;
  currentValue: VideoType;
  onSelect: (videoType: VideoType) => void;
  disabled?: boolean;
}

const CATEGORY_COLORS: Record<VideoTypeCategory, string> = {
  educational: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
  engagement: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
  entertainment: 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400',
  commercial: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
};

export function VideoTypeRecommendations({
  topic,
  industry,
  currentValue,
  onSelect,
  disabled,
}: VideoTypeRecommendationsProps) {
  const { recommendations, topRecommendation } = useVideoTypeRecommendations({
    topic,
    industry,
    enabled: topic.trim().length >= 10,
  });

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-3 h-3 text-primary" />
        </div>
        <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Gợi ý AI</span>
      </div>

      {/* Top Recommendation */}
      {topRecommendation && topRecommendation.videoType !== currentValue && (
        <button
          type="button"
          onClick={() => onSelect(topRecommendation.videoType)}
          disabled={disabled}
          className={cn(
            "w-full p-4 rounded-xl border border-primary/15 bg-primary/[0.03]",
            "hover:border-primary/30 hover:bg-primary/[0.06] transition-all duration-300",
            "text-left group",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-primary/70" />
              <span className="font-semibold text-sm text-foreground tracking-tight">
                {VIDEO_TYPE_LABELS[topRecommendation.videoType]}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className={cn("text-[10px] h-5 font-semibold border-0", CATEGORY_COLORS[topRecommendation.category])}>
                {VIDEO_TYPE_CATEGORIES[topRecommendation.category].label}
              </Badge>
              <span className="text-xs font-bold text-primary/80">{topRecommendation.score}%</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-1">
            {topRecommendation.reason}
          </p>
        </button>
      )}

      {/* Current Selection Confirmation */}
      {topRecommendation && topRecommendation.videoType === currentValue && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-primary/[0.04] border border-primary/10">
          <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <Check className="w-3 h-3 text-primary" />
          </div>
          <span className="text-xs text-muted-foreground">
            <strong className="text-foreground">{VIDEO_TYPE_LABELS[currentValue]}</strong> là lựa chọn phù hợp nhất
          </span>
        </div>
      )}

      {/* Other Recommendations */}
      {recommendations.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {recommendations
            .filter(rec => rec.videoType !== topRecommendation?.videoType && rec.videoType !== currentValue)
            .slice(0, 3)
            .map((rec) => (
              <Button
                key={rec.videoType}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onSelect(rec.videoType)}
                disabled={disabled}
                className={cn(
                  "h-8 text-xs gap-1.5 rounded-xl",
                  "border border-border/30 bg-muted/30 hover:bg-muted/60 hover:border-border/50"
                )}
              >
                {VIDEO_TYPE_LABELS[rec.videoType]}
                <span className="text-[10px] text-muted-foreground/70 font-mono">{rec.score}%</span>
              </Button>
            ))}
        </div>
      )}
    </div>
  );
}

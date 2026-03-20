import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lightbulb, Sparkles, ChevronRight, TrendingUp } from 'lucide-react';
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
  educational: 'bg-blue-500/10 text-blue-600 border-blue-200',
  engagement: 'bg-amber-500/10 text-amber-600 border-amber-200',
  entertainment: 'bg-purple-500/10 text-purple-600 border-purple-200',
  commercial: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
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
    <div className="space-y-3 p-3 rounded-xl bg-gradient-to-br from-primary/5 via-transparent to-transparent border border-primary/20">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
          <Lightbulb className="w-3.5 h-3.5 text-primary" />
        </div>
        <span className="text-sm font-medium text-foreground">Gợi ý thể loại phù hợp</span>
        <Badge variant="secondary" className="text-[10px] h-4 px-1.5 gap-1">
          <Sparkles className="w-2.5 h-2.5" />
          Smart
        </Badge>
      </div>

      {/* Top Recommendation */}
      {topRecommendation && topRecommendation.videoType !== currentValue && (
        <button
          type="button"
          onClick={() => onSelect(topRecommendation.videoType)}
          disabled={disabled}
          className={cn(
            "w-full p-3 rounded-lg border-2 border-primary/30 bg-primary/5",
            "hover:border-primary/50 hover:bg-primary/10 transition-all",
            "text-left group",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm text-foreground">
                {VIDEO_TYPE_LABELS[topRecommendation.videoType]}
              </span>
              <Badge className={cn("text-[10px] h-5", CATEGORY_COLORS[topRecommendation.category])}>
                {VIDEO_TYPE_CATEGORIES[topRecommendation.category].label}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary">{topRecommendation.score}%</span>
              <ChevronRight className="w-4 h-4 text-primary group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">
            {topRecommendation.reason}
          </p>
        </button>
      )}

      {/* Other Recommendations */}
      {recommendations.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {recommendations
            .filter(rec => rec.videoType !== topRecommendation?.videoType && rec.videoType !== currentValue)
            .slice(0, 4)
            .map((rec) => (
              <Button
                key={rec.videoType}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onSelect(rec.videoType)}
                disabled={disabled}
                className={cn(
                  "h-7 text-xs gap-1.5 border-border/50",
                  "hover:border-primary/50 hover:bg-primary/5"
                )}
              >
                <span className="text-[10px] opacity-70">•</span>
                {VIDEO_TYPE_LABELS[rec.videoType]}
                <span className="text-[10px] text-muted-foreground">({rec.score}%)</span>
              </Button>
            ))}
        </div>
      )}

      {/* Current Selection Confirmation */}
      {topRecommendation && topRecommendation.videoType === currentValue && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
          <span className="text-green-600 text-lg">✓</span>
          <span className="text-xs text-green-700">
            <strong>{VIDEO_TYPE_LABELS[currentValue]}</strong> là lựa chọn phù hợp nhất cho chủ đề này
          </span>
        </div>
      )}
    </div>
  );
}

import React from 'react';
import { useCharacterTypeRecommendations } from '@/hooks/useCharacterTypeRecommendations';
import { CharacterType, CHARACTER_TYPE_LABELS, CHARACTER_CATEGORIES, VideoType } from '@/types/script';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CharacterTypeRecommendationsProps {
  topic: string;
  videoType?: VideoType;
  industry?: string;
  selectedCharacterType?: CharacterType;
  onSelect: (characterType: CharacterType) => void;
  enabled?: boolean;
}

export function CharacterTypeRecommendations({
  topic,
  videoType,
  industry,
  selectedCharacterType,
  onSelect,
  enabled = true,
}: CharacterTypeRecommendationsProps) {
  const { recommendations, topRecommendation } = useCharacterTypeRecommendations({
    topic,
    videoType,
    industry,
    enabled,
  });

  if (!enabled || recommendations.length === 0) {
    return null;
  }

  const getScoreStyle = (score: number) => {
    if (score >= 80) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40';
    if (score >= 60) return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40';
    return 'text-muted-foreground bg-muted/50';
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-3 h-3 text-primary" />
        </div>
        <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Gợi ý AI</span>
        {videoType && (
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-muted/50 border-0 font-normal">
            Dựa trên Video Type
          </Badge>
        )}
      </div>

      {/* Top Recommendation */}
      {topRecommendation && (
        <button
          type="button"
          className={cn(
            "w-full p-4 rounded-xl text-left transition-all duration-300",
            selectedCharacterType === topRecommendation.characterType
              ? "border-2 border-primary/30 bg-primary/[0.04] shadow-sm"
              : "border border-border/30 bg-muted/20 hover:border-primary/20 hover:bg-muted/40"
          )}
          onClick={() => onSelect(topRecommendation.characterType)}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground tracking-tight">
                {CHARACTER_TYPE_LABELS[topRecommendation.characterType]}
              </span>
              <Badge variant="secondary" className={cn("text-[10px] h-5 font-semibold border-0", getScoreStyle(topRecommendation.score))}>
                {topRecommendation.score}%
              </Badge>
              {selectedCharacterType === topRecommendation.characterType && (
                <div className="w-4 h-4 rounded-full bg-primary/15 flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-primary" />
                </div>
              )}
            </div>
            <Badge variant="secondary" className="text-[10px] h-5 bg-muted/50 border-0 font-normal">
              {CHARACTER_CATEGORIES[topRecommendation.category].label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {topRecommendation.reason}
          </p>
        </button>
      )}

      {/* Other Recommendations */}
      {recommendations.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {recommendations.slice(1, 4).map((rec) => (
            <Button
              key={rec.characterType}
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 text-xs gap-1.5 rounded-xl",
                selectedCharacterType === rec.characterType
                  ? "border-2 border-primary/30 bg-primary/5"
                  : "border border-border/30 bg-muted/30 hover:bg-muted/60 hover:border-border/50"
              )}
              onClick={() => onSelect(rec.characterType)}
            >
              {CHARACTER_TYPE_LABELS[rec.characterType]}
              <Badge 
                variant="secondary" 
                className={cn("text-[10px] h-4 px-1.5 border-0", getScoreStyle(rec.score))}
              >
                {rec.score}%
              </Badge>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

import React from 'react';
import { useCharacterTypeRecommendations } from '@/hooks/useCharacterTypeRecommendations';
import { CharacterType, CHARACTER_TYPE_LABELS, CHARACTER_CATEGORIES, VideoType } from '@/types/script';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, User, CheckCircle2 } from 'lucide-react';
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

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-amber-600 dark:text-amber-400';
    return 'text-muted-foreground';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/30';
    if (score >= 60) return 'bg-amber-100 dark:bg-amber-900/30';
    return 'bg-muted';
  };

  return (
    <div className="space-y-3 p-4 rounded-lg bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/30 border border-violet-200 dark:border-violet-800">
      <div className="flex items-center gap-2 text-sm font-medium text-violet-700 dark:text-violet-300">
        <Sparkles className="h-4 w-4" />
        <span>Gợi ý Character phù hợp</span>
        {videoType && (
          <Badge variant="secondary" className="text-xs">
            Dựa trên Video Type
          </Badge>
        )}
      </div>

      {/* Top Recommendation */}
      {topRecommendation && (
        <div 
          className={cn(
            "p-3 rounded-lg border-2 transition-all cursor-pointer",
            selectedCharacterType === topRecommendation.characterType
              ? "border-violet-500 bg-violet-100 dark:bg-violet-900/40"
              : "border-violet-300 dark:border-violet-700 bg-white dark:bg-background hover:border-violet-400"
          )}
          onClick={() => onSelect(topRecommendation.characterType)}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-violet-600" />
                <span className="font-medium">
                  {CHARACTER_TYPE_LABELS[topRecommendation.characterType]}
                </span>
                <Badge className={cn("text-xs", getScoreBg(topRecommendation.score), getScoreColor(topRecommendation.score))}>
                  {topRecommendation.score}%
                </Badge>
                {selectedCharacterType === topRecommendation.characterType && (
                  <CheckCircle2 className="h-4 w-4 text-violet-600" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {topRecommendation.reason}
              </p>
            </div>
            <Badge variant="outline" className="text-xs shrink-0">
              {CHARACTER_CATEGORIES[topRecommendation.category].label}
            </Badge>
          </div>
        </div>
      )}

      {/* Other Recommendations */}
      {recommendations.length > 1 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Các lựa chọn khác:</p>
          <div className="flex flex-wrap gap-2">
            {recommendations.slice(1, 4).map((rec) => (
              <Button
                key={rec.characterType}
                variant={selectedCharacterType === rec.characterType ? "secondary" : "outline"}
                size="sm"
                className={cn(
                  "h-auto py-1.5 px-3 text-xs",
                  selectedCharacterType === rec.characterType && "ring-2 ring-violet-500"
                )}
                onClick={() => onSelect(rec.characterType)}
              >
                <span>{CHARACTER_TYPE_LABELS[rec.characterType]}</span>
                <Badge 
                  variant="secondary" 
                  className={cn("ml-1.5 text-[10px] px-1.5", getScoreBg(rec.score), getScoreColor(rec.score))}
                >
                  {rec.score}%
                </Badge>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

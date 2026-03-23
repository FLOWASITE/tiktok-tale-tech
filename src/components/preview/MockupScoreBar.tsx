import { Star, Zap, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getGradeFromScore, GRADE_COLORS } from '@/types/creativeScore';

interface MockupScoreBarProps {
  critiqueScore?: number | null;
  geoScore?: number | null;
  engagementScore?: number | null;
  className?: string;
}

function getScoreColor(score: number): string {
  if (score >= 85) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
  if (score >= 50) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

function getCritiqueBg(score: number): string {
  if (score >= 8) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
  if (score >= 6) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
  if (score >= 4) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
  return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
}

export function MockupScoreBar({ critiqueScore, geoScore, engagementScore, className }: MockupScoreBarProps) {
  const hasAnyScore = critiqueScore != null || geoScore != null || engagementScore != null;
  
  if (!hasAnyScore) return null;

  const geoGrade = geoScore != null ? getGradeFromScore(geoScore) : null;

  return (
    <div className={cn(
      'flex items-center justify-center gap-3 py-2 px-3 bg-muted/50 rounded-b-xl border-t border-border/50',
      className
    )}>
      {critiqueScore != null && (
        <div className="flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 text-muted-foreground" />
          <Badge variant="outline" className={cn('text-[11px] px-1.5 py-0 h-5 font-semibold border-0', getCritiqueBg(critiqueScore))}>
            {critiqueScore.toFixed(1)}/10
          </Badge>
        </div>
      )}
      
      {geoScore != null && geoGrade && (
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-muted-foreground" />
          <Badge variant="outline" className={cn('text-[11px] px-1.5 py-0 h-5 font-semibold border-0', GRADE_COLORS[geoGrade])}>
            GEO {geoScore} {geoGrade}
          </Badge>
        </div>
      )}

      {engagementScore != null && (
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
          <span className={cn('text-[11px] font-semibold', getScoreColor(engagementScore))}>
            {engagementScore}%
          </span>
        </div>
      )}
    </div>
  );
}

import { Star, Zap, TrendingUp, Info, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getGradeFromScore, GRADE_COLORS } from '@/types/creativeScore';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

interface MockupScoreBarProps {
  critiqueScore?: number | null;
  geoScore?: number | null;
  engagementScore?: number | null;
  seoScore?: number | null;
  className?: string;
  onTriggerGEO?: () => void;
  isGEOLoading?: boolean;
}

function getScoreBg(score: number, max: number): string {
  const pct = (score / max) * 100;
  if (pct >= 80) return 'bg-emerald-500';
  if (pct >= 60) return 'bg-yellow-500';
  if (pct >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

function getScoreTextColor(score: number, max: number): string {
  const pct = (score / max) * 100;
  if (pct >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (pct >= 60) return 'text-yellow-600 dark:text-yellow-400';
  if (pct >= 40) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

const SCORE_TOOLTIPS = {
  quality: 'Điểm đánh giá chất lượng nội dung do AI chấm dựa trên: cấu trúc bài viết, độ rõ ràng thông điệp, tính sáng tạo, phù hợp kênh và thương hiệu',
  geo: 'Generative Engine Optimization — đánh giá khả năng xuất hiện trên AI search (ChatGPT, Gemini...) dựa trên 8 yếu tố: citations, statistics, quotes, fluency, authority, unique words, technical terms, content depth',
  engagement: 'Dự đoán mức độ tương tác dựa trên: độ dài phù hợp, có câu hỏi/CTA, emoji, hashtag, cấu trúc đoạn văn. Đây là ước tính, không phải số liệu thực tế',
  seo: 'Điểm tối ưu SEO cho trang web: meta title, meta description, heading structure, keyword density, internal links, schema markup. Áp dụng cho channel Website',
};

function ScoreColumn({ 
  icon: Icon, 
  label, 
  value, 
  suffix, 
  max, 
  colorClass,
  tooltip,
}: { 
  icon: typeof Star; 
  label: string; 
  value: number; 
  suffix: string; 
  max: number; 
  colorClass: string;
  tooltip: string;
}) {
  const pct = (value / max) * 100;
  return (
    <div className="flex flex-col items-center gap-1 px-3 py-1 group">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 text-muted-foreground cursor-help">
            <Icon className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
            <Info className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[260px] text-xs leading-relaxed">
          {tooltip}
        </TooltipContent>
      </Tooltip>
      <span className={cn('text-sm font-bold', colorClass)}>
        {value}{suffix}
      </span>
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', getScoreBg(value, max))}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

export function MockupScoreBar({ critiqueScore, geoScore, engagementScore, seoScore, className, onTriggerGEO, isGEOLoading }: MockupScoreBarProps) {
  const hasAnyScore = critiqueScore != null || geoScore != null || engagementScore != null || seoScore != null;
  // Show the bar if we have any score OR if we can trigger GEO
  const showBar = hasAnyScore || onTriggerGEO;
  
  if (!showBar) return null;

  const geoGrade = geoScore != null ? getGradeFromScore(geoScore) : null;
  const scoreCount = [critiqueScore, geoScore, engagementScore, seoScore].filter(s => s != null).length + (geoScore == null && onTriggerGEO ? 1 : 0);
  const gridCols = scoreCount <= 1 ? 'grid-cols-1' : scoreCount === 2 ? 'grid-cols-2' : scoreCount === 3 ? 'grid-cols-3' : 'grid-cols-4';

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn(
        'grid gap-0 py-2 px-2 bg-card/80 backdrop-blur-sm rounded-t-xl border border-border/60 shadow-sm',
        gridCols,
        className
      )}>
        {critiqueScore != null && (
          <ScoreColumn
            icon={Star}
            label="Chất lượng"
            value={critiqueScore}
            suffix="/10"
            max={10}
            colorClass={getScoreTextColor(critiqueScore, 10)}
            tooltip={SCORE_TOOLTIPS.quality}
          />
        )}
        
        {geoScore != null && geoGrade ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                'flex flex-col items-center gap-1 px-3 py-1 group cursor-help',
                critiqueScore != null && 'border-l border-border/40',
              )}>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Zap className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-medium uppercase tracking-wide">GEO</span>
                  <Info className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="flex items-center gap-1">
                  <span className={cn('text-sm font-bold', getScoreTextColor(geoScore, 100))}>
                    {geoScore}
                  </span>
                  <span className={cn('text-xs font-semibold px-1 py-0.5 rounded', GRADE_COLORS[geoGrade])}>
                    {geoGrade}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', getScoreBg(geoScore, 100))}
                    style={{ width: `${Math.min(geoScore, 100)}%` }}
                  />
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[260px] text-xs leading-relaxed">
              {SCORE_TOOLTIPS.geo}
            </TooltipContent>
          </Tooltip>
        ) : onTriggerGEO ? (
          <div className={cn(
            'flex flex-col items-center justify-center gap-1 px-3 py-1',
            critiqueScore != null && 'border-l border-border/40',
          )}>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Zap className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium uppercase tracking-wide">GEO</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] px-2 gap-1"
              onClick={onTriggerGEO}
              disabled={isGEOLoading}
            >
              {isGEOLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
              {isGEOLoading ? 'Đang chấm...' : 'Chấm GEO'}
            </Button>
          </div>
        ) : null}

        {seoScore != null && (
          <div className={cn(
            (critiqueScore != null || geoScore != null) && 'border-l border-border/40',
          )}>
            <ScoreColumn
              icon={Search}
              label="SEO"
              value={seoScore}
              suffix="/100"
              max={100}
              colorClass={getScoreTextColor(seoScore, 100)}
              tooltip={SCORE_TOOLTIPS.seo}
            />
          </div>
        )}

        {engagementScore != null && (
          <div className={cn(
            (critiqueScore != null || geoScore != null || seoScore != null) && 'border-l border-border/40',
          )}>
            <ScoreColumn
              icon={TrendingUp}
              label="Tương tác"
              value={engagementScore}
              suffix="%"
              max={100}
              colorClass={getScoreTextColor(engagementScore, 100)}
              tooltip={SCORE_TOOLTIPS.engagement}
            />
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

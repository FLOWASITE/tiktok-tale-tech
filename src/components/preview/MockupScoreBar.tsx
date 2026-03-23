import { Star, Zap, TrendingUp, Info, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getGradeFromScore, GRADE_COLORS } from '@/types/creativeScore';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
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
  geoFactorScores?: Record<string, number> | null;
  content?: string;
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

const GEO_FACTOR_LABELS: Record<string, { label: string; weight: string }> = {
  answer_first: { label: 'Trả lời trực tiếp', weight: '15%' },
  citation_signals: { label: 'Trích dẫn & số liệu', weight: '15%' },
  content_depth: { label: 'Độ sâu nội dung', weight: '15%' },
  entity_clarity: { label: 'Rõ ràng thực thể', weight: '13%' },
  structured_data: { label: 'Cấu trúc dữ liệu', weight: '12%' },
  extractability: { label: 'Dễ trích xuất', weight: '12%' },
  heading_hierarchy: { label: 'Cấu trúc heading', weight: '10%' },
  freshness: { label: 'Tính mới', weight: '8%' },
};

const QUALITY_CRITERIA = [
  { label: 'Cấu trúc bài viết', desc: 'Mở bài, thân bài, kết bài rõ ràng' },
  { label: 'Thông điệp', desc: 'Rõ ràng, nhất quán, đúng mục tiêu' },
  { label: 'Sáng tạo', desc: 'Góc nhìn mới, cách diễn đạt hấp dẫn' },
  { label: 'Phù hợp kênh', desc: 'Tone, format đúng chuẩn kênh' },
  { label: 'Phù hợp thương hiệu', desc: 'Nhất quán brand voice & guidelines' },
];

function getEngagementBreakdown(content: string): { label: string; score: number; max: number }[] {
  if (!content) return [];
  return [
    { label: 'Độ dài phù hợp', score: content.length > 50 ? 20 : 10, max: 20 },
    { label: 'Câu hỏi / Cảm thán', score: (content.match(/[?!]/g) || []).length > 0 ? 15 : 0, max: 15 },
    { label: 'Hashtag', score: Math.min(20, (content.match(/(#\w+)/g) || []).length * 5), max: 20 },
    { label: 'Emoji', score: Math.min(15, (content.match(/(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu) || []).length * 3), max: 15 },
    { label: 'Cấu trúc đoạn văn', score: content.split('\n').filter(l => l.trim()).length > 3 ? 15 : 5, max: 15 },
    { label: 'Call-to-Action', score: (content.match(/(click|nhấn|liên hệ|mua|đăng ký|theo dõi|inbox|dm|share|comment|xem thêm)/gi) || []).length > 0 ? 15 : 0, max: 15 },
  ];
}

function getSEOBreakdown(content: string): { label: string; score: number; max: number }[] {
  if (!content) return [];
  const hasH1 = /^#\s/m.test(content);
  const hasH2 = /^##\s/m.test(content);
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const hasLinks = /\[.*?\]\(.*?\)/.test(content);
  const hasList = /^[-*]\s/m.test(content) || /^\d+\.\s/m.test(content);
  const paragraphs = content.split('\n\n').filter(p => p.trim()).length;

  return [
    { label: 'Heading H1', score: hasH1 ? 20 : 0, max: 20 },
    { label: 'Heading H2+', score: hasH2 ? 15 : 0, max: 15 },
    { label: 'Độ dài (>300 từ)', score: wordCount >= 300 ? 20 : Math.round(wordCount / 15), max: 20 },
    { label: 'Links', score: hasLinks ? 15 : 0, max: 15 },
    { label: 'Danh sách', score: hasList ? 15 : 0, max: 15 },
    { label: 'Cấu trúc đoạn', score: paragraphs >= 3 ? 15 : Math.round(paragraphs * 5), max: 15 },
  ];
}

function FactorRow({ label, score, max, weight }: { label: string; score: number; max: number; weight?: string }) {
  const pct = (score / max) * 100;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="flex-1 text-muted-foreground truncate">{label}</span>
      {weight && <span className="text-[10px] text-muted-foreground/60 w-7 text-right">{weight}</span>}
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', getScoreBg(score, max))} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className={cn('w-8 text-right font-semibold text-[11px]', getScoreTextColor(score, max))}>
        {score}/{max}
      </span>
    </div>
  );
}

function ScoreColumn({ 
  icon: Icon, 
  label, 
  value, 
  suffix, 
  max, 
  colorClass,
  tooltip,
  popoverContent,
}: { 
  icon: typeof Star; 
  label: string; 
  value: number; 
  suffix: string; 
  max: number; 
  colorClass: string;
  tooltip: string;
  popoverContent?: React.ReactNode;
}) {
  const pct = (value / max) * 100;

  const scoreDisplay = (
    <div className="flex flex-col items-center gap-1 px-3 py-1 group cursor-pointer">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
        <Info className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
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

  if (popoverContent) {
    return (
      <Popover>
        <PopoverTrigger asChild>{scoreDisplay}</PopoverTrigger>
        <PopoverContent side="bottom" className="w-72 p-3 z-[300]">
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground mb-2">{tooltip}</p>
            {popoverContent}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{scoreDisplay}</TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[260px] text-xs leading-relaxed">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

export function MockupScoreBar({ critiqueScore, geoScore, engagementScore, seoScore, className, onTriggerGEO, isGEOLoading, geoFactorScores, content }: MockupScoreBarProps) {
  const hasAnyScore = critiqueScore != null || geoScore != null || engagementScore != null || seoScore != null;
  const showBar = hasAnyScore || onTriggerGEO;
  
  if (!showBar) return null;

  const geoGrade = geoScore != null ? getGradeFromScore(geoScore) : null;
  const scoreCount = [critiqueScore, geoScore, engagementScore, seoScore].filter(s => s != null).length + (geoScore == null && onTriggerGEO ? 1 : 0);
  const gridCols = scoreCount <= 1 ? 'grid-cols-1' : scoreCount === 2 ? 'grid-cols-2' : scoreCount === 3 ? 'grid-cols-3' : 'grid-cols-4';

  // Build popover content for each score
  const qualityPopover = (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold text-foreground">Tiêu chí đánh giá:</p>
      {QUALITY_CRITERIA.map(c => (
        <div key={c.label} className="flex items-start gap-2 text-xs">
          <span className="text-muted-foreground">•</span>
          <div>
            <span className="font-medium text-foreground">{c.label}</span>
            <span className="text-muted-foreground"> — {c.desc}</span>
          </div>
        </div>
      ))}
    </div>
  );

  const geoPopover = geoFactorScores ? (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold text-foreground">Điểm từng yếu tố:</p>
      {Object.entries(GEO_FACTOR_LABELS).map(([key, { label, weight }]) => {
        const score = geoFactorScores[key] ?? 0;
        return <FactorRow key={key} label={label} score={score} max={100} weight={weight} />;
      })}
    </div>
  ) : null;

  const engagementPopover = content ? (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold text-foreground">Phân tích chi tiết:</p>
      {getEngagementBreakdown(content).map(f => (
        <FactorRow key={f.label} label={f.label} score={f.score} max={f.max} />
      ))}
    </div>
  ) : null;

  const seoPopover = content ? (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold text-foreground">Phân tích SEO:</p>
      {getSEOBreakdown(content).map(f => (
        <FactorRow key={f.label} label={f.label} score={f.score} max={f.max} />
      ))}
    </div>
  ) : null;

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
            popoverContent={qualityPopover}
          />
        )}
        
        {geoScore != null && geoGrade ? (
          <Popover>
            <PopoverTrigger asChild>
              <div className={cn(
                'flex flex-col items-center gap-1 px-3 py-1 group cursor-pointer',
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
            </PopoverTrigger>
            <PopoverContent side="bottom" className="w-72 p-3 z-[300]">
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground mb-2">{SCORE_TOOLTIPS.geo}</p>
                {geoPopover || <p className="text-xs text-muted-foreground italic">Không có dữ liệu chi tiết</p>}
              </div>
            </PopoverContent>
          </Popover>
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
              popoverContent={seoPopover}
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
              popoverContent={engagementPopover}
            />
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

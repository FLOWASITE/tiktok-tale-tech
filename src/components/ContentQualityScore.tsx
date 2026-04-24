import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp,
  MessageSquare,
  Shield,
  Zap,
  LayoutList,
  Target,
  Hash,
  MousePointerClick,
  BookOpen,
  AlertCircle,
  XCircle
} from 'lucide-react';

// Score categories matching backend (8 categories)
interface CritiqueScores {
  brand_voice: number;          // 0-15
  compliance: number;           // 0-25
  hook_strength: number;        // 0-18
  content_structure: number;    // 0-12
  engagement_potential: number; // 0-10
  channel_fit: number;          // 0-15
  cta_quality: number;          // 0-8
  readability: number;          // 0-7
}

interface CritiqueIssue {
  category: string;
  severity: 'error' | 'warning' | 'info';
  description: string;
  location?: string;
  suggestion?: string;
}

interface CritiqueDetails {
  overall_score: number;
  passed: boolean;
  quality_tier: string;
  scores: CritiqueScores;
  issues: CritiqueIssue[];
  suggestions: string[];
  strengths: string[];
  needs_manual_review?: boolean;
}

interface ContentQualityScoreProps {
  score: number | null;
  critiqueDetails?: CritiqueDetails | null;
  wasRefined?: boolean;
  refinementCount?: number;
  variant?: 'badge' | 'compact' | 'detailed' | 'warning';
  className?: string;
  onRequestReview?: () => void;
}

// Quality tier config matching backend
const QUALITY_TIERS = {
  EXCELLENT: { min: 90, label: 'Xuất sắc', color: 'emerald', icon: Sparkles },
  GOOD: { min: 80, label: 'Tốt', color: 'green', icon: CheckCircle2 },
  ACCEPTABLE: { min: 70, label: 'Chấp nhận', color: 'yellow', icon: TrendingUp },
  NEEDS_WORK: { min: 60, label: 'Cần cải thiện', color: 'orange', icon: AlertTriangle },
  POOR: { min: 0, label: 'Yếu', color: 'red', icon: XCircle },
} as const;

// Category config (8 categories)
const CATEGORY_CONFIG = {
  brand_voice: { label: 'Brand Voice', max: 15, icon: MessageSquare, color: 'text-purple-500' },
  compliance: { label: 'Compliance', max: 25, icon: Shield, color: 'text-blue-500' },
  hook_strength: { label: 'Hook', max: 18, icon: Zap, color: 'text-yellow-500' },
  content_structure: { label: 'Structure', max: 12, icon: LayoutList, color: 'text-cyan-500' },
  engagement_potential: { label: 'Engagement', max: 10, icon: Target, color: 'text-pink-500' },
  channel_fit: { label: 'Channel Fit', max: 15, icon: Hash, color: 'text-green-500' },
  cta_quality: { label: 'CTA', max: 8, icon: MousePointerClick, color: 'text-orange-500' },
  readability: { label: 'Readability', max: 7, icon: BookOpen, color: 'text-indigo-500' },
} as const;

function getQualityTier(score: number) {
  if (score >= 90) return QUALITY_TIERS.EXCELLENT;
  if (score >= 80) return QUALITY_TIERS.GOOD;
  if (score >= 70) return QUALITY_TIERS.ACCEPTABLE;
  if (score >= 60) return QUALITY_TIERS.NEEDS_WORK;
  return QUALITY_TIERS.POOR;
}

function getScoreColor(score: number) {
  if (score >= 90) return 'text-emerald-500';
  if (score >= 80) return 'text-green-500';
  if (score >= 70) return 'text-yellow-500';
  if (score >= 60) return 'text-orange-500';
  return 'text-red-500';
}

function getProgressColor(score: number) {
  if (score >= 90) return 'bg-emerald-500';
  if (score >= 80) return 'bg-green-500';
  if (score >= 70) return 'bg-yellow-500';
  if (score >= 60) return 'bg-orange-500';
  return 'bg-red-500';
}

// Warning banner component for low scores
function QualityWarningBanner({ 
  score, 
  critiqueDetails,
  onRequestReview 
}: { 
  score: number;
  critiqueDetails?: CritiqueDetails | null;
  onRequestReview?: () => void;
}) {
  const needsManualReview = critiqueDetails?.needs_manual_review;
  const passed = critiqueDetails?.passed ?? (score >= 80);
  // Only treat issues as real "errors" when content failed OR explicit manual review.
  // Otherwise they're improvement suggestions, not blocking errors.
  const errorIssues = critiqueDetails?.issues?.filter(i => i.severity === 'error') || [];
  const errorCount = (!passed || needsManualReview) ? errorIssues.length : 0;

  // Score < 60: Critical warning
  if (score < 60 || needsManualReview) {
    return (
      <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
        <XCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <span className="font-medium">Nội dung cần chỉnh sửa đáng kể</span>
            <span className="text-muted-foreground ml-2">
              (Score: {score}/100{errorCount > 0 ? `, ${errorCount} lỗi nghiêm trọng` : ''})
            </span>
          </div>
          {onRequestReview && (
            <button 
              onClick={onRequestReview}
              className="text-xs underline hover:no-underline"
            >
              Xem chi tiết
            </button>
          )}
        </AlertDescription>
      </Alert>
    );
  }
  
  // Score 60-70: Warning
  if (score < 70) {
    return (
      <Alert className="border-orange-500/50 bg-orange-500/10">
        <AlertTriangle className="h-4 w-4 text-orange-500" />
        <AlertDescription className="flex items-center justify-between text-orange-700 dark:text-orange-400">
          <div>
            <span className="font-medium">Nội dung cần review trước khi đăng</span>
            <span className="text-muted-foreground ml-2">(Score: {score}/100)</span>
          </div>
          {onRequestReview && (
            <button 
              onClick={onRequestReview}
              className="text-xs underline hover:no-underline"
            >
              Xem chi tiết
            </button>
          )}
        </AlertDescription>
      </Alert>
    );
  }
  
  // Score 70-80: Info
  if (score < 80) {
    return (
      <Alert className="border-yellow-500/50 bg-yellow-500/10">
        <AlertCircle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-700 dark:text-yellow-400">
          <span className="font-medium">Có thể cải thiện thêm</span>
          <span className="text-muted-foreground ml-2">(Score: {score}/100)</span>
        </AlertDescription>
      </Alert>
    );
  }
  
  return null;
}

export function ContentQualityScore({
  score,
  critiqueDetails,
  wasRefined,
  refinementCount = 0,
  variant = 'badge',
  className,
  onRequestReview,
}: ContentQualityScoreProps) {
  if (score === null || score === undefined) {
    return null;
  }

  const tier = getQualityTier(score);
  const TierIcon = tier.icon;

  // Warning variant - shows banner for low scores
  if (variant === 'warning') {
    return (
      <QualityWarningBanner 
        score={score} 
        critiqueDetails={critiqueDetails}
        onRequestReview={onRequestReview}
      />
    );
  }

  // Badge variant - simple score display
  if (variant === 'badge') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn(
                "gap-1 cursor-default",
                getScoreColor(score),
                score < 60 && "border-red-500/50 bg-red-500/10",
                className
              )}
            >
              <TierIcon className="w-3 h-3" />
              <span className="font-semibold">{score}</span>
              {wasRefined && (
                <span className="text-xs opacity-70">✨</span>
              )}
              {critiqueDetails?.needs_manual_review && (
                <AlertCircle className="w-3 h-3 text-red-500" />
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{tier.label}</span>
                <span className="text-muted-foreground">({score}/100)</span>
              </div>
              {critiqueDetails?.needs_manual_review && (
                <p className="text-xs text-red-500 font-medium">
                  ⚠️ Cần review thủ công
                </p>
              )}
              {wasRefined && (
                <p className="text-xs text-muted-foreground">
                  Đã được AI tối ưu {refinementCount > 0 ? `${refinementCount}x` : ''}
                </p>
              )}
              {critiqueDetails?.issues && critiqueDetails.issues.length > 0 && (() => {
                const passed = critiqueDetails.passed ?? (score >= 80);
                const realErrors = (!passed || critiqueDetails.needs_manual_review)
                  ? critiqueDetails.issues.filter(i => i.severity === 'error').length
                  : 0;
                const downgradedErrors = (!passed || critiqueDetails.needs_manual_review)
                  ? 0
                  : critiqueDetails.issues.filter(i => i.severity === 'error').length;
                const warnings = critiqueDetails.issues.filter(i => i.severity === 'warning').length + downgradedErrors;
                return (
                  <p className={cn(
                    "text-xs",
                    realErrors > 0 ? 'text-red-500' : 'text-yellow-500'
                  )}>
                    {realErrors > 0 ? `❌ ${realErrors} lỗi` : ''}
                    {warnings > 0 ? `${realErrors > 0 ? ' ' : ''}💡 ${warnings} gợi ý` : ''}
                  </p>
                );
              })()}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Compact variant - score with mini breakdown
  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "flex items-center gap-2 px-2 py-1 rounded-md cursor-default",
              score >= 80 ? "bg-muted/50" : score >= 60 ? "bg-yellow-500/10" : "bg-red-500/10",
              className
            )}>
              <TierIcon className={cn("w-4 h-4", getScoreColor(score))} />
              <span className={cn("font-bold text-sm", getScoreColor(score))}>
                {score}
              </span>
              <span className="text-xs text-muted-foreground">/100</span>
              {wasRefined && (
                <Sparkles className="w-3 h-3 text-primary" />
              )}
              {critiqueDetails?.needs_manual_review && (
                <AlertCircle className="w-3 h-3 text-red-500" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="w-72 p-3">
            <CompactBreakdown 
              score={score}
              tier={tier}
              critiqueDetails={critiqueDetails}
              wasRefined={wasRefined}
            />
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Detailed variant - full breakdown panel
  return (
    <div className={cn("space-y-4 p-4 rounded-lg bg-card border", className)}>
      {/* Warning banner for low scores */}
      {score < 80 && (
        <QualityWarningBanner 
          score={score} 
          critiqueDetails={critiqueDetails}
          onRequestReview={onRequestReview}
        />
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center",
            score >= 80 ? "bg-green-500/10" : score >= 60 ? "bg-yellow-500/10" : "bg-red-500/10"
          )}>
            <TierIcon className={cn("w-6 h-6", getScoreColor(score))} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={cn("text-2xl font-bold", getScoreColor(score))}>
                {score}
              </span>
              <span className="text-muted-foreground">/100</span>
              {critiqueDetails?.needs_manual_review && (
                <Badge variant="destructive" className="text-xs">Review</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{tier.label}</p>
          </div>
        </div>
        {wasRefined && (
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="w-3 h-3" />
            AI Optimized {refinementCount > 1 ? `(${refinementCount}x)` : ''}
          </Badge>
        )}
      </div>

      {/* Category breakdown with weakness highlighting */}
      {critiqueDetails?.scores && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Chi tiết điểm (8 categories)
          </p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(critiqueDetails.scores).map(([key, value]) => {
              const config = CATEGORY_CONFIG[key as keyof typeof CATEGORY_CONFIG];
              if (!config) return null;
              const Icon = config.icon;
              const percentage = (value / config.max) * 100;
              const isWeak = percentage < 50;
              const isModerate = percentage >= 50 && percentage < 70;
              
              return (
                <div 
                  key={key} 
                  className={cn(
                    "flex items-center gap-2 text-xs p-1.5 rounded-md",
                    isWeak && "bg-red-500/10 border border-red-500/20",
                    isModerate && "bg-yellow-500/5 border border-yellow-500/20"
                  )}
                >
                  <Icon className={cn(
                    "w-3.5 h-3.5 shrink-0", 
                    isWeak ? "text-red-500" : isModerate ? "text-yellow-500" : config.color
                  )} />
                  <span className={cn(
                    "truncate",
                    isWeak ? "text-red-600 font-medium" : "text-muted-foreground"
                  )}>
                    {config.label}
                  </span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all",
                        isWeak ? "bg-red-500" : isModerate ? "bg-yellow-500" : getProgressColor(percentage)
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className={cn(
                    "font-medium w-10 text-right",
                    isWeak ? "text-red-500" : isModerate ? "text-yellow-500" : ""
                  )}>
                    {value}/{config.max}
                  </span>
                </div>
              );
            })}
          </div>
          
          {/* Weakness summary */}
          {(() => {
            const weakCategories = Object.entries(critiqueDetails.scores)
              .filter(([key, value]) => {
                const config = CATEGORY_CONFIG[key as keyof typeof CATEGORY_CONFIG];
                return config && (value / config.max) * 100 < 50;
              })
              .map(([key]) => CATEGORY_CONFIG[key as keyof typeof CATEGORY_CONFIG]?.label)
              .filter(Boolean);
            
            if (weakCategories.length > 0) {
              return (
                <div className="bg-red-500/10 border border-red-500/20 rounded-md p-2 text-xs">
                  <p className="text-red-600 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Cần cải thiện: {weakCategories.join(', ')}
                  </p>
                </div>
              );
            }
            return null;
          })()}
        </div>
      )}

      {/* Strengths */}
      {critiqueDetails?.strengths && critiqueDetails.strengths.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-green-500 uppercase tracking-wider">
            Điểm mạnh
          </p>
          <ul className="text-xs text-muted-foreground space-y-0.5">
            {critiqueDetails.strengths.slice(0, 3).map((s, i) => (
              <li key={i} className="flex items-start gap-1">
                <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Issues */}
      {critiqueDetails?.issues && critiqueDetails.issues.length > 0 && (() => {
        const passed = critiqueDetails.passed ?? false;
        const showAsErrors = !passed || critiqueDetails.needs_manual_review;
        return (
          <div className="space-y-1">
            <p className="text-xs font-medium text-yellow-500 uppercase tracking-wider">
              {showAsErrors ? `Cần lưu ý (${critiqueDetails.issues.length})` : `Gợi ý cải thiện (${critiqueDetails.issues.length})`}
            </p>
            <ul className="text-xs text-muted-foreground space-y-1">
              {critiqueDetails.issues.slice(0, 5).map((issue, i) => {
                const renderAsError = showAsErrors && issue.severity === 'error';
                return (
                  <li key={i} className="flex items-start gap-1">
                    {renderAsError ? (
                      <XCircle className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />
                    ) : (
                      <AlertTriangle className={cn(
                        "w-3 h-3 mt-0.5 shrink-0",
                        issue.severity === 'warning' || (showAsErrors === false && issue.severity === 'error') ? 'text-yellow-500' : 'text-blue-500'
                      )} />
                    )}
                    <div>
                      <span className={renderAsError ? 'text-red-600' : ''}>
                        {issue.description}
                      </span>
                      {issue.suggestion && (
                        <p className="text-muted-foreground/70 mt-0.5">→ {issue.suggestion}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })()}
    </div>
  );
}

// Compact breakdown for tooltip
function CompactBreakdown({ 
  score, 
  tier, 
  critiqueDetails,
  wasRefined,
}: { 
  score: number; 
  tier: typeof QUALITY_TIERS[keyof typeof QUALITY_TIERS];
  critiqueDetails?: CritiqueDetails | null;
  wasRefined?: boolean;
}) {
  const errorCount = critiqueDetails?.issues?.filter(i => i.severity === 'error').length || 0;
  const warningCount = critiqueDetails?.issues?.filter(i => i.severity === 'warning').length || 0;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium">{tier.label}</span>
        <span className={cn("font-bold", getScoreColor(score))}>{score}/100</span>
      </div>
      
      {critiqueDetails?.needs_manual_review && (
        <p className="text-xs text-red-500 font-medium flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Cần review thủ công
        </p>
      )}
      
      {wasRefined && (
        <p className="text-xs text-primary flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          Đã được AI tối ưu
        </p>
      )}
      
      {critiqueDetails?.scores && (
        <div className="space-y-1 pt-1 border-t">
          {Object.entries(critiqueDetails.scores).map(([key, value]) => {
            const config = CATEGORY_CONFIG[key as keyof typeof CATEGORY_CONFIG];
            if (!config) return null;
            const percentage = Math.round((value / config.max) * 100);
            
            return (
              <div key={key} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{config.label}</span>
                <span className={cn(
                  "font-medium",
                  percentage < 50 ? "text-red-500" : percentage < 70 ? "text-yellow-500" : getScoreColor(percentage)
                )}>
                  {value}/{config.max}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {(errorCount > 0 || warningCount > 0) && (
        <p className="text-xs pt-1 border-t">
          {errorCount > 0 && <span className="text-red-500">❌ {errorCount} lỗi</span>}
          {errorCount > 0 && warningCount > 0 && ' · '}
          {warningCount > 0 && <span className="text-yellow-500">⚠️ {warningCount} cảnh báo</span>}
        </p>
      )}
    </div>
  );
}

import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  Hash
} from 'lucide-react';

// Score categories matching backend
interface CritiqueScores {
  brand_voice: number;          // 0-20
  compliance: number;           // 0-25
  hook_strength: number;        // 0-15
  content_structure: number;    // 0-15
  engagement_potential: number; // 0-15
  channel_fit: number;          // 0-10
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
}

interface ContentQualityScoreProps {
  score: number | null;
  critiqueDetails?: CritiqueDetails | null;
  wasRefined?: boolean;
  refinementCount?: number;
  variant?: 'badge' | 'compact' | 'detailed';
  className?: string;
}

// Quality tier config matching backend
const QUALITY_TIERS = {
  EXCELLENT: { min: 90, label: 'Xuất sắc', color: 'emerald', icon: Sparkles },
  GOOD: { min: 80, label: 'Tốt', color: 'green', icon: CheckCircle2 },
  ACCEPTABLE: { min: 70, label: 'Chấp nhận', color: 'yellow', icon: TrendingUp },
  NEEDS_WORK: { min: 60, label: 'Cần cải thiện', color: 'orange', icon: AlertTriangle },
  POOR: { min: 0, label: 'Yếu', color: 'red', icon: AlertTriangle },
} as const;

// Category config
const CATEGORY_CONFIG = {
  brand_voice: { label: 'Brand Voice', max: 20, icon: MessageSquare, color: 'text-purple-500' },
  compliance: { label: 'Compliance', max: 25, icon: Shield, color: 'text-blue-500' },
  hook_strength: { label: 'Hook', max: 15, icon: Zap, color: 'text-yellow-500' },
  content_structure: { label: 'Structure', max: 15, icon: LayoutList, color: 'text-cyan-500' },
  engagement_potential: { label: 'Engagement', max: 15, icon: Target, color: 'text-pink-500' },
  channel_fit: { label: 'Channel Fit', max: 10, icon: Hash, color: 'text-green-500' },
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

export function ContentQualityScore({
  score,
  critiqueDetails,
  wasRefined,
  refinementCount = 0,
  variant = 'badge',
  className,
}: ContentQualityScoreProps) {
  if (score === null || score === undefined) {
    return null;
  }

  const tier = getQualityTier(score);
  const TierIcon = tier.icon;

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
                className
              )}
            >
              <TierIcon className="w-3 h-3" />
              <span className="font-semibold">{score}</span>
              {wasRefined && (
                <span className="text-xs opacity-70">✨</span>
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{tier.label}</span>
                <span className="text-muted-foreground">({score}/100)</span>
              </div>
              {wasRefined && (
                <p className="text-xs text-muted-foreground">
                  Đã được AI tối ưu {refinementCount > 0 ? `${refinementCount}x` : ''}
                </p>
              )}
              {critiqueDetails?.issues?.length > 0 && (
                <p className="text-xs text-yellow-500">
                  {critiqueDetails.issues.length} vấn đề cần lưu ý
                </p>
              )}
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
              "flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50 cursor-default",
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
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="w-64 p-3">
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
            </div>
            <p className="text-sm text-muted-foreground">{tier.label}</p>
          </div>
        </div>
        {wasRefined && (
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="w-3 h-3" />
            AI Optimized
          </Badge>
        )}
      </div>

      {/* Category breakdown */}
      {critiqueDetails?.scores && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Chi tiết điểm
          </p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(critiqueDetails.scores).map(([key, value]) => {
              const config = CATEGORY_CONFIG[key as keyof typeof CATEGORY_CONFIG];
              if (!config) return null;
              const Icon = config.icon;
              const percentage = (value / config.max) * 100;
              
              return (
                <div key={key} className="flex items-center gap-2 text-xs">
                  <Icon className={cn("w-3.5 h-3.5 shrink-0", config.color)} />
                  <span className="text-muted-foreground truncate">{config.label}</span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full", getProgressColor(percentage))}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="font-medium w-8 text-right">{value}/{config.max}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Strengths */}
      {critiqueDetails?.strengths?.length > 0 && (
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
      {critiqueDetails?.issues?.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-yellow-500 uppercase tracking-wider">
            Cần lưu ý ({critiqueDetails.issues.length})
          </p>
          <ul className="text-xs text-muted-foreground space-y-0.5">
            {critiqueDetails.issues.slice(0, 3).map((issue, i) => (
              <li key={i} className="flex items-start gap-1">
                <AlertTriangle className={cn(
                  "w-3 h-3 mt-0.5 shrink-0",
                  issue.severity === 'error' ? 'text-red-500' : 'text-yellow-500'
                )} />
                <span>{issue.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
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
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium">{tier.label}</span>
        <span className={cn("font-bold", getScoreColor(score))}>{score}/100</span>
      </div>
      
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
                <span className={cn("font-medium", getScoreColor(percentage))}>
                  {value}/{config.max}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {critiqueDetails?.issues?.length > 0 && (
        <p className="text-xs text-yellow-500 pt-1 border-t">
          ⚠️ {critiqueDetails.issues.length} vấn đề cần lưu ý
        </p>
      )}
    </div>
  );
}

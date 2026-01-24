import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Sprout, Leaf, Sun, Sparkles, AlertTriangle } from 'lucide-react';
import { ContentRole, CONTENT_ROLES, GOAL_TO_ROLE_MAP } from '@/types/coreContent';
import { ContentGoal, ContentAngle, CONTENT_ANGLES, CONTENT_GOALS, ANGLE_TO_ROLE_MAP } from '@/types/multichannel';

interface RoleSelectorCardProps {
  value?: ContentRole;
  onValueChange: (role: ContentRole) => void;
  suggestedRole?: ContentRole;
  contentGoal?: ContentGoal;
  contentAngle?: ContentAngle;
  disabled?: boolean;
  className?: string;
}

const ROLE_ICONS: Record<ContentRole, React.ReactNode> = {
  seed: <Sprout className="w-5 h-5" />,
  sprout: <Leaf className="w-5 h-5" />,
  harvest: <Sun className="w-5 h-5" />,
};

const ROLE_COLORS: Record<ContentRole, { bg: string; border: string; text: string; selected: string }> = {
  seed: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-600 dark:text-emerald-400',
    selected: 'ring-2 ring-emerald-500 border-emerald-500',
  },
  sprout: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-600 dark:text-blue-400',
    selected: 'ring-2 ring-blue-500 border-blue-500',
  },
  harvest: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-600 dark:text-amber-400',
    selected: 'ring-2 ring-amber-500 border-amber-500',
  },
};

// Mismatch warnings for specific Goal + Role combinations
const ROLE_MISMATCH_WARNINGS: Record<string, string> = {
  // High-intent goals with low-intent roles
  'conversion_seed': 'Goal "Chuyển đổi" thường cần CTA mạnh, nhưng Seed tập trung awareness. Cân nhắc chọn Harvest.',
  'conversion_sprout': 'Goal "Chuyển đổi" cần push mạnh hơn. Sprout phù hợp cho trust-building, nhưng có thể thiếu CTA.',
  // Low-intent goals with high-intent roles  
  'awareness_harvest': 'Goal "Nhận diện" nên soft-sell, nhưng Harvest có CTA mạnh có thể gây khó chịu.',
  'education_harvest': 'Goal "Giáo dục" nên chia sẻ giá trị, Harvest có thể làm nội dung quá bán hàng.',
  // Mismatched engagement
  'engagement_harvest': 'Goal "Tương tác" cần nội dung thảo luận, Harvest quá tập trung chuyển đổi.',
};

// Angle-based mismatch warnings
const ANGLE_MISMATCH_WARNINGS: Record<string, string> = {
  'promotional_seed': 'Góc "Quảng cáo" cần CTA rõ, nhưng Seed không có selling intent.',
  'promotional_sprout': 'Góc "Quảng cáo" nên có call-to-action mạnh hơn Sprout.',
  'educational_harvest': 'Góc "Kiến thức" nên chia sẻ giá trị, Harvest có thể quá pushy.',
  'storytelling_harvest': 'Góc "Kể chuyện" cần emotional flow, Harvest có thể làm gián đoạn narrative.',
};

export function RoleSelectorCard({
  value,
  onValueChange,
  suggestedRole,
  contentGoal,
  contentAngle,
  disabled,
  className,
}: RoleSelectorCardProps) {
  // Priority: suggestedRole (explicit) > Angle-based > Goal-based
  const effectiveSuggestedRole = 
    suggestedRole || 
    (contentAngle ? ANGLE_TO_ROLE_MAP[contentAngle] : undefined) ||
    (contentGoal ? GOAL_TO_ROLE_MAP[contentGoal] : undefined);

  // Determine suggestion source for hint display
  const getSuggestionSource = (): { source: 'angle' | 'goal'; label: string } | null => {
    if (suggestedRole) return null; // Explicit override, no hint
    if (contentAngle && ANGLE_TO_ROLE_MAP[contentAngle]) {
      const angleLabel = CONTENT_ANGLES.find(a => a.value === contentAngle)?.label;
      return { source: 'angle', label: angleLabel || contentAngle };
    }
    if (contentGoal && GOAL_TO_ROLE_MAP[contentGoal]) {
      const goalLabel = CONTENT_GOALS.find(g => g.value === contentGoal)?.label;
      return { source: 'goal', label: goalLabel || contentGoal };
    }
    return null;
  };

  // Check for mismatch warning when user selects a role different from suggested
  const getMismatchWarning = (): string | null => {
    if (!value || value === effectiveSuggestedRole) return null;
    
    // Check angle-based mismatch first (higher priority)
    if (contentAngle) {
      const angleKey = `${contentAngle}_${value}`;
      if (ANGLE_MISMATCH_WARNINGS[angleKey]) {
        return ANGLE_MISMATCH_WARNINGS[angleKey];
      }
    }
    
    // Check goal-based mismatch
    if (contentGoal) {
      const goalKey = `${contentGoal}_${value}`;
      if (ROLE_MISMATCH_WARNINGS[goalKey]) {
        return ROLE_MISMATCH_WARNINGS[goalKey];
      }
    }
    
    return null;
  };

  const suggestionSource = getSuggestionSource();
  const mismatchWarning = getMismatchWarning();

  return (
    <div className={cn("space-y-2", className)}>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {CONTENT_ROLES.map((role) => {
        const isSelected = value === role.value;
        const isSuggested = effectiveSuggestedRole === role.value && !value;
        const colors = ROLE_COLORS[role.value];

        return (
          <Card
            key={role.value}
            onClick={() => !disabled && onValueChange(role.value)}
            className={cn(
              "relative p-4 cursor-pointer transition-all duration-200",
              "hover:shadow-md hover:scale-[1.02]",
              colors.bg,
              colors.border,
              isSelected && colors.selected,
              disabled && "opacity-50 cursor-not-allowed",
              !isSelected && !disabled && "hover:border-foreground/20"
            )}
          >
            {/* Suggested badge */}
            {isSuggested && (
              <Badge 
                variant="outline" 
                className="absolute -top-2 -right-2 text-[10px] bg-background border-primary text-primary"
              >
                Gợi ý
              </Badge>
            )}

            {/* Icon and Label */}
            <div className="flex items-center gap-2 mb-2">
              <div className={cn("p-1.5 rounded-md", colors.bg, colors.text)}>
                {ROLE_ICONS[role.value]}
              </div>
              <span className={cn("font-semibold", colors.text)}>
                {role.label}
              </span>
            </div>

            {/* Description */}
            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
              {role.description}
            </p>

            {/* Intent */}
            <div className="text-xs font-medium text-foreground/80 mb-2">
              → {role.intent}
            </div>

            {/* KPIs */}
            <div className="flex flex-wrap gap-1">
              {role.kpis.slice(0, 3).map((kpi) => (
                <Badge 
                  key={kpi} 
                  variant="secondary" 
                  className="text-[10px] px-1.5 py-0"
                >
                  {kpi}
                </Badge>
              ))}
            </div>

            {/* Selection indicator */}
            {isSelected && (
              <div className={cn(
                "absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center",
                colors.text.replace('text-', 'bg-').replace('/600', '-500').replace('/400', '-500')
              )}>
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </Card>
        );
      })}
    </div>
    
    {/* Suggestion source hint */}
    {suggestionSource && !value && (
      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
        <Sparkles className="w-3 h-3 text-primary" />
        {suggestionSource.source === 'angle' 
          ? `Gợi ý từ góc tiếp cận "${suggestionSource.label}"`
          : `Gợi ý từ mục tiêu "${suggestionSource.label}"`
        }
      </p>
    )}

    {/* Mismatch warning */}
    {mismatchWarning && (
      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
            Lựa chọn có thể không phù hợp
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {mismatchWarning}
          </p>
        </div>
      </div>
    )}
    </div>
  );
}

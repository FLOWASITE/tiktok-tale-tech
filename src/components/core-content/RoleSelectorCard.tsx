import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Sprout, Leaf, Sun, Sparkles, AlertTriangle, Check } from 'lucide-react';
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
  seed: <Sprout className="w-4 h-4" />,
  sprout: <Leaf className="w-4 h-4" />,
  harvest: <Sun className="w-4 h-4" />,
};

// Mismatch warnings for specific Goal + Role combinations
const ROLE_MISMATCH_WARNINGS: Record<string, string> = {
  'conversion_seed': 'Goal "Chuyển đổi" thường cần CTA mạnh, nhưng Seed tập trung awareness. Cân nhắc chọn Harvest.',
  'conversion_sprout': 'Goal "Chuyển đổi" cần push mạnh hơn. Sprout phù hợp cho trust-building, nhưng có thể thiếu CTA.',
  'awareness_harvest': 'Goal "Nhận diện" nên soft-sell, nhưng Harvest có CTA mạnh có thể gây khó chịu.',
  'education_harvest': 'Goal "Giáo dục" nên chia sẻ giá trị, Harvest có thể làm nội dung quá bán hàng.',
  'engagement_harvest': 'Goal "Tương tác" cần nội dung thảo luận, Harvest quá tập trung chuyển đổi.',
};

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
  const effectiveSuggestedRole = 
    suggestedRole || 
    (contentAngle ? ANGLE_TO_ROLE_MAP[contentAngle] : undefined) ||
    (contentGoal ? GOAL_TO_ROLE_MAP[contentGoal] : undefined);

  const getSuggestionSource = (): { source: 'angle' | 'goal'; label: string } | null => {
    if (suggestedRole) return null;
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

  const getMismatchWarning = (): string | null => {
    if (!value || value === effectiveSuggestedRole) return null;
    if (contentAngle) {
      const angleKey = `${contentAngle}_${value}`;
      if (ANGLE_MISMATCH_WARNINGS[angleKey]) return ANGLE_MISMATCH_WARNINGS[angleKey];
    }
    if (contentGoal) {
      const goalKey = `${contentGoal}_${value}`;
      if (ROLE_MISMATCH_WARNINGS[goalKey]) return ROLE_MISMATCH_WARNINGS[goalKey];
    }
    return null;
  };

  const suggestionSource = getSuggestionSource();
  const mismatchWarning = getMismatchWarning();

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {CONTENT_ROLES.map((role) => {
          const isSelected = value === role.value;
          const isSuggested = effectiveSuggestedRole === role.value && !value;

          return (
            <button
              key={role.value}
              type="button"
              onClick={() => !disabled && onValueChange(role.value)}
              disabled={disabled}
              className={cn(
                "relative text-left rounded-xl border p-4 transition-all duration-200",
                "bg-card hover:bg-muted/40",
                isSelected
                  ? "border-primary/40 ring-1 ring-primary/20 shadow-sm"
                  : "border-border/40 hover:border-border",
                isSuggested && !isSelected && "border-primary/20 border-dashed",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {/* Selection check */}
              {isSelected && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              )}

              {/* Suggested badge */}
              {isSuggested && !isSelected && (
                <Badge 
                  variant="outline" 
                  className="absolute -top-2 right-3 text-[10px] bg-background border-primary/30 text-primary"
                >
                  Gợi ý
                </Badge>
              )}

              {/* Icon + Label */}
              <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                  "p-1.5 rounded-lg",
                  isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  {ROLE_ICONS[role.value]}
                </div>
                <span className={cn(
                  "font-semibold text-sm",
                  isSelected ? "text-primary" : "text-foreground"
                )}>
                  {role.label}
                </span>
              </div>

              {/* Description */}
              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                {role.description}
              </p>

              {/* Intent */}
              <p className="text-xs text-foreground/70 mb-2.5">
                → {role.intent}
              </p>

              {/* KPIs */}
              <div className="flex flex-wrap gap-1">
                {role.kpis.slice(0, 3).map((kpi) => (
                  <span 
                    key={kpi} 
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-medium",
                      isSelected
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {kpi}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    
      {/* Suggestion source hint */}
      {suggestionSource && !value && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-primary/60" />
          {suggestionSource.source === 'angle' 
            ? `Gợi ý từ góc tiếp cận "${suggestionSource.label}"`
            : `Gợi ý từ mục tiêu "${suggestionSource.label}"`
          }
        </p>
      )}

      {/* Mismatch warning */}
      {mismatchWarning && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/50 border border-border/50">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-medium text-foreground/80">
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
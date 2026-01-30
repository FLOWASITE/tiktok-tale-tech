import { cn } from "@/lib/utils";
import { User, TrendingUp, Lightbulb } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import {
  PersonaFitResult,
  getGradeInfo,
  getDimensionProgress,
  PERSONA_FIT_WEIGHTS,
  DIMENSION_LABELS,
} from "@/types/persona-fit";

interface PersonaFitBadgeProps {
  result: PersonaFitResult | null | undefined;
  variant?: "compact" | "detailed";
  showPopover?: boolean;
  className?: string;
}

export function PersonaFitBadge({
  result,
  variant = "compact",
  showPopover = true,
  className,
}: PersonaFitBadgeProps) {
  if (!result) return null;

  const gradeInfo = getGradeInfo(result.grade);

  const content = (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
        gradeInfo.bgColor,
        gradeInfo.color,
        className
      )}
    >
      <User className="w-3 h-3" />
      {variant === "compact" ? (
        <span>{result.grade}</span>
      ) : (
        <span>
          Fit {result.overallScore}% • {result.grade}
        </span>
      )}
    </div>
  );

  if (!showPopover) return content;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="cursor-pointer hover:opacity-80 transition-opacity">
          {content}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-sm">Persona Fit Score</span>
            </div>
            <div
              className={cn(
                "text-lg font-bold",
                gradeInfo.color
              )}
            >
              {result.overallScore}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Progress value={result.overallScore} className="flex-1 h-2" />
            <span
              className={cn(
                "text-xs font-medium px-2 py-0.5 rounded",
                gradeInfo.bgColor,
                gradeInfo.color
              )}
            >
              {result.grade} - {gradeInfo.label}
            </span>
          </div>
          {result.personaName && (
            <p className="text-xs text-muted-foreground mt-2">
              Đối tượng: {result.personaName}
            </p>
          )}
        </div>

        {/* Breakdown */}
        <div className="p-4 space-y-3">
          <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Chi tiết điểm
          </h4>
          {Object.entries(result.breakdown).map(([key, score]) => {
            const dimension = key as keyof typeof PERSONA_FIT_WEIGHTS;
            const maxScore =
              PERSONA_FIT_WEIGHTS[
                dimension.replace("Score", "") as keyof typeof PERSONA_FIT_WEIGHTS
              ] || 20;
            const progress = getDimensionProgress(score, maxScore);

            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {DIMENSION_LABELS[dimension as keyof typeof DIMENSION_LABELS] || key}
                  </span>
                  <span className="font-medium">
                    {score}/{maxScore}
                  </span>
                </div>
                <Progress
                  value={progress}
                  className="h-1.5"
                />
              </div>
            );
          })}
        </div>

        {/* Suggestions */}
        {result.suggestions.length > 0 && (
          <div className="p-4 border-t border-border/50 bg-muted/30">
            <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2">
              <Lightbulb className="w-3 h-3" />
              Gợi ý cải thiện
            </h4>
            <ul className="space-y-1">
              {result.suggestions.map((suggestion, i) => (
                <li key={i} className="text-xs text-foreground/80 flex items-start gap-1.5">
                  <span className="text-primary mt-0.5">•</span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Compact inline version for lists
export function PersonaFitInline({
  score,
  grade,
  className,
}: {
  score: number;
  grade: string;
  className?: string;
}) {
  const gradeInfo = getGradeInfo(grade);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs",
              gradeInfo.color,
              className
            )}
          >
            <User className="w-3 h-3" />
            {score}%
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            Persona Fit: {score}% ({gradeInfo.label})
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

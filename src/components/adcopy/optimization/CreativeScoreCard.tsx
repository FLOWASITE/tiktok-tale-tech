import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  CreativeScore, 
  CreativeGrade, 
  GRADE_COLORS, 
  GRADE_RING_COLORS,
  GRADE_BG_LIGHT 
} from "@/types/creativeScore";

interface CreativeScoreCardProps {
  score: CreativeScore | null;
  isLoading?: boolean;
  onOptimize?: () => void;
  onRefresh?: () => void;
  compact?: boolean;
}

export function CreativeScoreCard({
  score,
  isLoading,
  onOptimize,
  onRefresh,
  compact = false,
}: CreativeScoreCardProps) {
  if (isLoading) {
    return (
      <div className={cn(
        "flex items-center justify-center",
        compact ? "h-16" : "h-48"
      )}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!score) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center text-center p-6 border border-dashed rounded-lg",
        compact ? "py-4" : "py-8"
      )}>
        <Sparkles className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground mb-3">
          Chưa có điểm đánh giá
        </p>
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <Sparkles className="h-4 w-4 mr-2" />
            Đánh giá ngay
          </Button>
        )}
      </div>
    );
  }

  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-3 p-3 rounded-lg border",
        GRADE_BG_LIGHT[score.grade]
      )}>
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
          GRADE_COLORS[score.grade]
        )}>
          {score.grade}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{score.overall_score}</span>
            <span className="text-xs text-muted-foreground">/100</span>
          </div>
          {score.optimization_priority && (
            <p className="text-xs text-muted-foreground truncate">
              Ưu tiên: {score.optimization_priority}
            </p>
          )}
        </div>
        {onOptimize && (
          <Button variant="ghost" size="sm" onClick={onOptimize}>
            <TrendingUp className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      "p-6 rounded-xl border-2",
      GRADE_BG_LIGHT[score.grade]
    )}>
      {/* Score Circle */}
      <div className="flex flex-col items-center mb-6">
        <CircularScore 
          score={score.overall_score} 
          grade={score.grade}
        />
        <p className="text-sm text-muted-foreground mt-2">
          Điểm chất lượng Creative
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <QuickStat 
          label="Strengths" 
          value={score.strengths?.length || 0}
          color="text-green-600"
        />
        <QuickStat 
          label="Weaknesses" 
          value={score.weaknesses?.length || 0}
          color="text-red-600"
        />
        <QuickStat 
          label="Priority" 
          value={score.optimization_priority ? "1" : "-"}
          color="text-blue-600"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {onOptimize && (
          <Button 
            className="flex-1" 
            onClick={onOptimize}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Tối ưu ngay
          </Button>
        )}
        {onRefresh && (
          <Button 
            variant="outline" 
            size="icon"
            onClick={onRefresh}
          >
            <Sparkles className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// Circular progress component
function CircularScore({ score, grade }: { score: number; grade: CreativeGrade }) {
  const circumference = 2 * Math.PI * 45;
  const progress = (score / 100) * circumference;

  return (
    <div className="relative w-32 h-32">
      <svg className="w-32 h-32 transform -rotate-90">
        {/* Background circle */}
        <circle
          cx="64"
          cy="64"
          r="45"
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          className="text-muted/30"
        />
        {/* Progress circle */}
        <motion.circle
          cx="64"
          cy="64"
          r="45"
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          className={GRADE_RING_COLORS[grade]}
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={{ strokeDasharray: `${progress} ${circumference}` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span 
          className={cn("text-3xl font-bold", GRADE_COLORS[grade], "bg-clip-text text-transparent bg-gradient-to-r")}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
          style={{ 
            backgroundImage: `linear-gradient(135deg, currentColor, currentColor)`,
            WebkitTextFillColor: 'unset'
          }}
        >
          {grade}
        </motion.span>
        <span className="text-sm text-muted-foreground">{score}/100</span>
      </div>
    </div>
  );
}

function QuickStat({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="text-center">
      <div className={cn("text-2xl font-bold", color)}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

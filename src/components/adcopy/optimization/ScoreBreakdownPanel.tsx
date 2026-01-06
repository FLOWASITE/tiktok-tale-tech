import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Check, X, AlertCircle, Target } from "lucide-react";
import { CreativeScore, ScoreBreakdown } from "@/types/creativeScore";
import { motion } from "framer-motion";

interface ScoreBreakdownPanelProps {
  score: CreativeScore;
  className?: string;
}

const COMPONENT_LABELS: Record<string, string> = {
  headline_score: "Tiêu đề",
  primary_text_score: "Nội dung chính",
  cta_score: "Call to Action",
  emotional_appeal_score: "Cảm xúc",
  clarity_score: "Độ rõ ràng",
  urgency_score: "Tính cấp bách",
  relevance_score: "Độ liên quan",
};

function getScoreColor(score: number): string {
  if (score >= 85) return "bg-green-500";
  if (score >= 70) return "bg-yellow-500";
  if (score >= 55) return "bg-orange-500";
  return "bg-red-500";
}

function getScoreTextColor(score: number): string {
  if (score >= 85) return "text-green-600";
  if (score >= 70) return "text-yellow-600";
  if (score >= 55) return "text-orange-600";
  return "text-red-600";
}

export function ScoreBreakdownPanel({ score, className }: ScoreBreakdownPanelProps) {
  // Extract component scores
  const componentScores = [
    { key: 'headline_score', value: score.headline_score },
    { key: 'primary_text_score', value: score.primary_text_score },
    { key: 'cta_score', value: score.cta_score },
    { key: 'emotional_appeal_score', value: score.emotional_appeal_score },
    { key: 'clarity_score', value: score.clarity_score },
    { key: 'urgency_score', value: score.urgency_score },
    { key: 'relevance_score', value: score.relevance_score },
  ].filter(s => s.value !== null && s.value !== undefined);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Component Scores */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Điểm từng thành phần
        </h4>
        <div className="space-y-3">
          {componentScores.map(({ key, value }, index) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="space-y-1"
            >
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">
                  {COMPONENT_LABELS[key] || key}
                </span>
                <span className={cn("font-medium", getScoreTextColor(value!))}>
                  {value}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className={cn("h-full rounded-full", getScoreColor(value!))}
                  initial={{ width: 0 }}
                  animate={{ width: `${value}%` }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Strengths */}
      {score.strengths && score.strengths.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            Điểm mạnh
          </h4>
          <div className="space-y-1.5">
            {score.strengths.map((strength, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                className="flex items-start gap-2 text-sm"
              >
                <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                <span>{strength}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Weaknesses */}
      {score.weaknesses && score.weaknesses.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <X className="h-4 w-4 text-red-500" />
            Điểm yếu
          </h4>
          <div className="space-y-1.5">
            {score.weaknesses.map((weakness, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.05 }}
                className="flex items-start gap-2 text-sm"
              >
                <X className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <span>{weakness}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Optimization Priority */}
      {score.optimization_priority && (
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-primary" />
            <h4 className="font-medium text-sm">Ưu tiên tối ưu</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            Tập trung cải thiện: <span className="font-medium text-primary">{COMPONENT_LABELS[score.optimization_priority + '_score'] || score.optimization_priority}</span>
          </p>
        </div>
      )}

      {/* Detailed Breakdown (if available) */}
      {score.score_breakdown && (
        <DetailedBreakdown breakdown={score.score_breakdown} />
      )}
    </div>
  );
}

function DetailedBreakdown({ breakdown }: { breakdown: ScoreBreakdown }) {
  const sections = Object.entries(breakdown).filter(([_, value]) => value?.factors?.length);

  if (sections.length === 0) return null;

  return (
    <div className="space-y-4 pt-4 border-t">
      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
        Chi tiết đánh giá
      </h4>
      {sections.map(([key, component]) => (
        <div key={key} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">{COMPONENT_LABELS[key + '_score'] || key}</span>
            <Badge variant="outline">{component.score}/100</Badge>
          </div>
          <div className="pl-4 space-y-1.5">
            {component.factors.map((factor, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium">{factor.name}:</span> {factor.feedback}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

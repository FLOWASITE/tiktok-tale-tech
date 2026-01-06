import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { 
  Check, 
  X, 
  FlaskConical, 
  Sparkles, 
  TrendingUp,
  Loader2,
  Zap,
  Clock,
  Users,
  Target,
  HelpCircle,
  Hash,
  Heart,
  AlertTriangle
} from "lucide-react";
import { 
  OptimizationSuggestion, 
  CONFIDENCE_COLORS, 
  CONFIDENCE_LABELS,
  FIELD_LABELS,
  getTechniqueInfo 
} from "@/types/creativeScore";
import { SuggestionDiffView } from "./SuggestionDiffView";
import { motion, AnimatePresence } from "framer-motion";

interface OptimizationSuggestionsPanelProps {
  suggestions: OptimizationSuggestion[];
  isLoading?: boolean;
  isGenerating?: boolean;
  onGenerate?: () => void;
  onApply?: (suggestion: OptimizationSuggestion) => void;
  onDismiss?: (suggestionId: string) => void;
  onTest?: (suggestion: OptimizationSuggestion) => void;
  className?: string;
}

const TECHNIQUE_ICONS: Record<string, React.ReactNode> = {
  power_words: <Zap className="h-3.5 w-3.5" />,
  urgency: <Clock className="h-3.5 w-3.5" />,
  social_proof: <Users className="h-3.5 w-3.5" />,
  benefit_focus: <Target className="h-3.5 w-3.5" />,
  question_hook: <HelpCircle className="h-3.5 w-3.5" />,
  number_specificity: <Hash className="h-3.5 w-3.5" />,
  emotional_trigger: <Heart className="h-3.5 w-3.5" />,
  scarcity: <AlertTriangle className="h-3.5 w-3.5" />,
};

export function OptimizationSuggestionsPanel({
  suggestions,
  isLoading,
  isGenerating,
  onGenerate,
  onApply,
  onDismiss,
  onTest,
  className,
}: OptimizationSuggestionsPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const pendingSuggestions = suggestions.filter(s => s.status === 'pending');
  const appliedSuggestions = suggestions.filter(s => s.status === 'applied');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className={cn("text-center py-12", className)}>
        <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-medium mb-2">Chưa có gợi ý tối ưu</h3>
        <p className="text-sm text-muted-foreground mb-4">
          AI sẽ phân tích nội dung và đề xuất các cải thiện cụ thể
        </p>
        {onGenerate && (
          <Button onClick={onGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Đang phân tích...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Tạo gợi ý tối ưu
              </>
            )}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">Gợi ý tối ưu</h3>
          {pendingSuggestions.length > 0 && (
            <Badge variant="secondary">{pendingSuggestions.length} mới</Badge>
          )}
        </div>
        {onGenerate && (
          <Button variant="outline" size="sm" onClick={onGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Tạo thêm
              </>
            )}
          </Button>
        )}
      </div>

      {/* Pending Suggestions */}
      <AnimatePresence mode="popLayout">
        {pendingSuggestions.map((suggestion, index) => (
          <motion.div
            key={suggestion.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ delay: index * 0.05 }}
          >
            <SuggestionCard
              suggestion={suggestion}
              isExpanded={expandedId === suggestion.id}
              onToggle={() => setExpandedId(
                expandedId === suggestion.id ? null : suggestion.id
              )}
              onApply={onApply}
              onDismiss={onDismiss}
              onTest={onTest}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Applied Suggestions */}
      {appliedSuggestions.length > 0 && (
        <div className="pt-4 border-t">
          <h4 className="text-sm text-muted-foreground mb-3">
            Đã áp dụng ({appliedSuggestions.length})
          </h4>
          <div className="space-y-2">
            {appliedSuggestions.map(suggestion => (
              <div
                key={suggestion.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-sm"
              >
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-muted-foreground">
                  {FIELD_LABELS[suggestion.field]}:
                </span>
                <span className="truncate flex-1">{suggestion.suggested_text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface SuggestionCardProps {
  suggestion: OptimizationSuggestion;
  isExpanded: boolean;
  onToggle: () => void;
  onApply?: (suggestion: OptimizationSuggestion) => void;
  onDismiss?: (suggestionId: string) => void;
  onTest?: (suggestion: OptimizationSuggestion) => void;
}

function SuggestionCard({
  suggestion,
  isExpanded,
  onToggle,
  onApply,
  onDismiss,
  onTest,
}: SuggestionCardProps) {
  const technique = suggestion.technique ? getTechniqueInfo(suggestion.technique) : null;
  const [isApplying, setIsApplying] = useState(false);

  const handleApply = async () => {
    if (!onApply) return;
    setIsApplying(true);
    try {
      await onApply(suggestion);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader 
        className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                {FIELD_LABELS[suggestion.field]}
              </Badge>
              {suggestion.predicted_improvement && (
                <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +{suggestion.predicted_improvement}% {suggestion.improvement_metric}
                </Badge>
              )}
            </div>
            <p className="text-sm truncate">{suggestion.suggested_text}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {suggestion.confidence && (
              <Badge 
                variant="outline" 
                className={cn("text-xs", CONFIDENCE_COLORS[suggestion.confidence])}
              >
                {CONFIDENCE_LABELS[suggestion.confidence]}
              </Badge>
            )}
            {technique && (
              <Badge variant="secondary" className="text-xs gap-1">
                {TECHNIQUE_ICONS[suggestion.technique || '']}
                {technique.label}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="px-4 pb-4 pt-0 space-y-4">
              {/* Diff View */}
              <SuggestionDiffView
                original={suggestion.original_text || ""}
                suggested={suggestion.suggested_text}
                field={suggestion.field}
              />

              {/* Reason */}
              {suggestion.reason && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    <strong>Lý do:</strong> {suggestion.reason}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={handleApply}
                  disabled={isApplying}
                >
                  {isApplying ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Áp dụng
                </Button>
                {onTest && (
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => onTest(suggestion)}
                  >
                    <FlaskConical className="h-4 w-4 mr-2" />
                    A/B Test
                  </Button>
                )}
                {onDismiss && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onDismiss(suggestion.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

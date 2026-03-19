import { SeamlessValidationResult } from '@/hooks/useSeamlessValidation';
import { cn } from '@/lib/utils';
import { CheckCircle, AlertTriangle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface SeamlessConsistencyCardProps {
  result: SeamlessValidationResult | null;
  validating: boolean;
  onRevalidate?: () => void;
}

export function SeamlessConsistencyCard({ result, validating, onRevalidate }: SeamlessConsistencyCardProps) {
  if (!result && !validating) return null;

  if (validating) {
    return (
      <div className="rounded-xl border border-border/50 bg-muted/20 p-4 flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
        <div>
          <p className="text-sm font-medium">Đang kiểm tra tính liên tục thị giác...</p>
          <p className="text-xs text-muted-foreground">Phân tích màu sắc, độ sáng và nhiệt độ giữa các slide</p>
        </div>
      </div>
    );
  }

  if (!result?.consistency) return null;

  const { overallScore, colorScore, brightnessScore, temperatureScore, issues, suggestion } = result.consistency;

  const getScoreConfig = (score: number) => {
    if (score >= 80) return { icon: CheckCircle, color: 'text-green-500', border: 'border-green-500/30', bg: 'bg-green-500/10', label: 'Tuyệt vời' };
    if (score >= 60) return { icon: AlertTriangle, color: 'text-yellow-500', border: 'border-yellow-500/30', bg: 'bg-yellow-500/10', label: 'Khá tốt' };
    return { icon: XCircle, color: 'text-red-500', border: 'border-red-500/30', bg: 'bg-red-500/10', label: 'Cần cải thiện' };
  };

  const config = getScoreConfig(overallScore);
  const Icon = config.icon;

  const metrics = [
    { label: 'Màu sắc', score: colorScore },
    { label: 'Độ sáng', score: brightnessScore },
    { label: 'Nhiệt độ', score: temperatureScore },
  ];

  return (
    <div className={cn("rounded-xl border p-4 space-y-3", config.border, config.bg)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn("w-5 h-5", config.color)} />
          <div>
            <p className="text-sm font-semibold">
              Tính liên tục: {overallScore}/100 — {config.label}
            </p>
          </div>
        </div>
        {onRevalidate && (
          <Button variant="ghost" size="sm" onClick={onRevalidate} className="h-7 text-xs gap-1">
            <RefreshCw className="w-3 h-3" />
            Kiểm tra lại
          </Button>
        )}
      </div>

      {/* Metric bars */}
      <div className="grid grid-cols-3 gap-3">
        {metrics.map(m => (
          <div key={m.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{m.label}</span>
              <span className="font-medium">{m.score}</span>
            </div>
            <Progress value={m.score} className="h-1.5" />
          </div>
        ))}
      </div>

      {/* Issues */}
      {issues && issues.length > 0 && (
        <div className="space-y-1">
          {issues.map((issue, i) => (
            <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
              <span className="text-yellow-500 shrink-0">⚠</span>
              {issue}
            </p>
          ))}
        </div>
      )}

      {/* Suggestion */}
      {suggestion && (
        <p className="text-xs text-muted-foreground italic border-t border-border/30 pt-2">
          💡 {suggestion}
        </p>
      )}
    </div>
  );
}

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion } from "framer-motion";

interface VariationPrediction {
  variationId: string;
  variationLabel: string;
  predictedCtr?: number;
  predictedCpc?: number;
  predictedCpm?: number;
  predictedConversionRate?: number;
  predictedRoas?: number;
  confidenceScore?: number;
}

interface PredictionComparisonChartProps {
  predictions: VariationPrediction[];
  highlightMetric?: 'ctr' | 'cpc' | 'conversion_rate' | 'roas';
  className?: string;
}

const METRIC_CONFIG = {
  ctr: { label: 'CTR', suffix: '%', higherIsBetter: true },
  cpc: { label: 'CPC', suffix: 'đ', higherIsBetter: false },
  cpm: { label: 'CPM', suffix: 'đ', higherIsBetter: false },
  conversion_rate: { label: 'Conversion', suffix: '%', higherIsBetter: true },
  roas: { label: 'ROAS', suffix: 'x', higherIsBetter: true },
};

export function PredictionComparisonChart({
  predictions,
  highlightMetric = 'ctr',
  className,
}: PredictionComparisonChartProps) {
  // Find the best performer for each metric
  const bestPerformers = useMemo(() => {
    const result: Record<string, string | null> = {};
    
    const metrics = [
      { key: 'ctr', accessor: (p: VariationPrediction) => p.predictedCtr },
      { key: 'cpc', accessor: (p: VariationPrediction) => p.predictedCpc },
      { key: 'conversion_rate', accessor: (p: VariationPrediction) => p.predictedConversionRate },
      { key: 'roas', accessor: (p: VariationPrediction) => p.predictedRoas },
    ];

    metrics.forEach(({ key, accessor }) => {
      const config = METRIC_CONFIG[key as keyof typeof METRIC_CONFIG];
      const validPredictions = predictions.filter(p => accessor(p) !== undefined);
      
      if (validPredictions.length === 0) {
        result[key] = null;
        return;
      }

      const best = validPredictions.reduce((best, current) => {
        const bestValue = accessor(best)!;
        const currentValue = accessor(current)!;
        
        if (config.higherIsBetter) {
          return currentValue > bestValue ? current : best;
        } else {
          return currentValue < bestValue ? current : best;
        }
      });

      result[key] = best.variationId;
    });

    return result;
  }, [predictions]);

  // Find overall winner (most "wins")
  const overallWinner = useMemo(() => {
    const winCounts: Record<string, number> = {};
    
    Object.values(bestPerformers).forEach(winnerId => {
      if (winnerId) {
        winCounts[winnerId] = (winCounts[winnerId] || 0) + 1;
      }
    });

    let maxWins = 0;
    let winner: string | null = null;

    Object.entries(winCounts).forEach(([id, wins]) => {
      if (wins > maxWins) {
        maxWins = wins;
        winner = id;
      }
    });

    return winner;
  }, [bestPerformers]);

  if (predictions.length === 0) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        Không có dữ liệu prediction để so sánh
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Overall Winner Banner */}
      {overallWinner && predictions.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border border-yellow-200 dark:border-yellow-800"
        >
          <Trophy className="h-5 w-5 text-yellow-600" />
          <span className="font-medium">Variation tốt nhất:</span>
          <Badge className="bg-yellow-500 text-white">
            {predictions.find(p => p.variationId === overallWinner)?.variationLabel}
          </Badge>
        </motion.div>
      )}

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                Variation
              </th>
              {Object.entries(METRIC_CONFIG).map(([key, config]) => (
                <th 
                  key={key} 
                  className={cn(
                    "text-center py-2 px-3 font-medium",
                    highlightMetric === key ? "bg-primary/5" : ""
                  )}
                >
                  {config.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {predictions.map((prediction, index) => (
              <motion.tr
                key={prediction.variationId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "border-b",
                  prediction.variationId === overallWinner && "bg-yellow-50/50 dark:bg-yellow-900/10"
                )}
              >
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    {prediction.variationId === overallWinner && (
                      <Trophy className="h-4 w-4 text-yellow-600" />
                    )}
                    <span className="font-medium">{prediction.variationLabel}</span>
                    {prediction.confidenceScore && (
                      <Badge variant="outline" className="text-xs">
                        {prediction.confidenceScore}%
                      </Badge>
                    )}
                  </div>
                </td>
                
                <MetricCell
                  value={prediction.predictedCtr}
                  suffix="%"
                  isBest={bestPerformers.ctr === prediction.variationId}
                  isHighlighted={highlightMetric === 'ctr'}
                />
                <MetricCell
                  value={prediction.predictedCpc}
                  suffix="đ"
                  isBest={bestPerformers.cpc === prediction.variationId}
                  isHighlighted={highlightMetric === 'cpc'}
                  format={(v) => v.toLocaleString()}
                />
                <MetricCell
                  value={prediction.predictedCpm}
                  suffix="đ"
                  isBest={false}
                  isHighlighted={false}
                  format={(v) => v.toLocaleString()}
                />
                <MetricCell
                  value={prediction.predictedConversionRate}
                  suffix="%"
                  isBest={bestPerformers.conversion_rate === prediction.variationId}
                  isHighlighted={highlightMetric === 'conversion_rate'}
                />
                <MetricCell
                  value={prediction.predictedRoas}
                  suffix="x"
                  isBest={bestPerformers.roas === prediction.variationId}
                  isHighlighted={highlightMetric === 'roas'}
                />
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Tốt nhất trong metric</span>
        </div>
        <div className="flex items-center gap-1">
          <Trophy className="h-3 w-3 text-yellow-600" />
          <span>Winner tổng thể</span>
        </div>
      </div>
    </div>
  );
}

interface MetricCellProps {
  value?: number;
  suffix: string;
  isBest: boolean;
  isHighlighted: boolean;
  format?: (value: number) => string;
}

function MetricCell({ value, suffix, isBest, isHighlighted, format }: MetricCellProps) {
  if (value === undefined) {
    return (
      <td className={cn(
        "text-center py-3 px-3 text-muted-foreground",
        isHighlighted && "bg-primary/5"
      )}>
        -
      </td>
    );
  }

  const formattedValue = format ? format(value) : value.toFixed(2);

  return (
    <td className={cn(
      "text-center py-3 px-3",
      isHighlighted && "bg-primary/5",
      isBest && "font-semibold"
    )}>
      <div className="flex items-center justify-center gap-1">
        {isBest && (
          <span className="w-2 h-2 rounded-full bg-green-500" />
        )}
        <span className={cn(isBest && "text-green-600 dark:text-green-400")}>
          {formattedValue}{suffix}
        </span>
      </div>
    </td>
  );
}

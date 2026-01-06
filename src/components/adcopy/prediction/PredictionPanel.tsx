import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, TrendingUp, TrendingDown, Minus, Lightbulb, RefreshCw, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdCopyPrediction } from '@/hooks/useAdCopyPrediction';
import { 
  type PerformancePrediction,
  getConfidenceColor, 
  getConfidenceBgColor,
  getComparisonIcon,
  getComparisonColor,
  getImpactColor,
  getImpactIcon,
  formatCurrency,
  formatPercent,
  formatROAS
} from '@/types/adCopyPrediction';
import type { AdCopy, AdCopyVariation } from '@/types/adCopy';

interface PredictionPanelProps {
  adCopy: AdCopy;
  selectedVariation?: AdCopyVariation;
}

export function PredictionPanel({ adCopy, selectedVariation }: PredictionPanelProps) {
  const { isLoading, result, error, predictPerformance, reset } = useAdCopyPrediction();

  const handlePredict = () => {
    predictPerformance(adCopy.id, selectedVariation?.id);
  };

  if (!result && !isLoading && !error) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5" />
            Dự đoán hiệu suất
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">
              AI sẽ phân tích nội dung quảng cáo và dự đoán hiệu suất dựa trên benchmarks ngành.
            </p>
            <Button onClick={handlePredict} disabled={isLoading}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Dự đoán ngay
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Đang phân tích và dự đoán...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button variant="outline" onClick={handlePredict}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Thử lại
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const prediction = result?.prediction;
  if (!prediction) return null;

  return (
    <div className="space-y-4">
      {/* Confidence Score */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Độ tin cậy dự đoán</CardTitle>
            <Badge 
              variant="outline" 
              className={cn(getConfidenceColor(prediction.confidence_level))}
            >
              {prediction.confidence_level === 'high' && 'Cao'}
              {prediction.confidence_level === 'medium' && 'Trung bình'}
              {prediction.confidence_level === 'low' && 'Thấp'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Progress 
              value={prediction.confidence_score} 
              className={cn("flex-1 h-3", `[&>div]:${getConfidenceBgColor(prediction.confidence_level)}`)} 
            />
            <span className="text-lg font-bold">{prediction.confidence_score}%</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Dựa trên {result?.benchmark?.sample_count || 0} mẫu dữ liệu từ ngành {result?.benchmark?.industry || 'tổng hợp'}
          </p>
        </CardContent>
      </Card>

      {/* Predicted Metrics */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Chỉ số dự đoán</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* CTR */}
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">CTR</p>
              <p className="text-xl font-bold">{formatPercent(prediction.predicted_ctr)}</p>
              <div className={cn("flex items-center gap-1 text-xs mt-1", getComparisonColor(prediction.benchmark_comparison.ctr_vs_benchmark))}>
                {prediction.benchmark_comparison.ctr_vs_benchmark === 'above' && <TrendingUp className="h-3 w-3" />}
                {prediction.benchmark_comparison.ctr_vs_benchmark === 'below' && <TrendingDown className="h-3 w-3" />}
                {prediction.benchmark_comparison.ctr_vs_benchmark === 'at' && <Minus className="h-3 w-3" />}
                {prediction.benchmark_comparison.ctr_diff_percent > 0 ? '+' : ''}{prediction.benchmark_comparison.ctr_diff_percent.toFixed(0)}% vs benchmark
              </div>
            </div>

            {/* CPC */}
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">CPC</p>
              <p className="text-xl font-bold">{formatCurrency(prediction.predicted_cpc)}</p>
              <div className={cn("flex items-center gap-1 text-xs mt-1", getComparisonColor(prediction.benchmark_comparison.cpc_vs_benchmark, true))}>
                {prediction.benchmark_comparison.cpc_vs_benchmark === 'above' && <TrendingUp className="h-3 w-3" />}
                {prediction.benchmark_comparison.cpc_vs_benchmark === 'below' && <TrendingDown className="h-3 w-3" />}
                {prediction.benchmark_comparison.cpc_vs_benchmark === 'at' && <Minus className="h-3 w-3" />}
                {prediction.benchmark_comparison.cpc_diff_percent > 0 ? '+' : ''}{prediction.benchmark_comparison.cpc_diff_percent.toFixed(0)}% vs benchmark
              </div>
            </div>

            {/* CPM */}
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">CPM</p>
              <p className="text-xl font-bold">{formatCurrency(prediction.predicted_cpm)}</p>
            </div>

            {/* Conversion Rate */}
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Tỷ lệ chuyển đổi</p>
              <p className="text-xl font-bold">{formatPercent(prediction.predicted_conversion_rate)}</p>
            </div>

            {/* ROAS */}
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">ROAS</p>
              <p className="text-xl font-bold">{formatROAS(prediction.predicted_roas)}</p>
              <div className={cn("flex items-center gap-1 text-xs mt-1", getComparisonColor(prediction.benchmark_comparison.roas_vs_benchmark))}>
                {prediction.benchmark_comparison.roas_vs_benchmark === 'above' && <TrendingUp className="h-3 w-3" />}
                {prediction.benchmark_comparison.roas_vs_benchmark === 'below' && <TrendingDown className="h-3 w-3" />}
                {prediction.benchmark_comparison.roas_vs_benchmark === 'at' && <Minus className="h-3 w-3" />}
                {prediction.benchmark_comparison.roas_diff_percent > 0 ? '+' : ''}{prediction.benchmark_comparison.roas_diff_percent.toFixed(0)}% vs benchmark
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Impact Factors */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Yếu tố ảnh hưởng</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {prediction.factors.map((factor, i) => (
              <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
                <span className={cn("mt-0.5", getImpactColor(factor.impact))}>
                  {getImpactIcon(factor.impact)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{factor.factor}</span>
                    <Badge variant="outline" className="text-xs">
                      {(factor.weight * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{factor.explanation}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Improvement Suggestions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            Gợi ý cải thiện
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {prediction.improvement_suggestions.map((suggestion, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-primary font-bold">{i + 1}.</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <Button variant="outline" onClick={handlePredict} disabled={isLoading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Dự đoán lại
        </Button>
      </div>
    </div>
  );
}

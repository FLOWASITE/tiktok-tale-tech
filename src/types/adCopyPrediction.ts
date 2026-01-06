// ============================================
// Ad Copy Performance Prediction Types
// Phase 3 - AI-powered prediction system
// ============================================

export interface PerformancePrediction {
  predicted_ctr: number;
  predicted_cpc: number;
  predicted_cpm: number;
  predicted_conversion_rate: number;
  predicted_roas: number;
  
  confidence_score: number; // 0-100
  confidence_level: 'low' | 'medium' | 'high';
  
  benchmark_comparison: BenchmarkComparison;
  factors: PredictionFactor[];
  improvement_suggestions: string[];
}

export interface BenchmarkComparison {
  ctr_vs_benchmark: 'above' | 'at' | 'below';
  ctr_diff_percent: number;
  cpc_vs_benchmark: 'above' | 'at' | 'below';
  cpc_diff_percent: number;
  roas_vs_benchmark: 'above' | 'at' | 'below';
  roas_diff_percent: number;
  
  benchmark_source: string;
  benchmark_sample_size: number;
}

export interface PredictionFactor {
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number; // 0-1
  explanation: string;
}

export interface IndustryBenchmark {
  id: string;
  platform: string;
  industry: string | null;
  objective: string | null;
  
  avg_ctr: number;
  avg_cpc: number;
  avg_cpm: number;
  avg_conversion_rate: number | null;
  avg_roas: number | null;
  
  sample_count: number;
  data_source: string;
  period_start: string | null;
  period_end: string | null;
}

// Helper functions
export function getConfidenceColor(level: PerformancePrediction['confidence_level']): string {
  switch (level) {
    case 'high': return 'text-green-500';
    case 'medium': return 'text-yellow-500';
    case 'low': return 'text-red-500';
  }
}

export function getConfidenceBgColor(level: PerformancePrediction['confidence_level']): string {
  switch (level) {
    case 'high': return 'bg-green-500';
    case 'medium': return 'bg-yellow-500';
    case 'low': return 'bg-red-500';
  }
}

export function getComparisonIcon(comparison: 'above' | 'at' | 'below'): string {
  switch (comparison) {
    case 'above': return '↑';
    case 'at': return '→';
    case 'below': return '↓';
  }
}

export function getComparisonColor(comparison: 'above' | 'at' | 'below', invertForCost = false): string {
  if (invertForCost) {
    switch (comparison) {
      case 'above': return 'text-red-500';
      case 'at': return 'text-yellow-500';
      case 'below': return 'text-green-500';
    }
  }
  switch (comparison) {
    case 'above': return 'text-green-500';
    case 'at': return 'text-yellow-500';
    case 'below': return 'text-red-500';
  }
}

export function getImpactColor(impact: PredictionFactor['impact']): string {
  switch (impact) {
    case 'positive': return 'text-green-500';
    case 'negative': return 'text-red-500';
    case 'neutral': return 'text-muted-foreground';
  }
}

export function getImpactIcon(impact: PredictionFactor['impact']): string {
  switch (impact) {
    case 'positive': return '✓';
    case 'negative': return '✗';
    case 'neutral': return '○';
  }
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN', { 
    style: 'currency', 
    currency: 'VND',
    maximumFractionDigits: 0 
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function formatROAS(value: number): string {
  return `${value.toFixed(2)}x`;
}

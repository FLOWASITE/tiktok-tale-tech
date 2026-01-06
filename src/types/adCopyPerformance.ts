export interface AdCopyPerformance {
  id: string;
  ad_copy_id: string;
  variation_id: string | null;
  logged_at: string;
  
  // Core metrics
  impressions: number;
  reach: number;
  clicks: number;
  
  // Engagement
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  
  // Conversion
  leads: number;
  conversions: number;
  conversion_value: number;
  
  // Cost
  spend: number;
  
  // Calculated
  ctr: number;
  cpc: number;
  cpm: number;
  conversion_rate: number;
  roas: number;
  engagement_rate: number;
  
  // Metadata
  data_source: 'manual' | 'import' | 'api';
  external_ad_id: string | null;
  notes: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface PerformanceSummary {
  total_impressions: number;
  total_reach: number;
  total_clicks: number;
  total_conversions: number;
  total_spend: number;
  total_conversion_value: number;
  avg_ctr: number;
  avg_cpc: number;
  avg_cpm: number;
  avg_conversion_rate: number;
  overall_roas: number;
  total_engagement: number;
  avg_engagement_rate: number;
}

export interface PerformanceByDate {
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  ctr: number;
}

export interface VariationPerformance {
  variation_id: string;
  variation_label: string;
  summary: PerformanceSummary;
}

export interface PerformanceFormData {
  logged_at: string;
  variation_id?: string;
  impressions: number;
  reach: number;
  clicks: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  leads: number;
  conversions: number;
  conversion_value: number;
  spend: number;
  notes?: string;
}

export function calculateMetrics(data: Partial<PerformanceFormData>): {
  ctr: number;
  cpc: number;
  cpm: number;
  conversion_rate: number;
  roas: number;
  engagement_rate: number;
} {
  const impressions = data.impressions || 0;
  const clicks = data.clicks || 0;
  const conversions = data.conversions || 0;
  const spend = data.spend || 0;
  const conversion_value = data.conversion_value || 0;
  const likes = data.likes || 0;
  const comments = data.comments || 0;
  const shares = data.shares || 0;
  const saves = data.saves || 0;
  
  return {
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    conversion_rate: clicks > 0 ? (conversions / clicks) * 100 : 0,
    roas: spend > 0 ? conversion_value / spend : 0,
    engagement_rate: impressions > 0 
      ? ((likes + comments + shares + saves) / impressions) * 100 
      : 0,
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

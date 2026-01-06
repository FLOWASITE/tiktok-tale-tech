export type ABTestVariable = 'headline' | 'primary_text' | 'cta' | 'full_copy';
export type ABTestStatus = 'draft' | 'running' | 'paused' | 'completed';
export type ABTestMetric = 'ctr' | 'conversions' | 'conversion_rate' | 'cpc';

export interface ABTest {
  id: string;
  organization_id: string;
  ad_copy_id: string;
  name: string;
  hypothesis: string | null;
  test_variable: ABTestVariable;
  variation_ids: string[];
  winner_variation_id: string | null;
  start_date: string | null;
  end_date: string | null;
  status: ABTestStatus;
  metrics_to_track: ABTestMetric[];
  confidence_threshold: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ABTestResult {
  id: string;
  ab_test_id: string;
  variation_id: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  ctr: number;
  conversion_rate: number;
  cpc: number;
  logged_at: string;
  updated_at: string;
}

export interface ABTestWithResults extends ABTest {
  results: ABTestResult[];
  ad_copy?: {
    title: string;
    platform: string;
  };
}

export interface VariationStats {
  variation_id: string;
  variation_label: string;
  total_impressions: number;
  total_clicks: number;
  total_conversions: number;
  total_spend: number;
  avg_ctr: number;
  avg_conversion_rate: number;
  avg_cpc: number;
  confidence: number;
  is_winner: boolean;
  is_control: boolean;
}

export const TEST_VARIABLES = [
  { value: 'full_copy', label: 'Full Copy', description: 'So sánh toàn bộ nội dung' },
  { value: 'headline', label: 'Headline', description: 'Chỉ so sánh tiêu đề' },
  { value: 'primary_text', label: 'Primary Text', description: 'So sánh nội dung chính' },
  { value: 'cta', label: 'CTA Button', description: 'So sánh nút kêu gọi hành động' },
] as const;

export const AB_TEST_STATUSES = [
  { value: 'draft', label: 'Nháp', color: 'bg-muted text-muted-foreground' },
  { value: 'running', label: 'Đang chạy', color: 'bg-green-100 text-green-700' },
  { value: 'paused', label: 'Tạm dừng', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'completed', label: 'Hoàn thành', color: 'bg-blue-100 text-blue-700' },
] as const;

export const AB_TEST_METRICS = [
  { value: 'ctr', label: 'CTR', description: 'Click-through rate' },
  { value: 'conversions', label: 'Conversions', description: 'Số chuyển đổi' },
  { value: 'conversion_rate', label: 'Conv. Rate', description: 'Tỷ lệ chuyển đổi' },
  { value: 'cpc', label: 'CPC', description: 'Chi phí mỗi click' },
] as const;

// Statistical significance calculation (Z-test for proportions)
export function calculateConfidence(
  control: { clicks: number; impressions: number },
  variant: { clicks: number; impressions: number }
): number {
  if (control.impressions === 0 || variant.impressions === 0) return 0;
  
  const p1 = control.clicks / control.impressions;
  const p2 = variant.clicks / variant.impressions;
  const p = (control.clicks + variant.clicks) / (control.impressions + variant.impressions);
  
  const se = Math.sqrt(p * (1 - p) * (1 / control.impressions + 1 / variant.impressions));
  if (se === 0) return 0;
  
  const z = Math.abs(p2 - p1) / se;
  
  // Convert Z-score to confidence percentage (two-tailed)
  // Using approximation: confidence ≈ 1 - 2 * (1 - Φ(z))
  const confidence = (1 - 2 * (1 - normalCDF(z))) * 100;
  return Math.min(Math.max(confidence, 0), 99.9);
}

function normalCDF(z: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  
  const sign = z < 0 ? -1 : 1;
  z = Math.abs(z) / Math.sqrt(2);
  
  const t = 1 / (1 + p * z);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
  
  return 0.5 * (1 + sign * y);
}

export function getStatusConfig(status: ABTestStatus) {
  return AB_TEST_STATUSES.find(s => s.value === status) || AB_TEST_STATUSES[0];
}

// =============================================
// KPI Target Suggestion Engine
// Calculate suggested KPI targets based on budget, campaign type, and industry benchmarks
// =============================================

import { CampaignType, CampaignGoal, CampaignMetric, CAMPAIGN_TYPES, KPI_METRICS } from '@/types/campaign';

// Industry benchmarks (Vietnamese market averages)
interface IndustryBenchmarks {
  avgCPM: number;           // Cost per 1000 impressions (VND)
  avgCPC: number;           // Cost per click (VND)
  engagementRate: number;   // % (likes + comments + shares / reach)
  ctr: number;              // Click-through rate %
  conversionRate: number;   // % of clicks that convert
  sharesPerEngagement: number; // % of engagements that are shares
  commentsPerEngagement: number; // % of engagements that are comments
}

const INDUSTRY_BENCHMARKS: Record<string, IndustryBenchmarks> = {
  // Default / General
  default: {
    avgCPM: 15000,
    avgCPC: 3000,
    engagementRate: 3.5,
    ctr: 1.2,
    conversionRate: 2.5,
    sharesPerEngagement: 15,
    commentsPerEngagement: 10,
  },
  // E-commerce / Retail
  'e-commerce': {
    avgCPM: 12000,
    avgCPC: 2500,
    engagementRate: 4.0,
    ctr: 1.8,
    conversionRate: 3.5,
    sharesPerEngagement: 12,
    commentsPerEngagement: 8,
  },
  retail: {
    avgCPM: 12000,
    avgCPC: 2500,
    engagementRate: 4.0,
    ctr: 1.8,
    conversionRate: 3.5,
    sharesPerEngagement: 12,
    commentsPerEngagement: 8,
  },
  // F&B
  'food-beverage': {
    avgCPM: 10000,
    avgCPC: 2000,
    engagementRate: 5.5,
    ctr: 1.5,
    conversionRate: 2.0,
    sharesPerEngagement: 20,
    commentsPerEngagement: 15,
  },
  restaurant: {
    avgCPM: 10000,
    avgCPC: 2000,
    engagementRate: 5.5,
    ctr: 1.5,
    conversionRate: 2.0,
    sharesPerEngagement: 20,
    commentsPerEngagement: 15,
  },
  // Beauty & Fashion
  beauty: {
    avgCPM: 18000,
    avgCPC: 3500,
    engagementRate: 4.5,
    ctr: 1.4,
    conversionRate: 2.8,
    sharesPerEngagement: 18,
    commentsPerEngagement: 12,
  },
  fashion: {
    avgCPM: 18000,
    avgCPC: 3500,
    engagementRate: 4.5,
    ctr: 1.4,
    conversionRate: 2.8,
    sharesPerEngagement: 18,
    commentsPerEngagement: 12,
  },
  // Tech / SaaS
  technology: {
    avgCPM: 25000,
    avgCPC: 5000,
    engagementRate: 2.5,
    ctr: 0.9,
    conversionRate: 1.5,
    sharesPerEngagement: 25,
    commentsPerEngagement: 8,
  },
  saas: {
    avgCPM: 30000,
    avgCPC: 6000,
    engagementRate: 2.0,
    ctr: 0.8,
    conversionRate: 1.2,
    sharesPerEngagement: 30,
    commentsPerEngagement: 5,
  },
  // Healthcare
  healthcare: {
    avgCPM: 20000,
    avgCPC: 4000,
    engagementRate: 3.0,
    ctr: 1.0,
    conversionRate: 1.8,
    sharesPerEngagement: 22,
    commentsPerEngagement: 10,
  },
  // Education
  education: {
    avgCPM: 15000,
    avgCPC: 3000,
    engagementRate: 4.0,
    ctr: 1.3,
    conversionRate: 2.2,
    sharesPerEngagement: 25,
    commentsPerEngagement: 12,
  },
  // Real Estate
  'real-estate': {
    avgCPM: 35000,
    avgCPC: 8000,
    engagementRate: 2.0,
    ctr: 0.6,
    conversionRate: 0.8,
    sharesPerEngagement: 15,
    commentsPerEngagement: 18,
  },
  // Finance / Banking
  finance: {
    avgCPM: 28000,
    avgCPC: 6000,
    engagementRate: 2.2,
    ctr: 0.7,
    conversionRate: 1.0,
    sharesPerEngagement: 12,
    commentsPerEngagement: 8,
  },
  // Entertainment
  entertainment: {
    avgCPM: 8000,
    avgCPC: 1500,
    engagementRate: 6.0,
    ctr: 2.0,
    conversionRate: 3.0,
    sharesPerEngagement: 25,
    commentsPerEngagement: 15,
  },
};

// Campaign type multipliers for different metrics
const CAMPAIGN_TYPE_MULTIPLIERS: Record<CampaignType, Record<string, number>> = {
  awareness: {
    reach: 1.0,
    impressions: 1.0,
    brand_mentions: 1.0,
    engagement_rate: 0.7,
    clicks: 0.5,
    conversions: 0.3,
  },
  engagement: {
    reach: 0.7,
    impressions: 0.8,
    brand_mentions: 0.8,
    engagement_rate: 1.2,
    clicks: 0.6,
    conversions: 0.4,
  },
  conversion: {
    reach: 0.5,
    impressions: 0.6,
    brand_mentions: 0.4,
    engagement_rate: 0.6,
    clicks: 1.2,
    conversions: 1.0,
  },
  retention: {
    reach: 0.4,
    impressions: 0.5,
    brand_mentions: 0.6,
    engagement_rate: 1.0,
    clicks: 0.5,
    conversions: 0.6,
  },
  launch: {
    reach: 1.2,
    impressions: 1.2,
    brand_mentions: 1.5,
    engagement_rate: 1.0,
    clicks: 0.8,
    conversions: 0.7,
  },
};

// Seasonal multipliers (Vietnamese calendar)
function getSeasonalMultiplier(startDate: string): number {
  const date = new Date(startDate);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  // Tết Nguyên Đán period (late Jan - early Feb)
  if ((month === 1 && day >= 15) || (month === 2 && day <= 15)) {
    return 1.4; // Higher engagement during Tết
  }
  
  // Black Friday / 11.11 / 12.12 period
  if ((month === 11 && day >= 1 && day <= 15) || (month === 12 && day >= 1 && day <= 15)) {
    return 1.3;
  }
  
  // Back to school (Aug - Sep)
  if (month === 8 || month === 9) {
    return 1.15;
  }
  
  // Summer (Jun - Jul)
  if (month === 6 || month === 7) {
    return 1.1;
  }
  
  // Valentine's Day period
  if (month === 2 && day >= 7 && day <= 14) {
    return 1.2;
  }
  
  // Women's Day period (March 8)
  if (month === 3 && day >= 1 && day <= 8) {
    return 1.2;
  }
  
  return 1.0;
}

// Get benchmarks for an industry
function getBenchmarks(industries: string[] | null): IndustryBenchmarks {
  if (!industries || industries.length === 0) {
    return INDUSTRY_BENCHMARKS.default;
  }
  
  // Try to find a matching industry
  for (const industry of industries) {
    const normalized = industry.toLowerCase().replace(/\s+/g, '-');
    if (INDUSTRY_BENCHMARKS[normalized]) {
      return INDUSTRY_BENCHMARKS[normalized];
    }
  }
  
  return INDUSTRY_BENCHMARKS.default;
}

export interface KPISuggestionParams {
  budget: number;
  budgetCurrency?: string;
  campaignType: CampaignType;
  industries?: string[] | null;
  startDate: string;
  targetChannels?: string[];
}

export interface KPISuggestion {
  metric: CampaignMetric;
  label: string;
  target: number;
  current: number;
  unit?: string;
  reasoning: string;
}

// Main function to generate KPI suggestions
export function generateKPISuggestions(params: KPISuggestionParams): KPISuggestion[] {
  const {
    budget,
    campaignType,
    industries,
    startDate,
    targetChannels = [],
  } = params;

  const benchmarks = getBenchmarks(industries ?? null);
  const typeConfig = CAMPAIGN_TYPES.find(t => t.value === campaignType);
  const typeMultipliers = CAMPAIGN_TYPE_MULTIPLIERS[campaignType];
  const seasonalMultiplier = getSeasonalMultiplier(startDate);
  
  // Calculate channel multiplier (more channels = wider but thinner reach)
  const channelCount = targetChannels.length || 1;
  const channelMultiplier = Math.min(1 + (channelCount - 1) * 0.15, 1.5);
  
  // Calculate base metrics from budget
  const estimatedImpressions = Math.round((budget / benchmarks.avgCPM) * 1000 * typeMultipliers.impressions * seasonalMultiplier * channelMultiplier);
  const estimatedReach = Math.round(estimatedImpressions / 3); // Assuming frequency of 3
  const estimatedClicks = Math.round((budget / benchmarks.avgCPC) * typeMultipliers.clicks * seasonalMultiplier);
  
  const suggestions: KPISuggestion[] = [];
  
  // Get default metrics for this campaign type
  const defaultMetrics = typeConfig?.defaultMetrics || ['reach', 'impressions', 'engagement_rate'];
  
  // Add metrics based on campaign type
  for (const metricKey of defaultMetrics) {
    const metricConfig = KPI_METRICS.find(m => m.value === metricKey);
    if (!metricConfig) continue;
    
    let target = 0;
    let reasoning = '';
    
    switch (metricKey) {
      case 'reach':
        target = estimatedReach;
        reasoning = `Dựa trên budget ${formatBudgetShort(budget)} với CPM ~${formatBudgetShort(benchmarks.avgCPM)}/1K impressions`;
        break;
        
      case 'impressions':
        target = estimatedImpressions;
        reasoning = `Tính từ budget với frequency = 3 lần/người xem`;
        break;
        
      case 'brand_mentions':
        target = Math.round(estimatedReach * 0.001 * seasonalMultiplier);
        reasoning = `Ước tính 0.1% người tiếp cận sẽ đề cập thương hiệu`;
        break;
        
      case 'likes':
        target = Math.round(estimatedReach * (benchmarks.engagementRate / 100) * 0.7);
        reasoning = `~70% tổng engagement dự kiến là likes`;
        break;
        
      case 'comments':
        target = Math.round(estimatedReach * (benchmarks.engagementRate / 100) * (benchmarks.commentsPerEngagement / 100));
        reasoning = `~${benchmarks.commentsPerEngagement}% engagement là comments theo benchmark ngành`;
        break;
        
      case 'shares':
        target = Math.round(estimatedReach * (benchmarks.engagementRate / 100) * (benchmarks.sharesPerEngagement / 100));
        reasoning = `~${benchmarks.sharesPerEngagement}% engagement là shares - quan trọng cho viral`;
        break;
        
      case 'saves':
        target = Math.round(estimatedReach * (benchmarks.engagementRate / 100) * 0.08);
        reasoning = `~8% engagement là saves (nội dung có giá trị)`;
        break;
        
      case 'engagement_rate':
        target = Math.round(benchmarks.engagementRate * typeMultipliers.engagement_rate * seasonalMultiplier * 10) / 10;
        reasoning = `Benchmark ngành ${benchmarks.engagementRate}% × ${seasonalMultiplier > 1 ? 'mùa cao điểm' : 'điều chỉnh theo loại campaign'}`;
        break;
        
      case 'clicks':
        target = estimatedClicks;
        reasoning = `Budget / CPC trung bình (~${formatBudgetShort(benchmarks.avgCPC)}/click)`;
        break;
        
      case 'ctr':
        target = Math.round(benchmarks.ctr * typeMultipliers.clicks * 10) / 10;
        reasoning = `Benchmark ngành ${benchmarks.ctr}% điều chỉnh theo loại campaign`;
        break;
        
      case 'leads':
        target = Math.round(estimatedClicks * (benchmarks.conversionRate / 100) * 0.5);
        reasoning = `~${benchmarks.conversionRate / 2}% clicks chuyển đổi thành leads`;
        break;
        
      case 'sales':
        target = Math.round(estimatedClicks * (benchmarks.conversionRate / 100) * 0.3);
        reasoning = `~${(benchmarks.conversionRate * 0.3).toFixed(1)}% clicks chuyển đổi thành sales`;
        break;
        
      case 'revenue':
        // Estimate revenue based on average order value (assumed 500K VND)
        const avgOrderValue = 500000;
        const estimatedSales = Math.round(estimatedClicks * (benchmarks.conversionRate / 100) * 0.3);
        target = estimatedSales * avgOrderValue;
        reasoning = `${estimatedSales} sales × AOV trung bình 500K`;
        break;
    }
    
    if (target > 0) {
      // Round to nice numbers
      target = roundToNiceNumber(target);
      
      suggestions.push({
        metric: metricKey as CampaignMetric,
        label: metricConfig.label,
        target,
        current: 0,
        unit: metricConfig.unit || undefined,
        reasoning,
      });
    }
  }
  
  return suggestions;
}

// Round to nice human-readable numbers
function roundToNiceNumber(num: number): number {
  if (num < 100) return Math.round(num / 10) * 10;
  if (num < 1000) return Math.round(num / 50) * 50;
  if (num < 10000) return Math.round(num / 500) * 500;
  if (num < 100000) return Math.round(num / 5000) * 5000;
  if (num < 1000000) return Math.round(num / 50000) * 50000;
  return Math.round(num / 500000) * 500000;
}

// Format budget for display
function formatBudgetShort(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toString();
}

// Get industry name for display
export function getIndustryDisplayName(industries: string[] | null): string {
  if (!industries || industries.length === 0) return 'Chung';
  return industries[0];
}

// Check if suggestions are available for this campaign
export function canGenerateSuggestions(budget: number | null): boolean {
  return budget !== null && budget > 0;
}

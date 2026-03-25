// =============================================
// Campaign Management System - TypeScript Types
// Phase 1: Core types, interfaces, and constants
// =============================================

// Campaign Types
export type CampaignType = 
  | 'awareness' 
  | 'engagement' 
  | 'conversion' 
  | 'retention' 
  | 'launch';

export type CampaignStatus = 
  | 'draft' 
  | 'planning' 
  | 'active' 
  | 'paused' 
  | 'completed' 
  | 'cancelled';

export type MilestoneStatus = 
  | 'pending' 
  | 'in_progress' 
  | 'completed' 
  | 'missed';

export type CampaignContentType = 
  | 'multichannel' 
  | 'script' 
  | 'carousel';

// KPI Metrics
export type CampaignMetric = 
  | 'reach' 
  | 'impressions' 
  | 'brand_mentions'
  | 'likes' 
  | 'comments' 
  | 'shares' 
  | 'saves' 
  | 'engagement_rate'
  | 'clicks' 
  | 'ctr' 
  | 'leads' 
  | 'sales' 
  | 'revenue'
  | 'custom';

export interface CampaignGoal {
  metric: CampaignMetric;
  label: string;
  target: number;
  current: number;
  unit?: string;
}

// Main Campaign Interface
export interface Campaign {
  id: string;
  organization_id: string;
  brand_template_id: string | null;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  start_date: string;
  end_date: string;
  campaign_type: CampaignType;
  goals: CampaignGoal[];
  budget_total: number | null;
  budget_spent: number;
  budget_currency: string;
  target_channels: string[];
  status: CampaignStatus;
  tags: string[];
  content_brief?: CampaignContentBrief | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignMilestone {
  id: string;
  campaign_id: string;
  title: string;
  description: string | null;
  due_date: string;
  status: MilestoneStatus;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
}

export interface CampaignContent {
  id: string;
  campaign_id: string;
  content_type: CampaignContentType;
  content_id: string;
  planned_publish_date: string | null;
  sort_order: number;
  notes: string | null;
  created_at: string;
}

export interface CampaignKPILog {
  id: string;
  campaign_id: string;
  logged_at: string;
  metrics: Record<string, number>;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

// Content Brief for AI Agent
export interface CampaignContentBrief {
  key_messages: string[];
  primary_cta: string;
  pillar_allocation: Record<string, number>;
}

// Form Data Types
export interface CampaignFormData {
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  campaign_type: CampaignType;
  brand_template_id?: string;
  goals?: CampaignGoal[];
  budget_total?: number;
  budget_currency?: string;
  target_channels?: string[];
  tags?: string[];
  content_brief?: CampaignContentBrief;
}

export interface MilestoneFormData {
  title: string;
  description?: string;
  due_date: string;
  status?: MilestoneStatus;
}

// =============================================
// Constants
// =============================================

export const CAMPAIGN_TYPES: { 
  value: CampaignType; 
  label: string; 
  description: string; 
  defaultMetrics: CampaignMetric[];
  icon: string;
}[] = [
  { 
    value: 'awareness', 
    label: 'Nhận diện thương hiệu', 
    description: 'Tăng độ nhận biết và tiếp cận',
    defaultMetrics: ['reach', 'impressions', 'brand_mentions'],
    icon: '📢'
  },
  { 
    value: 'engagement', 
    label: 'Tương tác', 
    description: 'Tăng lượng tương tác từ khán giả',
    defaultMetrics: ['likes', 'comments', 'shares', 'engagement_rate'],
    icon: '💬'
  },
  { 
    value: 'conversion', 
    label: 'Chuyển đổi', 
    description: 'Tăng leads và doanh số',
    defaultMetrics: ['clicks', 'ctr', 'leads', 'sales'],
    icon: '🎯'
  },
  { 
    value: 'retention', 
    label: 'Giữ chân khách hàng', 
    description: 'Duy trì và tăng loyalty',
    defaultMetrics: ['engagement_rate', 'comments', 'shares'],
    icon: '🤝'
  },
  { 
    value: 'launch', 
    label: 'Ra mắt sản phẩm', 
    description: 'Chiến dịch launch mới',
    defaultMetrics: ['reach', 'engagement_rate', 'clicks', 'sales'],
    icon: '🚀'
  },
];

export const CAMPAIGN_STATUSES: { 
  value: CampaignStatus; 
  label: string; 
  color: string;
  bgColor: string;
}[] = [
  { value: 'draft', label: 'Nháp', color: 'text-muted-foreground', bgColor: 'bg-muted' },
  { value: 'planning', label: 'Đang lên kế hoạch', color: 'text-blue-600', bgColor: 'bg-blue-500/20' },
  { value: 'active', label: 'Đang chạy', color: 'text-green-600', bgColor: 'bg-green-500/20' },
  { value: 'paused', label: 'Tạm dừng', color: 'text-yellow-600', bgColor: 'bg-yellow-500/20' },
  { value: 'completed', label: 'Hoàn thành', color: 'text-purple-600', bgColor: 'bg-purple-500/20' },
  { value: 'cancelled', label: 'Đã hủy', color: 'text-destructive', bgColor: 'bg-destructive/20' },
];

export const MILESTONE_STATUSES: { 
  value: MilestoneStatus; 
  label: string; 
  color: string;
  bgColor: string;
}[] = [
  { value: 'pending', label: 'Chờ thực hiện', color: 'text-muted-foreground', bgColor: 'bg-muted' },
  { value: 'in_progress', label: 'Đang thực hiện', color: 'text-blue-600', bgColor: 'bg-blue-500/20' },
  { value: 'completed', label: 'Hoàn thành', color: 'text-green-600', bgColor: 'bg-green-500/20' },
  { value: 'missed', label: 'Trễ deadline', color: 'text-destructive', bgColor: 'bg-destructive/20' },
];

export const KPI_METRICS: { 
  value: CampaignMetric; 
  label: string; 
  unit: string; 
  category: string;
  icon: string;
}[] = [
  // Reach
  { value: 'reach', label: 'Reach', unit: '', category: 'Tiếp cận', icon: '👁' },
  { value: 'impressions', label: 'Impressions', unit: '', category: 'Tiếp cận', icon: '📊' },
  { value: 'brand_mentions', label: 'Brand Mentions', unit: '', category: 'Tiếp cận', icon: '📣' },
  // Engagement
  { value: 'likes', label: 'Likes', unit: '', category: 'Tương tác', icon: '👍' },
  { value: 'comments', label: 'Comments', unit: '', category: 'Tương tác', icon: '💬' },
  { value: 'shares', label: 'Shares', unit: '', category: 'Tương tác', icon: '↗️' },
  { value: 'saves', label: 'Saves', unit: '', category: 'Tương tác', icon: '🔖' },
  { value: 'engagement_rate', label: 'Engagement Rate', unit: '%', category: 'Tương tác', icon: '📈' },
  // Conversion
  { value: 'clicks', label: 'Clicks', unit: '', category: 'Chuyển đổi', icon: '🖱️' },
  { value: 'ctr', label: 'CTR', unit: '%', category: 'Chuyển đổi', icon: '🎯' },
  { value: 'leads', label: 'Leads', unit: '', category: 'Chuyển đổi', icon: '📋' },
  { value: 'sales', label: 'Sales', unit: '', category: 'Chuyển đổi', icon: '💰' },
  { value: 'revenue', label: 'Doanh thu', unit: 'VND', category: 'Chuyển đổi', icon: '💵' },
];

// =============================================
// Helper functions
// =============================================

export function getCampaignTypeConfig(type: CampaignType) {
  return CAMPAIGN_TYPES.find(t => t.value === type) ?? CAMPAIGN_TYPES[0];
}

export function getCampaignStatusConfig(status: CampaignStatus) {
  return CAMPAIGN_STATUSES.find(s => s.value === status) ?? CAMPAIGN_STATUSES[0];
}

export function getMilestoneStatusConfig(status: MilestoneStatus) {
  return MILESTONE_STATUSES.find(s => s.value === status) ?? MILESTONE_STATUSES[0];
}

export function getKPIMetricConfig(metric: CampaignMetric) {
  return KPI_METRICS.find(m => m.value === metric);
}

export function calculateCampaignProgress(campaign: Campaign): number {
  if (!campaign.goals || campaign.goals.length === 0) return 0;
  
  const totalProgress = campaign.goals.reduce((sum, goal) => {
    const progress = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
    return sum + Math.min(progress, 100);
  }, 0);
  
  return Math.round(totalProgress / campaign.goals.length);
}

export function getCampaignDaysRemaining(endDate: string): number {
  const end = new Date(endDate);
  const now = new Date();
  const diffTime = end.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function isCampaignActive(campaign: Campaign): boolean {
  const now = new Date();
  const start = new Date(campaign.start_date);
  const end = new Date(campaign.end_date);
  return campaign.status === 'active' && now >= start && now <= end;
}

export function formatBudget(amount: number | null, currency: string = 'VND'): string {
  if (amount === null) return '-';
  
  if (currency === 'VND') {
    if (amount >= 1_000_000_000) {
      return `${(amount / 1_000_000_000).toFixed(1)}B`;
    }
    if (amount >= 1_000_000) {
      return `${(amount / 1_000_000).toFixed(1)}M`;
    }
    if (amount >= 1_000) {
      return `${(amount / 1_000).toFixed(0)}K`;
    }
    return amount.toLocaleString('vi-VN');
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatMetricValue(value: number, unit?: string): string {
  if (unit === '%') {
    return `${value.toFixed(1)}%`;
  }
  
  if (unit === 'VND') {
    return formatBudget(value, 'VND');
  }
  
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  
  return value.toLocaleString('vi-VN');
}

// =============================================
// Milestone Generation
// =============================================

export function generateDefaultMilestones(startDate: string, endDate: string): MilestoneFormData[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  const milestones: MilestoneFormData[] = [];
  
  // Campaign Launch
  milestones.push({
    title: 'Khởi động chiến dịch',
    description: 'Bắt đầu triển khai content theo kế hoạch',
    due_date: startDate,
  });
  
  // Mid-campaign review (if > 7 days)
  if (durationDays > 7) {
    const midDate = new Date(start.getTime() + (end.getTime() - start.getTime()) / 2);
    milestones.push({
      title: 'Đánh giá giữa kỳ',
      description: 'Review hiệu suất và điều chỉnh nếu cần',
      due_date: midDate.toISOString().split('T')[0],
    });
  }
  
  // Peak moment (if > 14 days)
  if (durationDays > 14) {
    const peakDate = new Date(end.getTime() - 3 * 24 * 60 * 60 * 1000);
    milestones.push({
      title: 'Cao điểm chiến dịch',
      description: 'Đẩy mạnh content và promotion',
      due_date: peakDate.toISOString().split('T')[0],
    });
  }
  
  // Campaign wrap-up
  milestones.push({
    title: 'Tổng kết chiến dịch',
    description: 'Đánh giá kết quả và báo cáo',
    due_date: endDate,
  });
  
  return milestones;
}

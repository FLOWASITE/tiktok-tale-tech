import { Database } from '@/integrations/supabase/types';

type AdCopy = Database['public']['Tables']['ad_copies']['Row'];

export type SequenceType = 'funnel' | 'retargeting' | 'launch' | 'seasonal';
export type SequenceStatus = 'draft' | 'active' | 'paused' | 'completed';
export type FunnelStageName = 'awareness' | 'consideration' | 'conversion' | 'retention';

export interface AdSequence {
  id: string;
  organization_id: string;
  brand_template_id?: string | null;
  campaign_id?: string | null;
  
  name: string;
  description?: string | null;
  sequence_type: SequenceType;
  status: SequenceStatus;
  
  stages?: AdSequenceStage[];
  
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdSequenceStage {
  id: string;
  sequence_id: string;
  
  stage_name: string;
  stage_order: number;
  stage_label?: string | null;
  
  delay_days: number;
  duration_days: number;
  budget_percentage: number;
  
  audience_adjustments?: {
    retarget_previous?: boolean;
    exclude_converters?: boolean;
    narrow_interests?: string[];
  } | null;
  
  notes?: string | null;
  created_at: string;
  
  // Joined data
  ad_copies?: AdCopyWithStageInfo[];
}

export interface AdCopyWithStageInfo {
  id: string;
  stage_copy_id: string;
  sort_order: number;
  is_primary: boolean;
  ad_copy: Partial<AdCopy>;
}

export interface AdSequenceFormData {
  name: string;
  description?: string;
  sequence_type: SequenceType;
  brand_template_id?: string;
  campaign_id?: string;
}

export interface StageFormData {
  stage_name: string;
  stage_label?: string;
  delay_days: number;
  duration_days: number;
  budget_percentage: number;
  notes?: string;
  audience_adjustments?: {
    retarget_previous?: boolean;
    exclude_converters?: boolean;
  };
}

export const SEQUENCE_TYPES = [
  { 
    value: 'funnel' as SequenceType, 
    label: 'Sales Funnel', 
    description: 'TOFU → MOFU → BOFU', 
    icon: 'Layers',
    stages: ['awareness', 'consideration', 'conversion', 'retention']
  },
  { 
    value: 'retargeting' as SequenceType, 
    label: 'Retargeting', 
    description: 'Nhắm lại người đã tương tác', 
    icon: 'RotateCw',
    stages: ['engagement', 'reminder', 'urgency', 'last_chance']
  },
  { 
    value: 'launch' as SequenceType, 
    label: 'Product Launch', 
    description: 'Chuỗi ra mắt sản phẩm', 
    icon: 'Rocket',
    stages: ['teaser', 'announcement', 'launch', 'followup']
  },
  { 
    value: 'seasonal' as SequenceType, 
    label: 'Seasonal', 
    description: 'Campaign mùa vụ', 
    icon: 'Calendar',
    stages: ['pre_event', 'during_event', 'flash_sale', 'post_event']
  },
];

export const FUNNEL_STAGE_CONFIGS: Record<string, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  defaultBudget: number;
  defaultDuration: number;
  description: string;
}> = {
  // Sales Funnel stages
  awareness: { 
    label: 'Nhận biết', 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-50 border-blue-200',
    icon: 'Eye', 
    defaultBudget: 30, 
    defaultDuration: 7,
    description: 'Tăng nhận diện thương hiệu, tiếp cận đối tượng mới'
  },
  consideration: { 
    label: 'Cân nhắc', 
    color: 'text-yellow-600', 
    bgColor: 'bg-yellow-50 border-yellow-200',
    icon: 'Scale', 
    defaultBudget: 35, 
    defaultDuration: 7,
    description: 'Cung cấp thông tin, build trust với đối tượng tiềm năng'
  },
  conversion: { 
    label: 'Chuyển đổi', 
    color: 'text-green-600', 
    bgColor: 'bg-green-50 border-green-200',
    icon: 'ShoppingCart', 
    defaultBudget: 30, 
    defaultDuration: 7,
    description: 'Thúc đẩy hành động mua hàng, đăng ký'
  },
  retention: { 
    label: 'Giữ chân', 
    color: 'text-purple-600', 
    bgColor: 'bg-purple-50 border-purple-200',
    icon: 'Heart', 
    defaultBudget: 5, 
    defaultDuration: 14,
    description: 'Chăm sóc, upsell khách hàng hiện tại'
  },
  
  // Retargeting stages
  engagement: {
    label: 'Tương tác lại',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
    icon: 'MousePointerClick',
    defaultBudget: 25,
    defaultDuration: 3,
    description: 'Nhắc nhở người đã xem sản phẩm'
  },
  reminder: {
    label: 'Nhắc nhở',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 border-yellow-200',
    icon: 'Bell',
    defaultBudget: 30,
    defaultDuration: 4,
    description: 'Gửi thông điệp nhắc nhở giỏ hàng'
  },
  urgency: {
    label: 'Tạo khẩn cấp',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 border-orange-200',
    icon: 'Clock',
    defaultBudget: 30,
    defaultDuration: 3,
    description: 'Tạo cảm giác khan hiếm, urgency'
  },
  last_chance: {
    label: 'Cơ hội cuối',
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200',
    icon: 'AlertTriangle',
    defaultBudget: 15,
    defaultDuration: 2,
    description: 'Offer cuối cùng trước khi hết deal'
  },
  
  // Launch stages
  teaser: {
    label: 'Teaser',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 border-indigo-200',
    icon: 'Eye',
    defaultBudget: 20,
    defaultDuration: 7,
    description: 'Gây tò mò về sản phẩm sắp ra mắt'
  },
  announcement: {
    label: 'Công bố',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
    icon: 'Megaphone',
    defaultBudget: 35,
    defaultDuration: 3,
    description: 'Công bố chính thức sản phẩm mới'
  },
  launch: {
    label: 'Ra mắt',
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200',
    icon: 'Rocket',
    defaultBudget: 35,
    defaultDuration: 7,
    description: 'Push sales trong ngày launch'
  },
  followup: {
    label: 'Follow-up',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 border-purple-200',
    icon: 'MessageSquare',
    defaultBudget: 10,
    defaultDuration: 7,
    description: 'Chăm sóc sau launch, thu thập feedback'
  },
  
  // Seasonal stages
  pre_event: {
    label: 'Pre-event',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
    icon: 'CalendarClock',
    defaultBudget: 25,
    defaultDuration: 7,
    description: 'Build hype trước sự kiện'
  },
  during_event: {
    label: 'During Event',
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200',
    icon: 'Flame',
    defaultBudget: 40,
    defaultDuration: 3,
    description: 'Push max trong ngày sự kiện'
  },
  flash_sale: {
    label: 'Flash Sale',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 border-orange-200',
    icon: 'Zap',
    defaultBudget: 25,
    defaultDuration: 1,
    description: 'Flash deal giờ vàng'
  },
  post_event: {
    label: 'Post-event',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50 border-gray-200',
    icon: 'CheckCircle',
    defaultBudget: 10,
    defaultDuration: 3,
    description: 'Dọn dẹp, remarketing sau event'
  },
};

export const SEQUENCE_STATUS_CONFIG: Record<SequenceStatus, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  draft: { label: 'Bản nháp', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  active: { label: 'Đang chạy', color: 'text-green-600', bgColor: 'bg-green-100' },
  paused: { label: 'Tạm dừng', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  completed: { label: 'Hoàn thành', color: 'text-blue-600', bgColor: 'bg-blue-100' },
};

// Helper to get default stages for a sequence type
export function getDefaultStages(type: SequenceType): StageFormData[] {
  const sequenceType = SEQUENCE_TYPES.find(t => t.value === type);
  if (!sequenceType) return [];
  
  let delayDays = 0;
  return sequenceType.stages.map((stageName, index) => {
    const config = FUNNEL_STAGE_CONFIGS[stageName] || {
      label: stageName,
      defaultBudget: 25,
      defaultDuration: 7,
    };
    
    const stage: StageFormData = {
      stage_name: stageName,
      stage_label: config.label,
      delay_days: delayDays,
      duration_days: config.defaultDuration,
      budget_percentage: config.defaultBudget,
    };
    
    delayDays += config.defaultDuration;
    return stage;
  });
}

// Helper to calculate total duration
export function calculateTotalDuration(stages: AdSequenceStage[]): number {
  return stages.reduce((total, stage) => total + stage.duration_days, 0);
}

// Helper to validate budget allocation
export function validateBudgetAllocation(stages: StageFormData[]): boolean {
  const total = stages.reduce((sum, stage) => sum + stage.budget_percentage, 0);
  return total === 100;
}

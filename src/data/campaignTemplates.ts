import { CampaignType, CampaignGoal, MilestoneFormData, CampaignMetric, KPI_METRICS } from '@/types/campaign';

export interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  campaign_type: CampaignType;
  duration_days: number;
  suggested_channels: string[];
  suggested_goals: {
    metric: CampaignMetric;
    target_suggestion: number;
  }[];
  milestones: {
    title: string;
    description: string;
    day_offset: number; // Days from start date
  }[];
  tips: string[];
}

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: 'tet',
    name: 'Tết Nguyên Đán',
    description: 'Chiến dịch marketing mùa Tết với nội dung ấm áp, gia đình',
    icon: '🧧',
    color: 'bg-red-500/20 text-red-600 border-red-200',
    campaign_type: 'engagement',
    duration_days: 30,
    suggested_channels: ['facebook', 'tiktok', 'zalo', 'instagram'],
    suggested_goals: [
      { metric: 'reach', target_suggestion: 500000 },
      { metric: 'engagement_rate', target_suggestion: 5 },
      { metric: 'shares', target_suggestion: 10000 },
      { metric: 'brand_mentions', target_suggestion: 1000 },
    ],
    milestones: [
      { title: 'Teaser campaign', description: 'Tung content hint về chương trình Tết', day_offset: 0 },
      { title: 'Chương trình khuyến mãi', description: 'Công bố deal Tết chính thức', day_offset: 7 },
      { title: 'Cao điểm 23 tháng Chạp', description: 'Content ông Công ông Táo', day_offset: 14 },
      { title: 'Giao thừa', description: 'Content chúc mừng năm mới', day_offset: 21 },
      { title: 'Mùng 1-3 Tết', description: 'Content chúc xuân, minigame lì xì', day_offset: 23 },
      { title: 'Tổng kết chiến dịch', description: 'Báo cáo hiệu suất Tết', day_offset: 30 },
    ],
    tips: [
      'Sử dụng màu đỏ, vàng - tone màu may mắn',
      'Nội dung gia đình, sum vầy, tri ân',
      'Minigame lì xì online thu hút tương tác',
      'Đăng bài vào giờ vàng: 11h-13h, 20h-22h',
    ],
  },
  {
    id: 'black-friday',
    name: 'Black Friday',
    description: 'Chiến dịch giảm giá lớn cuối năm với flash sales và deals độc quyền',
    icon: '🛒',
    color: 'bg-slate-800/20 text-slate-700 border-slate-300',
    campaign_type: 'conversion',
    duration_days: 14,
    suggested_channels: ['facebook', 'instagram', 'email', 'tiktok'],
    suggested_goals: [
      { metric: 'clicks', target_suggestion: 50000 },
      { metric: 'leads', target_suggestion: 5000 },
      { metric: 'sales', target_suggestion: 1000 },
      { metric: 'revenue', target_suggestion: 500000000 },
    ],
    milestones: [
      { title: 'Warm-up campaign', description: 'Tạo hype và email list building', day_offset: 0 },
      { title: 'Early access VIP', description: 'Ưu đãi sớm cho khách hàng thân thiết', day_offset: 5 },
      { title: 'Black Friday', description: 'Ngày sale chính - flash deals mỗi giờ', day_offset: 10 },
      { title: 'Cyber Monday', description: 'Tiếp tục deal online', day_offset: 13 },
      { title: 'Tổng kết', description: 'Báo cáo doanh số và insights', day_offset: 14 },
    ],
    tips: [
      'Countdown timer tạo urgency',
      'Flash sale mỗi 2-3 giờ giữ traffic',
      'Retargeting ads cho giỏ hàng bỏ dở',
      'Email reminder trước 24h và 1h',
    ],
  },
  {
    id: 'product-launch',
    name: 'Ra mắt sản phẩm',
    description: 'Chiến dịch launch sản phẩm/dịch vụ mới với buzz và hype',
    icon: '🚀',
    color: 'bg-purple-500/20 text-purple-600 border-purple-200',
    campaign_type: 'launch',
    duration_days: 21,
    suggested_channels: ['facebook', 'instagram', 'youtube', 'tiktok', 'linkedin'],
    suggested_goals: [
      { metric: 'reach', target_suggestion: 1000000 },
      { metric: 'engagement_rate', target_suggestion: 4 },
      { metric: 'clicks', target_suggestion: 30000 },
      { metric: 'leads', target_suggestion: 3000 },
    ],
    milestones: [
      { title: 'Teaser phase', description: 'Hint về sản phẩm mới, tạo tò mò', day_offset: 0 },
      { title: 'Influencer seeding', description: 'Gửi sản phẩm cho KOLs review', day_offset: 5 },
      { title: 'Countdown', description: 'Đếm ngược 3 ngày đến launch', day_offset: 11 },
      { title: 'Launch Day', description: 'Công bố chính thức, livestream, PR', day_offset: 14 },
      { title: 'Post-launch boost', description: 'UGC, testimonials, case studies', day_offset: 17 },
      { title: 'Tổng kết', description: 'Đánh giá hiệu suất launch', day_offset: 21 },
    ],
    tips: [
      'Tạo landing page riêng cho sản phẩm',
      'Livestream launch tăng engagement',
      'Hợp tác KOLs phù hợp ngành hàng',
      'Tạo hashtag riêng cho chiến dịch',
    ],
  },
  {
    id: 'brand-awareness',
    name: 'Xây dựng thương hiệu',
    description: 'Tăng độ nhận biết thương hiệu với nội dung giá trị và storytelling',
    icon: '💫',
    color: 'bg-blue-500/20 text-blue-600 border-blue-200',
    campaign_type: 'awareness',
    duration_days: 30,
    suggested_channels: ['facebook', 'instagram', 'youtube', 'linkedin'],
    suggested_goals: [
      { metric: 'reach', target_suggestion: 2000000 },
      { metric: 'impressions', target_suggestion: 5000000 },
      { metric: 'brand_mentions', target_suggestion: 2000 },
      { metric: 'engagement_rate', target_suggestion: 3 },
    ],
    milestones: [
      { title: 'Brand story series', description: 'Launch video/bài viết về câu chuyện thương hiệu', day_offset: 0 },
      { title: 'Behind-the-scenes', description: 'Content hậu trường, con người', day_offset: 7 },
      { title: 'Customer spotlight', description: 'Testimonials và case studies', day_offset: 14 },
      { title: 'Community engagement', description: 'Q&A, AMA sessions', day_offset: 21 },
      { title: 'Tổng kết', description: 'Đánh giá brand metrics', day_offset: 30 },
    ],
    tips: [
      'Consistent visual identity across channels',
      'Authentic storytelling > hard sell',
      'Engage with comments and messages',
      'Collaborate with aligned brands/causes',
    ],
  },
  {
    id: 'summer-sale',
    name: 'Summer Sale',
    description: 'Chiến dịch mùa hè với tone màu tươi sáng và deals mát mẻ',
    icon: '☀️',
    color: 'bg-orange-500/20 text-orange-600 border-orange-200',
    campaign_type: 'conversion',
    duration_days: 21,
    suggested_channels: ['facebook', 'instagram', 'tiktok', 'email'],
    suggested_goals: [
      { metric: 'reach', target_suggestion: 800000 },
      { metric: 'clicks', target_suggestion: 40000 },
      { metric: 'sales', target_suggestion: 800 },
      { metric: 'revenue', target_suggestion: 300000000 },
    ],
    milestones: [
      { title: 'Summer vibes teaser', description: 'Content mùa hè, vacation mood', day_offset: 0 },
      { title: 'Early bird deals', description: 'Ưu đãi sớm cho subscribers', day_offset: 5 },
      { title: 'Flash sales', description: 'Deal hot mỗi ngày', day_offset: 10 },
      { title: 'Final countdown', description: 'Last chance deals', day_offset: 18 },
      { title: 'Tổng kết', description: 'Báo cáo hiệu suất', day_offset: 21 },
    ],
    tips: [
      'Màu sắc tươi sáng: vàng, cam, xanh biển',
      'Content liên quan travel, vacation',
      'Bundle deals cho mùa hè',
      'UGC contest với hashtag mùa hè',
    ],
  },
  {
    id: 'back-to-school',
    name: 'Back to School',
    description: 'Chiến dịch mùa tựu trường với deals cho học sinh, sinh viên',
    icon: '📚',
    color: 'bg-emerald-500/20 text-emerald-600 border-emerald-200',
    campaign_type: 'conversion',
    duration_days: 21,
    suggested_channels: ['facebook', 'tiktok', 'instagram', 'zalo'],
    suggested_goals: [
      { metric: 'reach', target_suggestion: 600000 },
      { metric: 'clicks', target_suggestion: 25000 },
      { metric: 'leads', target_suggestion: 2000 },
      { metric: 'sales', target_suggestion: 500 },
    ],
    milestones: [
      { title: 'Countdown to school', description: 'Content chuẩn bị năm học mới', day_offset: 0 },
      { title: 'Student deals', description: 'Ưu đãi đặc biệt cho học sinh, sinh viên', day_offset: 5 },
      { title: 'Parent promotions', description: 'Deals cho phụ huynh', day_offset: 10 },
      { title: 'Last-minute rush', description: 'Deal cuối cùng trước khai giảng', day_offset: 18 },
      { title: 'Tổng kết', description: 'Báo cáo hiệu suất chiến dịch', day_offset: 21 },
    ],
    tips: [
      'Target cả học sinh lẫn phụ huynh',
      'Content tips học tập, organization',
      'Collab với education influencers',
      'Bundle deals theo combo môn học',
    ],
  },
];

// Helper function to generate goals from template
export function generateGoalsFromTemplate(template: CampaignTemplate): CampaignGoal[] {
  return template.suggested_goals.map(sg => {
    const metricConfig = KPI_METRICS.find(m => m.value === sg.metric);
    return {
      metric: sg.metric,
      label: metricConfig?.label || sg.metric,
      target: sg.target_suggestion,
      current: 0,
      unit: metricConfig?.unit,
    };
  });
}

// Helper function to generate milestones from template based on start date
export function generateMilestonesFromTemplate(
  template: CampaignTemplate, 
  startDate: string
): MilestoneFormData[] {
  const start = new Date(startDate);
  
  return template.milestones.map(m => {
    const dueDate = new Date(start);
    dueDate.setDate(dueDate.getDate() + m.day_offset);
    
    return {
      title: m.title,
      description: m.description,
      due_date: dueDate.toISOString().split('T')[0],
    };
  });
}

// Helper function to calculate end date from template
export function calculateEndDate(startDate: string, template: CampaignTemplate): string {
  const start = new Date(startDate);
  start.setDate(start.getDate() + template.duration_days);
  return start.toISOString().split('T')[0];
}

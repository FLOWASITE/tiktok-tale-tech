import { CustomerPersona } from './customerPersona';

export interface SavedAudience {
  id: string;
  organization_id: string;
  brand_template_id?: string | null;
  name: string;
  description?: string | null;
  
  // Demographics
  age_min?: number | null;
  age_max?: number | null;
  genders: string[];
  locations: string[];
  languages: string[];
  
  // Targeting
  interests: string[];
  behaviors: string[];
  life_events: string[];
  
  // Advanced
  income_levels: string[];
  education_levels: string[];
  relationship_statuses: string[];
  device_types: string[];
  
  // Exclusions
  exclude_interests: string[];
  exclude_behaviors: string[];
  
  // Lookalike
  lookalike_source?: string | null;
  lookalike_percentage?: number | null;
  
  // Persona link
  source_persona_id?: string | null;
  source_persona?: CustomerPersona;
  
  // Estimated reach
  estimated_reach_min?: number | null;
  estimated_reach_max?: number | null;
  last_reach_check?: string | null;
  
  usage_count: number;
  is_favorite: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AudienceFormData {
  name: string;
  description?: string;
  age_min?: number;
  age_max?: number;
  genders: string[];
  locations: string[];
  languages: string[];
  interests: string[];
  behaviors: string[];
  life_events: string[];
  income_levels: string[];
  education_levels: string[];
  device_types: string[];
  exclude_interests: string[];
  exclude_behaviors: string[];
  lookalike_source?: string;
  lookalike_percentage?: number;
  source_persona_id?: string;
}

// Constants for targeting options
export const INTEREST_CATEGORIES = [
  { 
    category: 'Kinh doanh', 
    interests: ['Marketing', 'Khởi nghiệp', 'Thương mại điện tử', 'SME', 'Startup', 'Bất động sản', 'Đầu tư'] 
  },
  { 
    category: 'Công nghệ', 
    interests: ['Digital Marketing', 'Mạng xã hội', 'Phần mềm', 'Ứng dụng di động', 'AI/ML', 'Blockchain'] 
  },
  { 
    category: 'Lifestyle', 
    interests: ['Thời trang', 'Làm đẹp', 'Sức khỏe', 'Fitness', 'Du lịch', 'Ẩm thực', 'Nội thất'] 
  },
  { 
    category: 'Giáo dục', 
    interests: ['Học online', 'Phát triển bản thân', 'Chứng chỉ nghề', 'Ngoại ngữ', 'Kỹ năng mềm'] 
  },
  { 
    category: 'Tài chính', 
    interests: ['Đầu tư chứng khoán', 'Bất động sản', 'Bảo hiểm', 'Ngân hàng', 'Crypto', 'Tiết kiệm'] 
  },
  {
    category: 'Giải trí',
    interests: ['Gaming', 'Âm nhạc', 'Phim ảnh', 'Sách', 'Thể thao', 'Esports']
  }
];

export const BEHAVIOR_OPTIONS = [
  { value: 'online_shoppers', label: 'Mua hàng online thường xuyên' },
  { value: 'engaged_shoppers', label: 'Tương tác cao với quảng cáo' },
  { value: 'mobile_heavy', label: 'Sử dụng mobile nhiều' },
  { value: 'video_watchers', label: 'Xem video thường xuyên' },
  { value: 'early_adopters', label: 'Early adopters công nghệ' },
  { value: 'frequent_travelers', label: 'Du lịch thường xuyên' },
  { value: 'premium_buyers', label: 'Mua hàng cao cấp' },
  { value: 'deal_seekers', label: 'Săn deal, khuyến mãi' },
  { value: 'brand_loyal', label: 'Trung thành với thương hiệu' },
  { value: 'impulse_buyers', label: 'Mua hàng ngẫu hứng' },
];

export const LIFE_EVENT_OPTIONS = [
  { value: 'recently_moved', label: 'Vừa chuyển nhà' },
  { value: 'newlywed', label: 'Mới kết hôn' },
  { value: 'new_parent', label: 'Mới có con' },
  { value: 'new_job', label: 'Vừa có việc làm mới' },
  { value: 'graduation', label: 'Mới tốt nghiệp' },
  { value: 'birthday_soon', label: 'Sắp sinh nhật' },
  { value: 'anniversary_soon', label: 'Sắp kỷ niệm' },
  { value: 'retirement', label: 'Sắp nghỉ hưu' },
];

export const VIETNAM_LOCATIONS = [
  { value: 'vietnam', label: 'Toàn quốc Việt Nam' },
  { value: 'hcm', label: 'TP. Hồ Chí Minh' },
  { value: 'hanoi', label: 'Hà Nội' },
  { value: 'danang', label: 'Đà Nẵng' },
  { value: 'cantho', label: 'Cần Thơ' },
  { value: 'haiphong', label: 'Hải Phòng' },
  { value: 'bienhoa', label: 'Biên Hòa' },
  { value: 'nhatrang', label: 'Nha Trang' },
  { value: 'dalat', label: 'Đà Lạt' },
  { value: 'vungtau', label: 'Vũng Tàu' },
  { value: 'hue', label: 'Huế' },
  { value: 'quangninh', label: 'Quảng Ninh' },
];

export const GENDER_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
];

export const INCOME_LEVEL_OPTIONS = [
  { value: 'low', label: 'Thu nhập thấp (< 10tr)' },
  { value: 'medium', label: 'Thu nhập trung bình (10-25tr)' },
  { value: 'high', label: 'Thu nhập cao (25-50tr)' },
  { value: 'very_high', label: 'Thu nhập rất cao (> 50tr)' },
];

export const EDUCATION_LEVEL_OPTIONS = [
  { value: 'high_school', label: 'THPT' },
  { value: 'college', label: 'Cao đẳng' },
  { value: 'university', label: 'Đại học' },
  { value: 'postgraduate', label: 'Sau đại học' },
];

export const DEVICE_TYPE_OPTIONS = [
  { value: 'mobile', label: 'Mobile' },
  { value: 'desktop', label: 'Desktop' },
  { value: 'tablet', label: 'Tablet' },
];

export const LOOKALIKE_SOURCE_OPTIONS = [
  { value: 'customers', label: 'Khách hàng hiện tại' },
  { value: 'converters', label: 'Người đã chuyển đổi' },
  { value: 'website_visitors', label: 'Người truy cập website' },
  { value: 'engaged_users', label: 'Người tương tác fanpage' },
];

// Helper to format audience summary
export function formatAudienceSummary(audience: SavedAudience | AudienceFormData): string {
  const parts: string[] = [];
  
  // Gender
  if ('genders' in audience && audience.genders.length > 0 && !audience.genders.includes('all')) {
    const genderLabels = audience.genders.map(g => 
      GENDER_OPTIONS.find(o => o.value === g)?.label || g
    );
    parts.push(genderLabels.join(', '));
  }
  
  // Age
  const ageMin = 'age_min' in audience ? audience.age_min : undefined;
  const ageMax = 'age_max' in audience ? audience.age_max : undefined;
  if (ageMin || ageMax) {
    parts.push(`${ageMin || '13'}-${ageMax || '65+'}t`);
  }
  
  // Location
  if ('locations' in audience && audience.locations.length > 0) {
    const locationLabels = audience.locations.slice(0, 2).map(l => 
      VIETNAM_LOCATIONS.find(o => o.value === l)?.label || l
    );
    parts.push(locationLabels.join(', '));
  }
  
  // Interests
  if ('interests' in audience && audience.interests.length > 0) {
    parts.push(`quan tâm ${audience.interests.slice(0, 2).join(', ')}`);
  }
  
  return parts.join(' • ') || 'Chưa có thông tin';
}

// Helper to estimate reach (mock)
export function estimateReach(audience: AudienceFormData): { min: number; max: number } {
  let baseReach = 5000000; // 5M base for Vietnam
  
  // Reduce by age range
  const ageRange = (audience.age_max || 65) - (audience.age_min || 18);
  baseReach *= (ageRange / 50);
  
  // Reduce by gender
  if (audience.genders.length === 1 && !audience.genders.includes('all')) {
    baseReach *= 0.5;
  }
  
  // Reduce by location
  if (audience.locations.length > 0 && !audience.locations.includes('vietnam')) {
    baseReach *= 0.1 * audience.locations.length;
  }
  
  // Reduce by interests
  if (audience.interests.length > 0) {
    baseReach *= Math.max(0.1, 1 - (audience.interests.length * 0.15));
  }
  
  // Reduce by behaviors
  if (audience.behaviors.length > 0) {
    baseReach *= Math.max(0.1, 1 - (audience.behaviors.length * 0.1));
  }
  
  const min = Math.max(10000, Math.floor(baseReach * 0.7));
  const max = Math.floor(baseReach * 1.3);
  
  return { min, max };
}

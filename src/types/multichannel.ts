export type ContentGoal = 
  | 'education'      // Giáo dục
  | 'awareness'      // Nhận diện  
  | 'engagement'     // Tăng tương tác
  | 'expertise'      // Xây chuyên gia
  | 'conversion';    // Chuyển đổi

export type Channel = 
  | 'website'
  | 'facebook'
  | 'instagram'
  | 'twitter'
  | 'google_maps'
  | 'linkedin'
  | 'email'
  | 'youtube'
  | 'zalo_oa'
  | 'telegram';

export interface MultiChannelContent {
  id: string;
  title: string;
  topic: string;
  industry: string | null;
  content_goal: ContentGoal;
  selected_channels: Channel[];
  brand_template_id: string | null;
  brand_name: string;
  brand_guideline: string | null;
  primary_color: string | null;
  website_content: string | null;
  facebook_content: string | null;
  instagram_content: string | null;
  twitter_content: string | null;
  google_maps_content: string | null;
  linkedin_content: string | null;
  email_content: string | null;
  youtube_content: string | null;
  zalo_oa_content: string | null;
  telegram_content: string | null;
  created_at: string;
  updated_at: string;
}

export interface MultiChannelFormData {
  topic: string;
  industry?: string;
  contentGoal: ContentGoal;
  channels: Channel[];
  brandTemplateId?: string;
}

export const CONTENT_GOALS: { value: ContentGoal; label: string; description: string }[] = [
  { value: 'education', label: 'Giáo dục', description: 'Chia sẻ kiến thức, hướng dẫn' },
  { value: 'awareness', label: 'Nhận diện', description: 'Tăng nhận biết thương hiệu' },
  { value: 'engagement', label: 'Tương tác', description: 'Khuyến khích bình luận, chia sẻ' },
  { value: 'expertise', label: 'Xây chuyên gia', description: 'Thể hiện chuyên môn sâu' },
  { value: 'conversion', label: 'Chuyển đổi', description: 'Thúc đẩy hành động mua hàng' },
];

export const CHANNELS: { value: Channel; label: string; icon: string; color: string; category: string }[] = [
  // Content Platforms
  { value: 'website', label: 'Website/Blog', icon: 'Globe', color: 'blue', category: 'content' },
  { value: 'youtube', label: 'YouTube', icon: 'Youtube', color: 'red', category: 'content' },
  // Social Media
  { value: 'facebook', label: 'Facebook', icon: 'Facebook', color: 'indigo', category: 'social' },
  { value: 'instagram', label: 'Instagram', icon: 'Instagram', color: 'pink', category: 'social' },
  { value: 'twitter', label: 'X (Twitter)', icon: 'Twitter', color: 'slate', category: 'social' },
  { value: 'linkedin', label: 'LinkedIn', icon: 'Linkedin', color: 'sky', category: 'social' },
  // Direct
  { value: 'email', label: 'Email', icon: 'Mail', color: 'amber', category: 'direct' },
  { value: 'zalo_oa', label: 'Zalo OA', icon: 'MessageCircle', color: 'blue', category: 'direct' },
  { value: 'telegram', label: 'Telegram', icon: 'Send', color: 'sky', category: 'direct' },
  // Local
  { value: 'google_maps', label: 'Google Maps', icon: 'MapPin', color: 'green', category: 'local' },
];

import { GraduationCap, Eye, MessageCircle, Award, Target, LucideIcon } from 'lucide-react';

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
  | 'telegram'
  | 'tiktok'
  | 'threads';

export type ContentStatus = 'draft' | 'review' | 'approved' | 'published';

export interface ChannelImage {
  url: string;
  prompt: string;
  provider: string;
  generatedAt: string;
}

export type ChannelImages = Partial<Record<Channel, ChannelImage>>;

// Status riêng cho từng channel
export type ChannelStatuses = Partial<Record<Channel, ContentStatus>>;

// Helper function to calculate master status from channel statuses
export const calculateMasterStatus = (channelStatuses: ChannelStatuses, selectedChannels: Channel[]): ContentStatus => {
  const statuses = selectedChannels.map(ch => channelStatuses[ch]).filter(Boolean) as ContentStatus[];
  if (statuses.length === 0) return 'draft';
  if (statuses.every(s => s === 'published')) return 'published';
  if (statuses.every(s => s === 'approved' || s === 'published')) return 'approved';
  if (statuses.some(s => s === 'review')) return 'review';
  return 'draft';
};

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
  tiktok_content: string | null;
  threads_content: string | null;
  channel_images: ChannelImages;
  channel_statuses: ChannelStatuses;
  tags: string[];
  status: ContentStatus;
  priority: string | null;
  deadline: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EditedPreview {
  original: string;
  edited: string;
}

export type EditedPreviews = Record<string, EditedPreview>;

export interface MultiChannelFormData {
  topic: string;
  industry?: string;
  contentGoal: ContentGoal;
  channels: Channel[];
  brandTemplateId?: string;
  editedPreviews?: EditedPreviews;
}

export const CONTENT_GOALS: { value: ContentGoal; label: string; description: string; icon: LucideIcon }[] = [
  { value: 'education', label: 'Giáo dục', description: 'Chia sẻ kiến thức, hướng dẫn', icon: GraduationCap },
  { value: 'awareness', label: 'Nhận diện', description: 'Tăng nhận biết thương hiệu', icon: Eye },
  { value: 'engagement', label: 'Tương tác', description: 'Khuyến khích bình luận, chia sẻ', icon: MessageCircle },
  { value: 'expertise', label: 'Xây chuyên gia', description: 'Thể hiện chuyên môn sâu', icon: Award },
  { value: 'conversion', label: 'Chuyển đổi', description: 'Thúc đẩy hành động mua hàng', icon: Target },
];

export const CONTENT_STATUSES: { value: ContentStatus; label: string; color: string; bgClass: string; textClass: string; borderClass: string }[] = [
  { value: 'draft', label: 'Bản nháp', color: 'gray', bgClass: 'bg-slate-500/15', textClass: 'text-slate-600 dark:text-slate-400', borderClass: 'border-slate-500/30' },
  { value: 'review', label: 'Chờ duyệt', color: 'yellow', bgClass: 'bg-amber-500/15', textClass: 'text-amber-600 dark:text-amber-400', borderClass: 'border-amber-500/30' },
  { value: 'approved', label: 'Đã duyệt', color: 'blue', bgClass: 'bg-blue-500/15', textClass: 'text-blue-600 dark:text-blue-400', borderClass: 'border-blue-500/30' },
  { value: 'published', label: 'Đã đăng', color: 'green', bgClass: 'bg-emerald-500/15', textClass: 'text-emerald-600 dark:text-emerald-400', borderClass: 'border-emerald-500/30' },
];

export const CHANNELS: { value: Channel; label: string; icon: string; color: string; category: string; description: string }[] = [
  // Content Platforms
  { value: 'website', label: 'Website/Blog', icon: 'Globe', color: 'blue', category: 'content', description: 'Bài viết dài, SEO friendly, có CTA' },
  { value: 'youtube', label: 'YouTube', icon: 'Youtube', color: 'red', category: 'content', description: 'Script video, mô tả, tags tối ưu' },
  // Social Media
  { value: 'facebook', label: 'Facebook', icon: 'Facebook', color: 'indigo', category: 'social', description: 'Post ngắn, hashtag, emoji phù hợp' },
  { value: 'instagram', label: 'Instagram', icon: 'Instagram', color: 'pink', category: 'social', description: 'Caption ngắn, 20-30 hashtag' },
  { value: 'tiktok', label: 'TikTok', icon: 'Music2', color: 'pink', category: 'social', description: 'Script video ngắn 15-60s, hook 3 giây' },
  { value: 'threads', label: 'Threads', icon: 'AtSign', color: 'slate', category: 'social', description: 'Text-based, tối đa 500 ký tự' },
  { value: 'twitter', label: 'X (Twitter)', icon: 'Twitter', color: 'slate', category: 'social', description: 'Tối đa 280 ký tự, hashtag tinh gọn' },
  { value: 'linkedin', label: 'LinkedIn', icon: 'Linkedin', color: 'sky', category: 'social', description: 'Chuyên nghiệp, không emoji quá nhiều' },
  // Direct
  { value: 'email', label: 'Email', icon: 'Mail', color: 'amber', category: 'direct', description: 'Subject + body, CTA rõ ràng' },
  { value: 'zalo_oa', label: 'Zalo OA', icon: 'MessageCircle', color: 'blue', category: 'direct', description: 'Tin nhắn ngắn, thân thiện' },
  { value: 'telegram', label: 'Telegram', icon: 'Send', color: 'sky', category: 'direct', description: 'Markdown, link preview' },
  // Local
  { value: 'google_maps', label: 'Google Maps', icon: 'MapPin', color: 'green', category: 'local', description: 'Bài đăng ngắn cho doanh nghiệp' },
];

// Sample topic suggestions by industry
export const TOPIC_SUGGESTIONS: string[] = [
  'Xu hướng thị trường 2024 và cách tận dụng cơ hội',
  '5 sai lầm phổ biến khi mới bắt đầu và cách tránh',
  'Case study thành công từ khách hàng thực tế',
  'Hướng dẫn từng bước cho người mới bắt đầu',
  'So sánh các giải pháp phổ biến trên thị trường',
  'Mẹo tiết kiệm chi phí hiệu quả',
];

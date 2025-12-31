// ============================================
// TopicAIChatbot Constants
// ============================================

// Character limit for input
export const MAX_CHARS = 500;

// Pull-to-refresh threshold in pixels
export const PULL_THRESHOLD = 80;

// Available reaction emojis
export const REACTION_EMOJIS = ['👍', '❤️', '🔥', '💡', '👏'];

// Chat API URL
export const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-topics`;

// Welcome message displayed on first load
export const WELCOME_MESSAGE = `Xin chào! 👋 Tôi là **AI Content Strategist** của Flowa.

Tôi có thể giúp bạn tạo:
🎬 **TikTok Script** - Kịch bản video với movement và dialogue chi tiết
📸 **Carousel** - Prompt hình ảnh cho Facebook/TikTok slides  
📱 **Multi-Channel** - Nội dung Website, Facebook, Instagram, X, Google Maps

💡 **Tip:** Chọn Brand Template ở trên để tôi hiểu rõ tone of voice, personas mục tiêu và sản phẩm đã liên kết của bạn.

Bạn muốn tạo content gì hôm nay? ✨`;

// Onboarding steps
export const ONBOARDING_STEPS = [
  {
    title: 'Chào mừng đến AI Chat! 🎉',
    description: 'Đây là nơi bạn có thể trò chuyện với AI để nhận gợi ý topic sáng tạo cho nội dung.',
    position: 'center' as const,
  },
  {
    title: 'Chọn Brand Template 🎨',
    description: 'Chọn brand ở trên để AI hiểu tone of voice, personas mục tiêu và sản phẩm của bạn.',
    position: 'top' as const,
  },
  {
    title: 'Trò chuyện tự nhiên 💬',
    description: 'Hỏi AI bất cứ điều gì về ý tưởng nội dung. AI sẽ gợi ý topics phù hợp với brand.',
    position: 'bottom' as const,
  },
  {
    title: 'Quick Actions ⚡',
    description: 'Sử dụng các nút quick action để nhận gợi ý nhanh theo các danh mục phổ biến.',
    position: 'bottom' as const,
  },
];

// Storage key generators
export const getStorageKey = (brandTemplateId?: string) => 
  `topic-chat-${brandTemplateId || 'default'}`;

export const getArtifactsStorageKey = (brandTemplateId?: string) => 
  `topic-artifacts-${brandTemplateId || 'default'}`;

export const getOnboardingKey = () => 'topic-chat-onboarding-seen';

// Category mapping for topic saving
export const TOPIC_CATEGORY_MAP: Record<string, string> = {
  awareness: 'awareness',
  engagement: 'engagement', 
  conversion: 'conversion',
  education: 'educational',
  entertainment: 'entertainment',
  viral: 'viral',
  seasonal: 'seasonal',
  trending: 'trending',
};

// Navigation paths for topic actions
export const TOPIC_ACTION_PATHS = {
  multichannel: '/multichannel',
  script: '/scripts',
  carousel: '/carousel',
} as const;

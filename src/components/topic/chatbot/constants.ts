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

// Welcome message key (use i18n key instead of hardcoded string)
export const WELCOME_MESSAGE_KEY = 'chatbot.welcome';

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
  script: '/videos?tab=scripts',
  carousel: '/carousel',
} as const;

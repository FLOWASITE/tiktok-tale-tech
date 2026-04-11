import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AIProviderConfig {
  id: string;
  organizationId: string | null;
  providerType: string;
  displayName: string;
  isActive: boolean;
  apiKeySecretName: string | null;
  baseUrl: string | null;
  defaultModel: string | null;
  config: Record<string, any>;
  encryptedApiKey: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AIFunctionConfig {
  id: string;
  organizationId: string | null;
  functionName: string;
  providerConfigId: string | null;
  modelOverride: string | null;
  parameters: Record<string, any>;
  isEnabled: boolean;
  cacheTtlHours: number;
  priorityLevel: string;
  temperature: number | null;
  maxTokens: number | null;
  customSystemPrompt: string | null;
  forceProvider: string | null;
  createdAt: string;
  updatedAt: string;
}

// Function types for model filtering
export type AIFunctionType = 'text' | 'image' | 'image-direct' | 'search';

// Function tags for categorization
export type AIFunctionTag = 'knowledge-graph' | 'regulation' | 'embedding' | 'crawl';

// Known AI functions in the project with type metadata
export const AI_FUNCTIONS = [
  // Text Generation Functions (Lovable AI) - Content
  { name: 'generate-multichannel', description: 'Tạo nội dung đa kênh', category: 'content', type: 'text' as AIFunctionType, currentModel: 'google/gemini-3-pro-preview' },
  { name: 'generate-core-content', description: 'Tạo Core Content chất lượng cao', category: 'content', type: 'text' as AIFunctionType, currentModel: 'google/gemini-3-pro-preview' },
  { name: 'generate-script', description: 'Tạo kịch bản video', category: 'content', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'generate-carousel', description: 'Tạo carousel slides', category: 'content', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'generate-hooks', description: 'Tạo hook hấp dẫn', category: 'content', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'generate-journey-messaging', description: 'Tạo messaging theo journey', category: 'content', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'generate-sample-text', description: 'Tạo text mẫu', category: 'content', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'generate-storyboard', description: 'Tạo storyboard', category: 'content', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'ai-edit-channel', description: 'AI edit cho kênh', category: 'content', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'refine-content', description: 'Tinh chỉnh nội dung', category: 'content', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'improve-script', description: 'Cải thiện kịch bản video', category: 'content', type: 'text' as AIFunctionType, currentModel: 'google/gemini-3-flash-preview' },
  { name: 'optimize-social-text', description: 'Tối ưu text cho mạng xã hội', category: 'content', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash-lite' },
  { name: 'extract-broll-keywords', description: 'Trích xuất keywords B-roll', category: 'content', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'generate-video', description: 'Tạo/enhance mô tả video', category: 'content', type: 'text' as AIFunctionType, currentModel: 'google/gemini-3-flash-preview' },
  { name: 'generate-ad-copy', description: 'Tạo ad copy đa nền tảng', category: 'content', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'suggest-ad-fix', description: 'Đề xuất sửa ad copy', category: 'content', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'optimize-ad-copy', description: 'Tối ưu hóa ad copy', category: 'content', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  
  // Chat Functions
  { name: 'chat-topics', description: 'AI chat assistant', category: 'chat', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'chat-conversations', description: 'Summarize conversations', category: 'chat', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash-lite' },
  { name: 'help-chatbot', description: 'Chatbot hỗ trợ người dùng', category: 'chat', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'sales-chatbot', description: 'Chatbot bán hàng AI', category: 'chat', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'summarize-conversation', description: 'Tóm tắt cuộc hội thoại', category: 'chat', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash-lite' },
  
  // Analysis Functions
  { name: 'analyze-script', description: 'Phân tích kịch bản', category: 'analysis', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'critique-content', description: 'Đánh giá nội dung', category: 'analysis', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash-lite' },
  { name: 'geo-score-content', description: 'Chấm điểm GEO (AI Visibility)', category: 'analysis', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'geo-generate-schema', description: 'Tạo JSON-LD schema markup', category: 'analysis', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash-lite' },
  { name: 'clarify-campaign-intent', description: 'Làm rõ ý định chiến dịch', category: 'analysis', type: 'text' as AIFunctionType, currentModel: 'google/gemini-3-flash-preview' },
  { name: 'validate-seamless-consistency', description: 'Kiểm tra tính nhất quán nội dung', category: 'analysis', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'geo-scan-brand', description: 'Quét thương hiệu trên AI Search', category: 'analysis', type: 'search' as AIFunctionType, currentModel: 'sonar' },
  { name: 'geo-generate-prompts', description: 'Tạo prompts cho GEO monitoring', category: 'analysis', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'geo-track-competitors', description: 'Theo dõi đối thủ cạnh tranh', category: 'analysis', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash-lite' },
  { name: 'kpi-ai', description: 'AI phân tích và gợi ý KPI', category: 'analysis', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'analyze-dashboard-insights', description: 'Phân tích insights từ dashboard', category: 'analysis', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'learn-from-edits', description: 'Học từ chỉnh sửa của user', category: 'analysis', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash-lite' },
  { name: 'learn-from-feedback', description: 'Học từ feedback của user', category: 'analysis', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash-lite' },
  { name: 'predict-ad-performance', description: 'Dự đoán hiệu quả quảng cáo', category: 'analysis', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'score-ad-creative', description: 'Chấm điểm creative quảng cáo', category: 'analysis', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'analyze-regulation-impact', description: 'Phân tích ảnh hưởng quy định', category: 'analysis', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash', tags: ['knowledge-graph', 'regulation'] as AIFunctionTag[] },
  { name: 'categorize-industries', description: 'Phân loại ngành nghề', category: 'analysis', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash-lite', tags: ['knowledge-graph'] as AIFunctionTag[] },
  
  // Ideation Functions
  { name: 'topic-ai', description: 'Topic AI (suggest, refine, trending, analysis)', category: 'ideation', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'auto-suggest-connections', description: 'Gợi ý kết nối tự động', category: 'ideation', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash-lite', tags: ['knowledge-graph'] as AIFunctionTag[] },
  
  // Brand Functions
  { name: 'generate-brand-voice', description: 'Tạo brand voice', category: 'brand', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'generate-brand-guideline', description: 'Tạo brand guideline', category: 'brand', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'enrich-industry-profiles', description: 'Làm giàu profile ngành', category: 'brand', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash', tags: ['knowledge-graph'] as AIFunctionTag[] },
  { name: 'enrich-personas', description: 'Làm giàu personas', category: 'brand', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash', tags: ['knowledge-graph'] as AIFunctionTag[] },
  { name: 'generate-missing-profiles', description: 'Tạo profiles còn thiếu', category: 'brand', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash', tags: ['knowledge-graph'] as AIFunctionTag[] },
  { name: 'regenerate-profiles', description: 'Tái tạo profiles', category: 'brand', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash', tags: ['knowledge-graph'] as AIFunctionTag[] },
  
  // Image Generation Functions  
  { name: 'generate-brand-image', description: 'Tạo hình ảnh thương hiệu', category: 'image', type: 'image' as AIFunctionType, currentModel: 'google/gemini-3-pro-image-preview' },
  { name: 'edit-image-background', description: 'Chỉnh sửa nền ảnh', category: 'image', type: 'image' as AIFunctionType, currentModel: 'google/gemini-2.5-flash-image' },
  { name: 'overlay-brand-logo', description: 'Overlay logo', category: 'image', type: 'image' as AIFunctionType, currentModel: 'google/gemini-3-pro-image-preview' },
  { name: 'generate-carousel-image', description: 'Tạo hình carousel', category: 'image', type: 'image' as AIFunctionType, currentModel: 'google/gemini-3-pro-image-preview' },
  { name: 'decompose-image-request', description: 'Phân tách yêu cầu hình ảnh', category: 'image', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash' },
  { name: 'generate-scene-thumbnail', description: 'Tạo thumbnail cho scene', category: 'image', type: 'image' as AIFunctionType, currentModel: 'google/gemini-3-pro-image-preview' },
  
  // Research & Search Functions
  { name: 'firecrawl-trends', description: 'Crawl và phân tích trends', category: 'research', type: 'search' as AIFunctionType, currentModel: 'sonar-pro' },
  { name: 'semantic-search', description: 'Tìm kiếm ngữ nghĩa', category: 'research', type: 'search' as AIFunctionType, currentModel: 'sonar', tags: ['knowledge-graph', 'embedding'] as AIFunctionTag[] },
  { name: 'help-article-search', description: 'Tìm kiếm bài viết hỗ trợ', category: 'research', type: 'search' as AIFunctionType, currentModel: 'sonar', tags: ['embedding'] as AIFunctionTag[] },
  { name: 'generate-embedding', description: 'Tạo embeddings cho semantic search', category: 'research', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash-lite', tags: ['embedding'] as AIFunctionTag[] },
  
  // Knowledge Graph & Regulations
  { name: 'auto-crawl-regulations', description: 'Crawl quy định tự động', category: 'research', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash', tags: ['knowledge-graph', 'regulation', 'crawl'] as AIFunctionTag[] },
  { name: 'extract-knowledge-entities', description: 'Trích xuất entities từ knowledge', category: 'research', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash-lite', tags: ['knowledge-graph', 'regulation'] as AIFunctionTag[] },
  { name: 'extract-regulation-content', description: 'Trích xuất nội dung quy định', category: 'research', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash', tags: ['knowledge-graph', 'regulation'] as AIFunctionTag[] },
  { name: 'generate-knowledge-embeddings', description: 'Tạo embeddings cho knowledge graph', category: 'research', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash-lite', tags: ['knowledge-graph', 'embedding'] as AIFunctionTag[] },
  { name: 'parse-regulation-document', description: 'Parse document quy định', category: 'research', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash', tags: ['knowledge-graph', 'regulation'] as AIFunctionTag[] },
  { name: 'reparse-regulations', description: 'Reparse quy định', category: 'research', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash', tags: ['knowledge-graph', 'regulation'] as AIFunctionTag[] },
  { name: 'reparse-with-quality', description: 'Reparse với quality check', category: 'research', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash', tags: ['knowledge-graph', 'regulation'] as AIFunctionTag[] },
  { name: 'batch-generate-embeddings', description: 'Tạo embeddings hàng loạt', category: 'research', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash-lite', tags: ['knowledge-graph', 'embedding'] as AIFunctionTag[] },
  
  // Utility - Data Operations
  { name: 'migrate-to-knowledge-graph', description: 'Migrate dữ liệu sang knowledge graph', category: 'utility', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash', tags: ['knowledge-graph'] as AIFunctionTag[] },
  { name: 'apply-regulation-propagation', description: 'Áp dụng propagation quy định', category: 'utility', type: 'text' as AIFunctionType, currentModel: 'google/gemini-2.5-flash-lite', tags: ['knowledge-graph', 'regulation'] as AIFunctionTag[] },
] as const;

// Models by function type for filtering
export const MODELS_BY_TYPE: Record<AIFunctionType, string[]> = {
  text: [
    'google/gemini-3-pro-preview',
    'google/gemini-2.5-pro',
    'google/gemini-2.5-flash',
    'google/gemini-2.5-flash-lite',
    'openai/gpt-5',
    'openai/gpt-5-mini',
    'openai/gpt-5-nano',
    // DashScope (Alibaba Cloud)
    'qwen-plus',
    'qwen-max',
    'qwen-turbo',
    'qwen-vl-max',
    'qwen-long',
  ],
  image: [
    // Lovable AI models
    'google/gemini-3-pro-image-preview',
    'google/gemini-2.5-flash-image',
    // KIE.ai models
    'flux-kontext-pro',
    'flux-kontext-max',
    'gpt-image-1',
    'gpt-image-1.5',
    'flux-2/pro-text-to-image',
    'flux-2/flex-text-to-image',
    'flux-2/pro-image-to-image',
    'flux-2/flex-image-to-image',
    'nano-banana',
    'nano-banana-edit',
    'nano-banana-pro',
    'grok-imagine/text-to-image',
    'grok-imagine/image-to-image',
    // PoYo.ai models
    'poyo/nano-banana-2-new',
    'poyo/nano-banana-2-new-edit',
    'poyo/nano-banana-2',
    'poyo/nano-banana-2-edit',
    'poyo/gpt-4o-image',
    'poyo/gpt-4o-image-edit',
    'poyo/gpt-image-1.5',
    'poyo/z-image',
    'poyo/flux-2-pro',
    'poyo/flux-2-pro-edit',
    'poyo/flux-2-flex',
    'poyo/flux-2-flex-edit',
    'poyo/seedream-4.5',
    'poyo/seedream-4.5-edit',
    'poyo/grok-imagine',
    'geminigen/nano-banana-pro',
    'geminigen/nano-banana-2',
    'geminigen/imagen-4',
  ],
  'image-direct': [
    'google/gemini-3-pro-image-preview',
    'google/gemini-2.5-flash-image',
  ],
  search: [
    'sonar-pro',
    'sonar',
  ],
};

// Detailed model information for UI display
export type ModelSpeed = 'fast' | 'medium' | 'slow';
export type ModelQuality = 'standard' | 'high' | 'premium';
export type ModelCost = 'low' | 'medium' | 'high';

export interface ModelInfo {
  shortName: string;
  description: string;
  speed: ModelSpeed;
  quality: ModelQuality;
  cost: ModelCost;
  bestFor: string[];
  provider: 'lovable' | 'openrouter' | 'kie' | 'poyo' | 'dashscope' | 'geminigen';
  isRecommended?: boolean;
}

export const MODEL_INFO: Record<string, ModelInfo> = {
  // Lovable AI - Google Gemini
  'google/gemini-2.5-flash': {
    shortName: 'Gemini 2.5 Flash',
    description: 'Cân bằng tốc độ và chất lượng',
    speed: 'fast',
    quality: 'high',
    cost: 'low',
    bestFor: ['Nội dung chung', 'Phản hồi nhanh'],
    provider: 'lovable',
    isRecommended: true,
  },
  'google/gemini-2.5-flash-lite': {
    shortName: 'Gemini 2.5 Lite',
    description: 'Nhanh nhất, tiết kiệm nhất',
    speed: 'fast',
    quality: 'standard',
    cost: 'low',
    bestFor: ['Tác vụ đơn giản', 'Phân loại'],
    provider: 'lovable',
  },
  'google/gemini-2.5-pro': {
    shortName: 'Gemini 2.5 Pro',
    description: 'Suy luận phức tạp, ngữ cảnh dài',
    speed: 'medium',
    quality: 'premium',
    cost: 'medium',
    bestFor: ['Phân tích phức tạp', 'Context dài'],
    provider: 'lovable',
  },
  'google/gemini-3-pro-preview': {
    shortName: 'Gemini 3 Pro',
    description: 'Thế hệ mới nhất, tính năng tiên tiến',
    speed: 'medium',
    quality: 'premium',
    cost: 'medium',
    bestFor: ['Tác vụ nâng cao', 'Tính năng mới'],
    provider: 'lovable',
  },
  'google/gemini-3-pro-image-preview': {
    shortName: 'Gemini 3 Image',
    description: 'Tạo hình ảnh thế hệ mới',
    speed: 'medium',
    quality: 'premium',
    cost: 'medium',
    bestFor: ['Tạo hình ảnh', 'Visual content'],
    provider: 'lovable',
  },
  // Lovable AI - OpenAI
  'openai/gpt-5': {
    shortName: 'GPT-5',
    description: 'Mạnh nhất, đa năng nhất',
    speed: 'slow',
    quality: 'premium',
    cost: 'high',
    bestFor: ['Phân tích phức tạp', 'Nội dung tinh tế'],
    provider: 'lovable',
  },
  'openai/gpt-5-mini': {
    shortName: 'GPT-5 Mini',
    description: 'Mạnh với chi phí hợp lý',
    speed: 'medium',
    quality: 'high',
    cost: 'medium',
    bestFor: ['Nội dung chất lượng', 'Cân bằng chi phí'],
    provider: 'lovable',
  },
  'openai/gpt-5-nano': {
    shortName: 'GPT-5 Nano',
    description: 'Nhanh và tiết kiệm',
    speed: 'fast',
    quality: 'standard',
    cost: 'low',
    bestFor: ['Khối lượng lớn', 'Tác vụ đơn giản'],
    provider: 'lovable',
  },
  // Perplexity Search
  'sonar-pro': {
    shortName: 'Sonar Pro',
    description: 'Web search chuyên sâu',
    speed: 'medium',
    quality: 'premium',
    cost: 'medium',
    bestFor: ['Research', 'Trending topics'],
    provider: 'lovable',
  },
  'sonar': {
    shortName: 'Sonar',
    description: 'Web search nhanh',
    speed: 'fast',
    quality: 'high',
    cost: 'low',
    bestFor: ['Quick search', 'Topic ideas'],
    provider: 'lovable',
  },
  // Image generation - Lovable AI
  'gemini-2.0-flash-exp-image-generation': {
    shortName: 'Gemini 2.0 Image',
    description: 'Tạo hình ảnh trực tiếp',
    speed: 'fast',
    quality: 'high',
    cost: 'low',
    bestFor: ['Carousel images', 'Quick visuals'],
    provider: 'lovable',
  },
  'google/gemini-2.5-flash-image': {
    shortName: 'Gemini Flash Image',
    description: 'Tạo & chỉnh sửa ảnh nhanh (Nano Banana)',
    speed: 'fast',
    quality: 'high',
    cost: 'low',
    bestFor: ['Background editing', 'Quick generation'],
    provider: 'lovable',
  },
  // KIE.ai Image Models
  'flux-kontext-pro': {
    shortName: 'Flux Kontext Pro',
    description: 'Text-to-image + editing chất lượng cao, giá rẻ',
    speed: 'medium',
    quality: 'high',
    cost: 'low',
    bestFor: ['Brand images', 'Social media', 'Image editing'],
    provider: 'kie',
    isRecommended: true,
  },
  'flux-kontext-max': {
    shortName: 'Flux Kontext Max',
    description: 'Flux chất lượng cao nhất, cảnh phức tạp',
    speed: 'slow',
    quality: 'premium',
    cost: 'medium',
    bestFor: ['Complex scenes', 'High detail'],
    provider: 'kie',
  },
  'gpt-image-1': {
    shortName: 'GPT-Image-1',
    description: 'OpenAI, render text & instruction tốt nhất',
    speed: 'medium',
    quality: 'premium',
    cost: 'medium',
    bestFor: ['Text in image', 'Brand logos', 'Precise editing'],
    provider: 'kie',
  },
  'gpt-image-1.5': {
    shortName: 'GPT-Image-1.5',
    description: 'Flagship mới nhất OpenAI, chất lượng đỉnh',
    speed: 'slow',
    quality: 'premium',
    cost: 'high',
    bestFor: ['Premium brand', 'Highest quality'],
    provider: 'kie',
  },
  'flux-2/pro-text-to-image': {
    shortName: 'Flux 2 Pro',
    description: 'Flux 2 Pro text-to-image, chất lượng cao',
    speed: 'medium',
    quality: 'premium',
    cost: 'medium',
    bestFor: ['High quality', 'Complex scenes'],
    provider: 'kie',
  },
  'flux-2/flex-text-to-image': {
    shortName: 'Flux 2 Flex',
    description: 'Flux 2 Flex text-to-image, nhanh & linh hoạt',
    speed: 'fast',
    quality: 'high',
    cost: 'low',
    bestFor: ['Fast generation', 'Social media'],
    provider: 'kie',
  },
  'flux-2/pro-image-to-image': {
    shortName: 'Flux 2 Pro Edit',
    description: 'Flux 2 Pro image-to-image editing',
    speed: 'medium',
    quality: 'premium',
    cost: 'medium',
    bestFor: ['Image editing', 'Style transfer'],
    provider: 'kie',
  },
  'flux-2/flex-image-to-image': {
    shortName: 'Flux 2 Flex Edit',
    description: 'Flux 2 Flex image-to-image editing',
    speed: 'fast',
    quality: 'high',
    cost: 'low',
    bestFor: ['Quick edits', 'Batch processing'],
    provider: 'kie',
  },
  'nano-banana': {
    shortName: 'Nano Banana 2K',
    description: 'Gemini 3 image, 2K resolution',
    speed: 'fast',
    quality: 'high',
    cost: 'low',
    bestFor: ['2K images', 'Fast generation'],
    provider: 'kie',
  },
  'nano-banana-edit': {
    shortName: 'Nano Banana Edit',
    description: 'Nano Banana image editing variant',
    speed: 'fast',
    quality: 'high',
    cost: 'low',
    bestFor: ['Image editing', 'Quick refinement'],
    provider: 'kie',
  },
  'nano-banana-pro': {
    shortName: 'Nano Banana 4K',
    description: 'Gemini 3 Pro image, 4K ultra resolution',
    speed: 'medium',
    quality: 'premium',
    cost: 'medium',
    bestFor: ['4K images', 'Print quality'],
    provider: 'kie',
    isRecommended: true,
  },
  'grok-imagine/text-to-image': {
    shortName: 'Grok Imagine',
    description: 'xAI Grok text-to-image generation',
    speed: 'medium',
    quality: 'high',
    cost: 'medium',
    bestFor: ['Creative images', 'Artistic style'],
    provider: 'kie',
  },
  'grok-imagine/image-to-image': {
    shortName: 'Grok Imagine Edit',
    description: 'xAI Grok image-to-image editing',
    speed: 'medium',
    quality: 'high',
    cost: 'medium',
    bestFor: ['Image editing', 'Style transfer'],
    provider: 'kie',
  },
  // PoYo.ai Image Models
  'poyo/nano-banana-2-new': {
    shortName: 'Nano Banana 2',
    description: 'Gemini 3.1 Flash, 2K/4K, nhanh, $0.025',
    speed: 'fast',
    quality: 'premium',
    cost: 'low',
    bestFor: ['Fast generation', '2K/4K images', 'Cost-effective'],
    provider: 'poyo',
    isRecommended: true,
  },
  'poyo/nano-banana-2-new-edit': {
    shortName: 'Nano Banana 2 Edit',
    description: 'Edit variant, Gemini 3.1 Flash, 2K/4K',
    speed: 'fast',
    quality: 'premium',
    cost: 'low',
    bestFor: ['Image editing', '2K/4K refinement'],
    provider: 'poyo',
  },
  'poyo/nano-banana-2': {
    shortName: 'Nano Banana Pro',
    description: 'Gemini 3 Pro Image, 4K, text rendering',
    speed: 'medium',
    quality: 'premium',
    cost: 'low',
    bestFor: ['4K images', 'Text rendering', 'Multi-language'],
    provider: 'poyo',
  },
  'poyo/nano-banana-2-edit': {
    shortName: 'Nano Banana Pro Edit',
    description: 'Edit variant, multi-image composition',
    speed: 'medium',
    quality: 'premium',
    cost: 'low',
    bestFor: ['Image editing', '4K refinement'],
    provider: 'poyo',
  },
  'poyo/gpt-4o-image': {
    shortName: 'GPT-4o Image',
    description: 'OpenAI image gen qua PoYo gateway',
    speed: 'medium',
    quality: 'premium',
    cost: 'medium',
    bestFor: ['Brand images', 'Social media'],
    provider: 'poyo',
  },
  'poyo/gpt-4o-image-edit': {
    shortName: 'GPT-4o Image Edit',
    description: 'Advanced editing với mask support',
    speed: 'medium',
    quality: 'premium',
    cost: 'medium',
    bestFor: ['Mask editing', 'Inpainting'],
    provider: 'poyo',
  },
  'poyo/gpt-image-1.5': {
    shortName: 'GPT Image 1.5',
    description: 'Mới nhất, nhanh 4x so với 1.0',
    speed: 'fast',
    quality: 'premium',
    cost: 'medium',
    bestFor: ['Premium brand', 'Fastest quality'],
    provider: 'poyo',
  },
  'poyo/z-image': {
    shortName: 'Z-Image',
    description: 'Alibaba, sub-second generation',
    speed: 'fast',
    quality: 'high',
    cost: 'low',
    bestFor: ['Quick drafts', 'High volume'],
    provider: 'poyo',
  },
  'poyo/flux-2-pro': {
    shortName: 'Flux 2 Pro',
    description: 'Black Forest Labs, photorealistic',
    speed: 'medium',
    quality: 'premium',
    cost: 'medium',
    bestFor: ['Photorealistic', 'Complex scenes'],
    provider: 'poyo',
  },
  'poyo/flux-2-pro-edit': {
    shortName: 'Flux 2 Pro Edit',
    description: 'Multi-reference editing (8 ảnh)',
    speed: 'slow',
    quality: 'premium',
    cost: 'medium',
    bestFor: ['Multi-reference', 'Product editing'],
    provider: 'poyo',
  },
  'poyo/flux-2-flex': {
    shortName: 'Flux 2 Flex',
    description: 'Adjustable speed vs quality',
    speed: 'fast',
    quality: 'high',
    cost: 'low',
    bestFor: ['Quick generation', 'Flexible quality'],
    provider: 'poyo',
  },
  'poyo/flux-2-flex-edit': {
    shortName: 'Flux 2 Flex Edit',
    description: 'Flexible editing, tốc độ cao',
    speed: 'fast',
    quality: 'high',
    cost: 'low',
    bestFor: ['Quick editing', 'Flexible'],
    provider: 'poyo',
  },
  'poyo/seedream-4.5': {
    shortName: 'Seedream 4.5',
    description: 'ByteDance, hỗ trợ 4K',
    speed: 'medium',
    quality: 'premium',
    cost: 'medium',
    bestFor: ['4K images', 'High resolution'],
    provider: 'poyo',
  },
  'poyo/seedream-4.5-edit': {
    shortName: 'Seedream 4.5 Edit',
    description: 'ByteDance edit variant, 4K',
    speed: 'medium',
    quality: 'high',
    cost: 'medium',
    bestFor: ['4K editing', 'Commercial photos'],
    provider: 'poyo',
  },
  'poyo/grok-imagine': {
    shortName: 'Grok Imagine',
    description: 'xAI Aurora, creative styles',
    speed: 'medium',
    quality: 'high',
    cost: 'medium',
    bestFor: ['Creative', 'Artistic styles'],
    provider: 'poyo',
  },
  // GeminiGen.ai Models
  'geminigen/nano-banana-pro': {
    shortName: 'Nano Banana Pro',
    description: 'Gemini 3 Pro image generation, premium quality',
    speed: 'medium',
    quality: 'premium',
    cost: 'medium',
    bestFor: ['Premium images', 'High quality generation'],
    provider: 'geminigen',
    isRecommended: true,
  },
  'geminigen/nano-banana-2': {
    shortName: 'Nano Banana 2',
    description: 'Gemini 3.1 Flash image generation, fast',
    speed: 'fast',
    quality: 'high',
    cost: 'low',
    bestFor: ['Fast generation', 'Batch processing'],
    provider: 'geminigen',
  },
  'geminigen/imagen-4': {
    shortName: 'Imagen 4',
    description: 'Google Imagen 4, high quality photorealistic',
    speed: 'slow',
    quality: 'premium',
    cost: 'high',
    bestFor: ['Photorealistic', 'High fidelity'],
    provider: 'geminigen',
  },
  // DashScope (Alibaba Cloud) Models
  'qwen-plus': {
    shortName: 'Qwen Plus',
    description: 'Cân bằng tốc độ & chất lượng, đa ngôn ngữ',
    speed: 'medium',
    quality: 'high',
    cost: 'low',
    bestFor: ['Nội dung đa ngôn ngữ', 'Chat', 'Phân tích'],
    provider: 'dashscope',
    isRecommended: true,
  },
  'qwen-max': {
    shortName: 'Qwen Max',
    description: 'Mạnh nhất Qwen, suy luận phức tạp',
    speed: 'slow',
    quality: 'premium',
    cost: 'medium',
    bestFor: ['Suy luận phức tạp', 'Nội dung cao cấp', 'Chiến lược'],
    provider: 'dashscope',
  },
  'qwen-turbo': {
    shortName: 'Qwen Turbo',
    description: 'Nhanh nhất, chi phí thấp nhất',
    speed: 'fast',
    quality: 'standard',
    cost: 'low',
    bestFor: ['Tác vụ đơn giản', 'Batch processing', 'Chi phí thấp'],
    provider: 'dashscope',
  },
  'qwen-vl-max': {
    shortName: 'Qwen VL Max',
    description: 'Vision-Language, phân tích hình ảnh',
    speed: 'medium',
    quality: 'premium',
    cost: 'medium',
    bestFor: ['Phân tích hình ảnh', 'Multimodal', 'OCR'],
    provider: 'dashscope',
  },
  'qwen-long': {
    shortName: 'Qwen Long',
    description: 'Context cực dài, xử lý tài liệu',
    speed: 'medium',
    quality: 'high',
    cost: 'medium',
    bestFor: ['Tài liệu dài', 'Tóm tắt', 'Research'],
    provider: 'dashscope',
  },
  // OpenRouter Models
  'anthropic/claude-sonnet-4-20250514': {
    shortName: 'Claude Sonnet 4',
    description: 'Flagship Anthropic, suy luận mạnh',
    speed: 'medium',
    quality: 'premium',
    cost: 'high',
    bestFor: ['Viết sáng tạo', 'An toàn'],
    provider: 'openrouter',
  },
  'anthropic/claude-sonnet-4.6': {
    shortName: 'Claude Sonnet 4.6',
    description: 'Sonnet mới nhất, cải thiện toàn diện',
    speed: 'medium',
    quality: 'premium',
    cost: 'high',
    bestFor: ['Viết sáng tạo', 'Coding', 'Suy luận'],
    provider: 'openrouter',
    isRecommended: true,
  },
  'anthropic/claude-sonnet-4.5': {
    shortName: 'Claude Sonnet 4.5',
    description: 'Flagship Sonnet, cân bằng xuất sắc',
    speed: 'medium',
    quality: 'premium',
    cost: 'high',
    bestFor: ['Viết sáng tạo', 'Coding'],
    provider: 'openrouter',
  },
  'anthropic/claude-opus-4.6': {
    shortName: 'Claude Opus 4.6',
    description: 'Opus mới nhất, mạnh nhất Anthropic',
    speed: 'slow',
    quality: 'premium',
    cost: 'high',
    bestFor: ['Phân tích sâu', 'Tác vụ phức tạp'],
    provider: 'openrouter',
  },
  'anthropic/claude-haiku-4.5': {
    shortName: 'Claude Haiku 4.5',
    description: 'Nhanh, giá rẻ, chất lượng tốt',
    speed: 'fast',
    quality: 'high',
    cost: 'low',
    bestFor: ['Khối lượng lớn', 'Phản hồi nhanh'],
    provider: 'openrouter',
  },
  'openai/gpt-5.4': {
    shortName: 'GPT-5.4',
    description: 'Unifies Codex + GPT, 1M context',
    speed: 'medium',
    quality: 'premium',
    cost: 'high',
    bestFor: ['Đa năng', 'Coding', 'Suy luận'],
    provider: 'openrouter',
    isRecommended: true,
  },
  'openai/gpt-5.4-pro': {
    shortName: 'GPT-5.4 Pro',
    description: 'Mạnh nhất OpenAI, unlimited reasoning',
    speed: 'slow',
    quality: 'premium',
    cost: 'high',
    bestFor: ['Phân tích sâu', 'Research'],
    provider: 'openrouter',
  },
  'openai/gpt-5.3-codex': {
    shortName: 'GPT-5.3 Codex',
    description: 'Agentic coding chuyên dụng',
    speed: 'medium',
    quality: 'premium',
    cost: 'high',
    bestFor: ['Coding', 'Automation'],
    provider: 'openrouter',
  },
  'openai/gpt-5.3-chat': {
    shortName: 'GPT-5.3 Chat',
    description: 'Chat-optimized, nhanh hơn 5.4',
    speed: 'fast',
    quality: 'premium',
    cost: 'high',
    bestFor: ['Chat', 'Nội dung sáng tạo'],
    provider: 'openrouter',
  },
  'openai/gpt-5.2': {
    shortName: 'GPT-5.2',
    description: 'Reasoning nâng cao, ổn định',
    speed: 'medium',
    quality: 'premium',
    cost: 'high',
    bestFor: ['Suy luận phức tạp', 'Coding'],
    provider: 'openrouter',
  },
  'openai/gpt-5.2-codex': {
    shortName: 'GPT-5.2 Codex',
    description: 'Chuyên coding, agentic tasks',
    speed: 'medium',
    quality: 'premium',
    cost: 'high',
    bestFor: ['Coding', 'Automation'],
    provider: 'openrouter',
  },
  'google/gemini-3.1-pro-preview': {
    shortName: 'Gemini 3.1 Pro',
    description: 'Gemini Pro mới nhất qua OpenRouter',
    speed: 'medium',
    quality: 'premium',
    cost: 'medium',
    bestFor: ['Tác vụ nâng cao', 'Multimodal'],
    provider: 'openrouter',
  },
  'google/gemini-3-flash-preview': {
    shortName: 'Gemini 3 Flash',
    description: 'Flash mới, nhanh & mạnh',
    speed: 'fast',
    quality: 'high',
    cost: 'low',
    bestFor: ['Nhanh', 'Chi phí thấp'],
    provider: 'openrouter',
  },
  'deepseek/deepseek-v3.2': {
    shortName: 'DeepSeek V3.2',
    description: 'Flagship DeepSeek mới nhất',
    speed: 'fast',
    quality: 'high',
    cost: 'low',
    bestFor: ['Chi phí thấp', 'Coding', 'Đa năng'],
    provider: 'openrouter',
    isRecommended: true,
  },
  'deepseek/deepseek-chat': {
    shortName: 'DeepSeek Chat',
    description: 'Chi phí cực thấp, chất lượng tốt',
    speed: 'fast',
    quality: 'high',
    cost: 'low',
    bestFor: ['Chi phí thấp', 'Chat'],
    provider: 'openrouter',
  },
  'moonshotai/kimi-k2.5': {
    shortName: 'Kimi K2.5',
    description: '#2 weekly, multimodal & coding',
    speed: 'medium',
    quality: 'premium',
    cost: 'low',
    bestFor: ['Coding', 'Multimodal', 'Agentic'],
    provider: 'openrouter',
  },
  'minimax/minimax-m2.5': {
    shortName: 'MiniMax M2.5',
    description: '#1 weekly ranking, coding mạnh',
    speed: 'medium',
    quality: 'premium',
    cost: 'low',
    bestFor: ['Coding', 'Reasoning', 'Chi phí thấp'],
    provider: 'openrouter',
    isRecommended: true,
  },
  'x-ai/grok-4.20-beta': {
    shortName: 'Grok 4.20',
    description: 'Flagship xAI mới nhất, 2M context',
    speed: 'fast',
    quality: 'premium',
    cost: 'medium',
    bestFor: ['Context dài', 'Agentic', 'Coding'],
    provider: 'openrouter',
    isRecommended: true,
  },
  'x-ai/grok-4.20-multi-agent-beta': {
    shortName: 'Grok 4.20 Multi-Agent',
    description: 'Multi-agent variant, 2M context',
    speed: 'fast',
    quality: 'premium',
    cost: 'medium',
    bestFor: ['Multi-agent', 'Agentic', 'Complex tasks'],
    provider: 'openrouter',
  },
  'z-ai/glm-5': {
    shortName: 'GLM-5',
    description: '#3 weekly, open source mạnh',
    speed: 'medium',
    quality: 'high',
    cost: 'low',
    bestFor: ['Coding', 'Open source'],
    provider: 'openrouter',
  },
  'meta-llama/llama-3.3-70b-instruct': {
    shortName: 'Llama 3.3 70B',
    description: 'Open source mạnh mẽ',
    speed: 'medium',
    quality: 'high',
    cost: 'low',
    bestFor: ['Chi phí thấp', 'Đa năng'],
    provider: 'openrouter',
  },
  'mistralai/mistral-large': {
    shortName: 'Mistral Large',
    description: 'Flagship của Mistral',
    speed: 'medium',
    quality: 'premium',
    cost: 'medium',
    bestFor: ['Đa ngôn ngữ', 'Reasoning'],
    provider: 'openrouter',
  },
  'qwen/qwen-2.5-72b-instruct': {
    shortName: 'Qwen 2.5 72B',
    description: 'Mạnh với tiếng Việt',
    speed: 'medium',
    quality: 'high',
    cost: 'low',
    bestFor: ['Tiếng Việt', 'Coding'],
    provider: 'openrouter',
  },
  'qwen/qwen3-coder-next': {
    shortName: 'Qwen3 Coder',
    description: 'Coder chuyên dụng thế hệ mới',
    speed: 'medium',
    quality: 'high',
    cost: 'low',
    bestFor: ['Coding', 'Lập trình'],
    provider: 'openrouter',
  },
  'qwen/qwen3.5-397b-a17b': {
    shortName: 'Qwen 3.5 397B',
    description: 'Flagship Qwen MoE, 397B params',
    speed: 'medium',
    quality: 'premium',
    cost: 'low',
    bestFor: ['Reasoning', 'Đa năng', 'Chi phí thấp'],
    provider: 'openrouter',
  },
  'qwen/qwen3.5-flash-02-23': {
    shortName: 'Qwen 3.5 Flash',
    description: 'Nhanh, tiết kiệm, Qwen thế hệ mới',
    speed: 'fast',
    quality: 'high',
    cost: 'low',
    bestFor: ['Nhanh', 'Chi phí thấp'],
    provider: 'openrouter',
  },
  'google/gemini-3.1-flash-lite-preview': {
    shortName: 'Gemini 3.1 Flash Lite',
    description: 'Nửa giá Gemini 3 Flash, nhanh',
    speed: 'fast',
    quality: 'high',
    cost: 'low',
    bestFor: ['Chi phí thấp', 'Batch processing'],
    provider: 'openrouter',
  },
  'inception/mercury-2': {
    shortName: 'Mercury 2',
    description: '1000+ tok/s diffusion LLM, siêu nhanh',
    speed: 'fast',
    quality: 'high',
    cost: 'low',
    bestFor: ['Tốc độ cực cao', 'Real-time'],
    provider: 'openrouter',
  },
  'stepfun/step-3.5-flash': {
    shortName: 'Step 3.5 Flash',
    description: '256K context, MoE architecture',
    speed: 'fast',
    quality: 'high',
    cost: 'low',
    bestFor: ['Context dài', 'Chi phí thấp'],
    provider: 'openrouter',
  },
  'bytedance-seed/seed-2.0-lite': {
    shortName: 'Seed 2.0 Lite',
    description: 'ByteDance multimodal, chi phí thấp',
    speed: 'medium',
    quality: 'high',
    cost: 'low',
    bestFor: ['Multimodal', 'Chi phí thấp'],
    provider: 'openrouter',
  },
};

// KIE.ai model prefixes - models served through kie.ai gateway
export const KIE_MODEL_PREFIXES = ['flux-kontext', 'gpt-image', 'flux-2/', 'nano-banana', 'grok-imagine'];

// Check if a model is a KIE.ai model
export const isKieModel = (modelId: string): boolean => {
  return KIE_MODEL_PREFIXES.some(prefix => modelId.startsWith(prefix));
};

// PoYo.ai model prefix
export const POYO_MODEL_PREFIXES = ['poyo/'];

// Check if a model is a PoYo.ai model
export const isPoyoModel = (modelId: string): boolean => {
  return modelId.startsWith('poyo/');
};

// DashScope model prefixes
export const DASHSCOPE_MODEL_PREFIXES = ['qwen-', 'qwen2'];

// Check if a model is a DashScope model
export const isDashScopeModel = (modelId: string): boolean => {
  return DASHSCOPE_MODEL_PREFIXES.some(prefix => modelId.startsWith(prefix));
};

// Lovable AI model prefixes - models that are served through Lovable AI gateway
export const LOVABLE_MODEL_PREFIXES = [
  'google/gemini-2.5',
  'google/gemini-3',
  'openai/gpt-5',
  'sonar',
];

export const LOVABLE_EXACT_MODELS = [
  'gemini-2.0-flash-exp-image-generation',
];

// Check if a model is a Lovable AI model
export const isLovableAIModel = (modelId: string): boolean => {
  if (LOVABLE_EXACT_MODELS.includes(modelId)) return true;
  return LOVABLE_MODEL_PREFIXES.some(prefix => modelId.startsWith(prefix));
};

// Helper to extract readable name from model ID
const extractShortName = (modelId: string): string => {
  const parts = modelId.split('/');
  if (parts.length === 2) {
    // "anthropic/claude-sonnet-4" -> "Claude Sonnet 4"
    return parts[1]
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  return modelId;
};

// Helper function to get model info with fallback
export const getModelInfo = (modelId: string): ModelInfo => {
  // First check if we have hardcoded info
  if (MODEL_INFO[modelId]) {
    return MODEL_INFO[modelId];
  }
  
  // Check KIE.ai models first (they don't follow Lovable prefix pattern)
  if (isKieModel(modelId)) {
    return {
      shortName: extractShortName(modelId),
      description: 'KIE.ai image model',
      speed: 'medium' as ModelSpeed,
      quality: 'high' as ModelQuality,
      cost: 'low' as ModelCost,
      bestFor: ['Image generation'],
      provider: 'kie',
    };
  }

  // Check PoYo.ai models
  if (isPoyoModel(modelId)) {
    return {
      shortName: extractShortName(modelId),
      description: 'PoYo.ai image model',
      speed: 'medium' as ModelSpeed,
      quality: 'high' as ModelQuality,
      cost: 'medium' as ModelCost,
      bestFor: ['Image generation'],
      provider: 'poyo',
    };
  }

  // Check GeminiGen models
  if (modelId.startsWith('geminigen/')) {
    return {
      shortName: extractShortName(modelId),
      description: 'GeminiGen.ai image model',
      speed: 'medium' as ModelSpeed,
      quality: 'premium' as ModelQuality,
      cost: 'medium' as ModelCost,
      bestFor: ['Image generation'],
      provider: 'geminigen',
    };
  }

  // Check DashScope models
  if (isDashScopeModel(modelId)) {
    return {
      shortName: extractShortName(modelId),
      description: 'DashScope (Alibaba Cloud) model',
      speed: 'medium' as ModelSpeed,
      quality: 'high' as ModelQuality,
      cost: 'low' as ModelCost,
      bestFor: ['Đa ngôn ngữ', 'Nội dung'],
      provider: 'dashscope',
    };
  }

  // Determine provider: Lovable AI models vs OpenRouter
  const isLovableModel = isLovableAIModel(modelId);
    
  return {
    shortName: extractShortName(modelId),
    description: isLovableModel ? 'Lovable AI model' : 'OpenRouter model',
    speed: 'medium' as ModelSpeed,
    quality: 'standard' as ModelQuality,
    cost: 'medium' as ModelCost,
    bestFor: [],
    provider: isLovableModel ? 'lovable' : 'openrouter',
  };
};

// Known AI providers
export const AI_PROVIDERS = [
  { type: 'lovable', name: 'Lovable AI', description: 'Built-in AI (không cần API key)', hasKey: false },
  { type: 'openrouter', name: 'OpenRouter', description: '200+ models (Claude, GPT, Llama, Mistral...)', hasKey: true },
  { type: 'perplexity', name: 'Perplexity', description: 'Web search & research', hasKey: true, secretName: 'PERPLEXITY_API_KEY' },
  { type: 'firecrawl', name: 'Firecrawl', description: 'Web scraping & trends', hasKey: true, secretName: 'FIRECRAWL_API_KEY' },
  { type: 'openai', name: 'OpenAI', description: 'GPT-4, DALL-E', hasKey: true },
  { type: 'anthropic', name: 'Anthropic', description: 'Claude models', hasKey: true },
  { type: 'gemini', name: 'Google Gemini', description: 'Gemini Pro, Flash', hasKey: true },
  { type: 'replicate', name: 'Replicate', description: 'Flux, SDXL', hasKey: true },
  { type: 'kie', name: 'KIE.ai', description: 'Flux Kontext, GPT-Image (gateway)', hasKey: true, secretName: 'KIE_API_KEY' },
  { type: 'poyo', name: 'PoYo.ai', description: 'GPT-4o Image, Z-Image, Flux 2, Seedream, Grok', hasKey: true, secretName: 'POYO_API_KEY' },
  { type: 'dashscope', name: 'DashScope (Alibaba Cloud)', description: 'Qwen Plus, Max, Turbo, VL (Singapore)', hasKey: true, secretName: 'DASHSCOPE_API_KEY' },
  { type: 'geminigen', name: 'GeminiGen.ai', description: 'Nano Banana Pro, Nano Banana 2, Imagen 4', hasKey: true, secretName: 'GEMINIGEN_API_KEY' },
  { type: 'custom', name: 'Custom API', description: 'OpenAI-compatible endpoints', hasKey: true },
] as const;

// Models by provider (legacy, kept for backward compatibility)
export const MODELS_BY_PROVIDER: Record<string, string[]> = {
  lovable: [
    'google/gemini-2.5-pro',
    'google/gemini-3-pro-preview',
    'google/gemini-2.5-flash',
    'google/gemini-2.5-flash-lite',
    'google/gemini-3-pro-image-preview',
    'openai/gpt-5',
    'openai/gpt-5-mini',
    'openai/gpt-5-nano',
  ],
  openrouter: [
    'anthropic/claude-sonnet-4.6',
    'anthropic/claude-sonnet-4.5',
    'anthropic/claude-sonnet-4-20250514',
    'anthropic/claude-opus-4.6',
    'anthropic/claude-haiku-4.5',
    'openai/gpt-5.2',
    'openai/gpt-5.2-codex',
    'google/gemini-3.1-pro-preview',
    'google/gemini-3-flash-preview',
    'deepseek/deepseek-v3.2',
    'deepseek/deepseek-chat',
    'moonshotai/kimi-k2.5',
    'minimax/minimax-m2.5',
    'x-ai/grok-4.1-fast',
    'z-ai/glm-5',
    'meta-llama/llama-3.3-70b-instruct',
    'mistralai/mistral-large',
    'qwen/qwen-2.5-72b-instruct',
    'qwen/qwen3-coder-next',
  ],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'dall-e-3', 'gpt-image-1'],
  anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-opus', 'claude-3-haiku'],
  gemini: ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  replicate: ['black-forest-labs/flux-schnell', 'stability-ai/sdxl'],
  perplexity: ['sonar-pro', 'sonar'],
  kie: ['flux-kontext-pro', 'flux-kontext-max', 'gpt-image-1', 'gpt-image-1.5'],
  poyo: ['poyo/nano-banana-2-new', 'poyo/nano-banana-2-new-edit', 'poyo/nano-banana-2', 'poyo/nano-banana-2-edit', 'poyo/gpt-4o-image', 'poyo/gpt-4o-image-edit', 'poyo/gpt-image-1.5', 'poyo/z-image', 'poyo/flux-2-pro', 'poyo/flux-2-pro-edit', 'poyo/flux-2-flex', 'poyo/flux-2-flex-edit', 'poyo/seedream-4.5', 'poyo/seedream-4.5-edit', 'poyo/grok-imagine'],
  dashscope: ['qwen-plus', 'qwen-max', 'qwen-turbo', 'qwen-vl-max', 'qwen-long'],
  geminigen: ['geminigen/nano-banana-pro', 'geminigen/nano-banana-2', 'geminigen/imagen-4'],
  custom: [],
};

export function useAIConfig(organizationId?: string) {
  const queryClient = useQueryClient();

  // Fetch provider configs
  const providersQuery = useQuery({
    queryKey: ['ai-provider-configs', organizationId],
    queryFn: async (): Promise<AIProviderConfig[]> => {
      let query = supabase.from('ai_provider_configs').select('*');
      
      if (organizationId) {
        // Fetch org-specific OR global providers (organization_id is null)
        query = query.or(`organization_id.eq.${organizationId},organization_id.is.null`);
      }
      // If no organizationId, fetch all providers (for admins)
      
      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map(p => ({
        id: p.id,
        organizationId: p.organization_id,
        providerType: p.provider_type,
        displayName: p.display_name,
        isActive: p.is_active ?? true,
        apiKeySecretName: p.api_key_secret_name,
        baseUrl: p.base_url,
        defaultModel: p.default_model,
        config: (p.config as Record<string, any>) || {},
        encryptedApiKey: p.encrypted_api_key ?? null,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      }));
    },
    enabled: true, // Always fetch - RLS will handle permissions
  });

  // Fetch function configs
  const functionsQuery = useQuery({
    queryKey: ['ai-function-configs', organizationId],
    queryFn: async (): Promise<AIFunctionConfig[]> => {
      let query = supabase.from('ai_function_configs').select('*');
      
      if (organizationId) {
        // Org-specific configs OR global configs (organization_id is null)
        query = query.or(`organization_id.eq.${organizationId},organization_id.is.null`);
      } else {
        // Admin mode: only get global configs
        query = query.is('organization_id', null);
      }
      
      // Order by updated_at DESC to get latest first
      query = query.order('updated_at', { ascending: false });
      
      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map(f => ({
        id: f.id,
        organizationId: f.organization_id,
        functionName: f.function_name,
        providerConfigId: f.provider_config_id,
        modelOverride: f.model_override,
        parameters: (f.parameters as Record<string, any>) || {},
        isEnabled: f.is_enabled ?? true,
        cacheTtlHours: f.cache_ttl_hours ?? 24,
        priorityLevel: f.priority_level ?? 'normal',
        temperature: (f as any).temperature ?? null,
        maxTokens: (f as any).max_tokens ?? null,
        customSystemPrompt: (f as any).custom_system_prompt ?? null,
        forceProvider: (f as any).force_provider ?? null,
        createdAt: f.created_at,
        updatedAt: f.updated_at,
      }));
    },
    enabled: true, // Always enabled for admin access
  });

  // Upsert provider config
  const upsertProviderMutation = useMutation({
    mutationFn: async (config: Partial<AIProviderConfig> & { providerType: string }) => {
      const payload: Record<string, any> = {
        organization_id: organizationId,
        provider_type: config.providerType,
        display_name: config.displayName || config.providerType,
        is_active: config.isActive ?? true,
        api_key_secret_name: config.apiKeySecretName,
        base_url: config.baseUrl,
        default_model: config.defaultModel,
        config: config.config || {},
      };
      
      // Add encrypted API key if provided
      if (config.encryptedApiKey) {
        payload.encrypted_api_key = config.encryptedApiKey;
      }

      if (config.id) {
        const { data, error } = await supabase
          .from('ai_provider_configs')
          .update(payload)
          .eq('id', config.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('ai_provider_configs')
          .insert(payload as any)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-provider-configs'] });
      toast.success('Đã lưu cấu hình provider');
    },
    onError: (error) => {
      toast.error('Lỗi lưu cấu hình: ' + error.message);
    },
  });

  // Upsert function config
  const upsertFunctionMutation = useMutation({
    mutationFn: async (config: Partial<AIFunctionConfig> & { functionName: string }) => {
      const payload: Record<string, any> = {
        organization_id: organizationId ?? null,
        function_name: config.functionName,
        provider_config_id: config.providerConfigId,
        model_override: config.modelOverride,
        parameters: config.parameters || {},
        is_enabled: config.isEnabled ?? true,
        cache_ttl_hours: config.cacheTtlHours ?? 24,
        priority_level: config.priorityLevel ?? 'normal',
        temperature: config.temperature ?? null,
        max_tokens: config.maxTokens ?? null,
        custom_system_prompt: config.customSystemPrompt ?? null,
        force_provider: config.forceProvider ?? null,
      };

      // Check if record exists for this function_name + organization_id
      let existingQuery = supabase
        .from('ai_function_configs')
        .select('id')
        .eq('function_name', config.functionName);
        
      if (organizationId) {
        existingQuery = existingQuery.eq('organization_id', organizationId);
      } else {
        existingQuery = existingQuery.is('organization_id', null);
      }
      
      const { data: existing } = await existingQuery.maybeSingle();

      if (config.id || existing?.id) {
        // UPDATE existing record
        const { data, error } = await supabase
          .from('ai_function_configs')
          .update(payload)
          .eq('id', config.id || existing!.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        // INSERT new record
        const { data, error } = await supabase
          .from('ai_function_configs')
          .insert(payload as any)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-function-configs'] });
      toast.success('Đã lưu cấu hình function');
    },
    onError: (error) => {
      toast.error('Lỗi lưu cấu hình: ' + error.message);
    },
  });

  // Delete provider
  const deleteProviderMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ai_provider_configs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-provider-configs'] });
      toast.success('Đã xóa provider');
    },
  });

  const refetchAll = async () => {
    await Promise.all([
      providersQuery.refetch(),
      functionsQuery.refetch(),
      queryClient.invalidateQueries({ queryKey: ['agent-model-configs'] }),
      queryClient.invalidateQueries({ queryKey: ['channel-model-configs'] }),
    ]);
  };

  return {
    providers: providersQuery.data || [],
    functions: functionsQuery.data || [],
    isLoading: providersQuery.isLoading || functionsQuery.isLoading,
    upsertProvider: upsertProviderMutation.mutateAsync,
    upsertFunction: upsertFunctionMutation.mutate,
    deleteProvider: deleteProviderMutation.mutate,
    refetch: () => {
      providersQuery.refetch();
      functionsQuery.refetch();
    },
    refetchAll,
  };
}

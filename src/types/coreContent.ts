// ============================================
// CORE CONTENT TYPES - Single Source of Truth
// ============================================

import { ContentGoal, ContentAngle, Channel } from './multichannel';

/**
 * Content Role in the Content Orchestration Flow
 * - seed: Awareness, open minds, no selling
 * - sprout: Deep analysis, trust building
 * - harvest: Solutions, case study, strong CTA
 */
export type ContentRole = 'seed' | 'sprout' | 'harvest';

/**
 * Core Content status
 */
export type CoreContentStatus = 'draft' | 'approved' | 'archived';

/**
 * Source type for core content
 */
export type CoreContentSourceType = 'ai_generated' | 'user_input' | 'imported';

/**
 * Core Content - Single Source of Truth
 * Long-form content (800-2000 words) that serves as the master content
 * before being transformed into platform-specific variants
 */
export interface CoreContent {
  id: string;
  
  // Basic metadata
  title: string;
  topic: string;
  
  // Long-form content (800-2000 words)
  content: string;
  word_count: number | null;
  
  // Context & Targeting
  content_goal: ContentGoal;
  content_angle: ContentAngle | null;
  target_audience: string | null;
  key_messages: string[];
  
  // Content Role (for Content Orchestration Flow)
  content_role: ContentRole | null;
  
  // Brand & Organization
  brand_template_id: string | null;
  organization_id: string;
  user_id: string | null;
  
  // Source tracking
  source_type: CoreContentSourceType;
  source_topic_history_id: string | null;
  
  // Quality metrics
  quality_score: number | null;
  ai_model_used: string | null;
  
  // Status
  status: CoreContentStatus;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Request to generate core content
 */
export interface GenerateCoreContentRequest {
  topic: string;
  contentGoal: ContentGoal;
  contentAngle?: ContentAngle;
  brandTemplateId?: string;
  organizationId: string;
  targetAudience?: string;
  additionalContext?: string;
  topicHistoryId?: string;
}

/**
 * Response from generate-core-content edge function
 */
export interface GenerateCoreContentResponse {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  keyMessages: string[];
  qualityScore: number;
  aiModel: string;
}

/**
 * Core content with derived variants info
 */
export interface CoreContentWithVariants extends CoreContent {
  derived_count: number;
  derived_channels: Channel[];
}

/**
 * Filter options for fetching core contents
 */
export interface CoreContentFilters {
  status?: CoreContentStatus;
  contentGoal?: ContentGoal;
  contentRole?: ContentRole;
  brandTemplateId?: string;
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

/**
 * Stats for core content library
 */
export interface CoreContentStats {
  total: number;
  draft: number;
  approved: number;
  archived: number;
  avgQualityScore: number;
  avgWordCount: number;
  totalDerivedVariants: number;
}

// ============================================
// CONTENT ROLE DEFINITIONS
// ============================================

export const CONTENT_ROLES: { 
  value: ContentRole; 
  label: string; 
  description: string;
  intent: string;
  kpis: string[];
  color: string;
}[] = [
  { 
    value: 'seed', 
    label: 'Seed', 
    description: 'Chỉ insight, mở não, không bán hàng',
    intent: 'Hiểu vấn đề (Awareness)',
    kpis: ['Reach', 'Hook rate', 'Impressions'],
    color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  },
  { 
    value: 'sprout', 
    label: 'Sprout', 
    description: 'Phân tích sâu, giải thích, xây dựng trust',
    intent: 'Tin tưởng (Trust Building)',
    kpis: ['Time spent', 'Save', 'Comment', 'Share'],
    color: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  },
  { 
    value: 'harvest', 
    label: 'Harvest', 
    description: 'Đưa giải pháp, case study, CTA mạnh',
    intent: 'Hành động (Conversion)',
    kpis: ['Lead', 'Inbox', 'Click CTA', 'Conversion'],
    color: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  },
];

// Map ContentGoal to suggested ContentRole
export const GOAL_TO_ROLE_MAP: Record<ContentGoal, ContentRole> = {
  awareness: 'seed',
  education: 'sprout',
  expertise: 'sprout',
  engagement: 'sprout',
  conversion: 'harvest',
};

// ============================================
// CORE CONTENT STATUS DEFINITIONS
// ============================================

export const CORE_CONTENT_STATUSES: {
  value: CoreContentStatus;
  label: string;
  description: string;
  color: string;
}[] = [
  { 
    value: 'draft', 
    label: 'Bản nháp', 
    description: 'Chưa được phê duyệt',
    color: 'bg-slate-500/15 text-slate-600 border-slate-500/30',
  },
  { 
    value: 'approved', 
    label: 'Đã duyệt', 
    description: 'Sẵn sàng để transform sang variants',
    color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  },
  { 
    value: 'archived', 
    label: 'Lưu trữ', 
    description: 'Không còn sử dụng',
    color: 'bg-slate-400/15 text-slate-500 border-slate-400/30',
  },
];

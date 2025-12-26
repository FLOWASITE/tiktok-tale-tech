export type EventType = 'holiday' | 'industry_event' | 'campaign' | 'awareness_day';

export interface CuratedEvent {
  id: string;
  name: string;
  description: string | null;
  event_date: string;
  end_date: string | null;
  event_type: EventType;
  country_code: string;
  industries: string[];
  suggested_topics: string[];
  suggested_angles: string[];
  priority: number;
  is_active: boolean;
  created_by: string | null;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CuratedNews {
  id: string;
  title: string;
  summary: string | null;
  source_url: string | null;
  news_date: string;
  expires_at: string;
  industries: string[];
  relevance_score: number;
  suggested_angles: string[];
  is_active: boolean;
  created_by: string | null;
  organization_id: string | null;
  created_at: string;
}

export type TrendingSource = 'curated_event' | 'curated_news' | 'web_search' | 'ai';

export interface HybridTrendingTopic {
  id?: string;
  topic: string;
  category: string;
  velocity_score: number;
  peak_status: 'rising' | 'peaking' | 'declining';
  peak_prediction: string;
  related_keywords: string[];
  engagement_potential: number;
  competition_level: 'low' | 'medium' | 'high';
  suggested_angles: string[];
  source: TrendingSource;
  source_id?: string;
  source_url?: string;
}

export const EVENT_TYPE_CONFIG: Record<EventType, { label: string; color: string }> = {
  'holiday': { label: 'Lễ hội', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
  'industry_event': { label: 'Sự kiện ngành', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  'campaign': { label: 'Chiến dịch', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  'awareness_day': { label: 'Ngày kỷ niệm', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
};

export const SOURCE_CONFIG: Record<TrendingSource, { label: string; icon: string; color: string }> = {
  'curated_event': { label: 'Sự kiện', icon: '📅', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
  'curated_news': { label: 'Tin tức', icon: '📰', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  'web_search': { label: 'Web Search', icon: '🔍', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  'ai': { label: 'AI', icon: '🤖', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
};

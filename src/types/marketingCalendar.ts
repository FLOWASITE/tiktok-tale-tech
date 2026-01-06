export type EventType = 'holiday' | 'shopping' | 'industry' | 'trending';

export interface MarketingEvent {
  id: string;
  event_name: string;
  event_name_vi: string | null;
  event_type: EventType;
  start_date: string;
  end_date: string | null;
  country_code: string;
  industries: string[];
  suggested_themes: string[];
  suggested_keywords: string[];
  urgency_level: number;
  is_active: boolean;
  created_at: string;
}

export const EVENT_TYPE_CONFIG = {
  holiday: { label: 'Ngày lễ', icon: '🎉', color: 'text-red-600', bgColor: 'bg-red-100' },
  shopping: { label: 'Shopping', icon: '🛒', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  industry: { label: 'Ngành nghề', icon: '🏢', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  trending: { label: 'Xu hướng', icon: '🔥', color: 'text-orange-600', bgColor: 'bg-orange-100' },
} as const;

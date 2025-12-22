import { Channel } from './multichannel';

export type PublishStatus = 'scheduled' | 'publishing' | 'published' | 'failed' | 'cancelled';

export type PublishingAction = 'scheduled' | 'published' | 'failed' | 'cancelled' | 'rescheduled';

export interface ContentSchedule {
  id: string;
  content_id: string;
  channel: Channel;
  organization_id: string | null;
  scheduled_at: string;
  timezone: string;
  publish_status: PublishStatus;
  published_at: string | null;
  publish_error: string | null;
  external_post_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublishingLog {
  id: string;
  schedule_id: string | null;
  content_id: string | null;
  channel: string;
  organization_id: string | null;
  action: PublishingAction;
  performed_by: string | null;
  performed_at: string;
  details: Record<string, unknown>;
  error_message: string | null;
  created_at: string;
}

export interface ScheduleFormData {
  channel: Channel;
  scheduled_at: string;
  timezone?: string;
  notes?: string;
}

export const PUBLISH_STATUSES: { value: PublishStatus; label: string; color: string }[] = [
  { value: 'scheduled', label: 'Đã lên lịch', color: 'yellow' },
  { value: 'publishing', label: 'Đang đăng', color: 'blue' },
  { value: 'published', label: 'Đã đăng', color: 'green' },
  { value: 'failed', label: 'Thất bại', color: 'red' },
  { value: 'cancelled', label: 'Đã hủy', color: 'gray' },
];

export const PUBLISHING_ACTIONS: { value: PublishingAction; label: string }[] = [
  { value: 'scheduled', label: 'Lên lịch' },
  { value: 'published', label: 'Đăng bài' },
  { value: 'failed', label: 'Thất bại' },
  { value: 'cancelled', label: 'Hủy lịch' },
  { value: 'rescheduled', label: 'Đổi lịch' },
];

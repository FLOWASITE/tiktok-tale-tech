import { Channel } from './multichannel';
import { Json } from '@/integrations/supabase/types';

export type AssignmentStatus = 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled';
export type AssignmentPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface ContentAssignment {
  id: string;
  content_id: string;
  channel: Channel;
  assigned_to: string;
  assigned_by: string;
  organization_id: string;
  status: AssignmentStatus;
  priority: AssignmentPriority;
  due_date: string | null;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  assignee?: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  assigner?: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface Notification {
  id: string;
  user_id: string;
  organization_id: string | null;
  type: string;
  title: string;
  message: string;
  data: Json;
  read_at: string | null;
  created_at: string;
}

export const ASSIGNMENT_STATUSES: { value: AssignmentStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'Chờ xử lý', color: 'bg-muted text-muted-foreground' },
  { value: 'in_progress', label: 'Đang thực hiện', color: 'bg-blue-500/20 text-blue-500' },
  { value: 'review', label: 'Chờ duyệt', color: 'bg-yellow-500/20 text-yellow-500' },
  { value: 'completed', label: 'Hoàn thành', color: 'bg-green-500/20 text-green-500' },
  { value: 'cancelled', label: 'Đã hủy', color: 'bg-red-500/20 text-red-500' },
];

export const ASSIGNMENT_PRIORITIES: { value: AssignmentPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Thấp', color: 'bg-muted text-muted-foreground' },
  { value: 'normal', label: 'Bình thường', color: 'bg-blue-500/20 text-blue-500' },
  { value: 'high', label: 'Cao', color: 'bg-orange-500/20 text-orange-500' },
  { value: 'urgent', label: 'Khẩn cấp', color: 'bg-red-500/20 text-red-500' },
];

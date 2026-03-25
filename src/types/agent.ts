export type AgentPipelineStage = 
  | 'research' | 'creation' | 'optimization' | 'expansion' 
  | 'compliance' | 'approval' | 'scheduled' | 'published' | 'analyzing';

export type AgentAutonomyLevel = 'human_in_loop' | 'human_on_loop' | 'full_auto';

export type AgentPriority = 'low' | 'normal' | 'high' | 'urgent';

export type AgentApprovalStatus = 'pending' | 'approved' | 'rejected' | 'edited';

export interface AgentGoal {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  target_topics: string[];
  target_channels: string[];
  frequency: Record<string, string>;
  autonomy_level: AgentAutonomyLevel;
  brand_template_id: string | null;
  campaign_id: string | null;
  is_active: boolean;
  is_paused: boolean;
  created_by: string | null;
  clarification_context: Record<string, string> | null;
  campaign_duration_days: number | null;
  campaign_start_date: string | null;
  campaign_end_date: string | null;
  approval_mode: string | null;
  created_at: string;
  updated_at: string;
}

export type CampaignPlanStatus = 'draft' | 'clarifying' | 'planning' | 'planned' | 'approved' | 'executing' | 'completed' | 'paused';
export type CampaignApprovalMode = 'approve_plan' | 'approve_each' | 'full_auto';

export interface CampaignContentPiece {
  piece_number: number;
  title: string;
  angle: string;
  target_channel: string;
  content_role: string;
  scheduled_date: string | null;
  format: 'post' | 'carousel' | 'video_script' | 'email';
  key_message: string;
  pipeline_id: string | null;
  status: 'planned' | 'approved' | 'in_progress' | 'completed' | 'failed';
}

export interface CampaignContentPlan {
  id: string;
  goal_id: string;
  organization_id: string;
  plan_data: CampaignContentPiece[];
  total_pieces: number;
  completed_pieces: number;
  campaign_start_date: string | null;
  campaign_end_date: string | null;
  campaign_duration_days: number | null;
  approval_mode: CampaignApprovalMode;
  plan_approved: boolean;
  plan_approved_at: string | null;
  clarification_context: Record<string, any> | null;
  status: CampaignPlanStatus;
  created_at: string;
  updated_at: string;
}

export interface AgentPipeline {
  id: string;
  organization_id: string;
  goal_id: string | null;
  campaign_id: string | null;
  content_title: string;
  content_topic: string | null;
  current_stage: AgentPipelineStage;
  pipeline_state: Record<string, any>;
  priority: AgentPriority;
  autonomy_level: AgentAutonomyLevel;
  is_flagged: boolean;
  flag_reason: string | null;
  content_id: string | null;
  estimated_completion: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentPipelineLog {
  id: string;
  pipeline_id: string;
  agent_name: string;
  action: string;
  input_summary: string | null;
  output_summary: string | null;
  tokens_used: number;
  cost_usd: number;
  duration_ms: number;
  error_message: string | null;
  created_at: string;
}

export interface AgentApproval {
  id: string;
  pipeline_id: string;
  organization_id: string;
  content_preview: string | null;
  channel_versions: Record<string, any>;
  scores: { seo?: number; geo?: number; compliance?: string };
  status: AgentApprovalStatus;
  reviewer_id: string | null;
  reviewer_notes: string | null;
  decided_at: string | null;
  created_at: string;
}

export interface AgentTeamPermission {
  id: string;
  organization_id: string;
  user_id: string;
  can_create_goals: boolean;
  can_approve: boolean;
  can_override: boolean;
  max_autonomy_level: AgentAutonomyLevel;
  monthly_pipeline_limit: number | null;
  is_active: boolean;
  granted_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentTeamMember {
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  org_role: string;
  permission: AgentTeamPermission | null;
  pipelines_this_month: number;
}

// Pipeline stage metadata for UI
export const PIPELINE_STAGES: { id: AgentPipelineStage; label: string; icon: string; color: string }[] = [
  { id: 'research', label: 'Nghiên cứu', icon: 'Search', color: 'from-violet-500/20 to-violet-500/10' },
  { id: 'creation', label: 'Sáng tạo', icon: 'PenTool', color: 'from-blue-500/20 to-blue-500/10' },
  { id: 'optimization', label: 'Tối ưu', icon: 'Gauge', color: 'from-cyan-500/20 to-cyan-500/10' },
  { id: 'expansion', label: 'Mở rộng', icon: 'Layers', color: 'from-teal-500/20 to-teal-500/10' },
  { id: 'compliance', label: 'Tuân thủ', icon: 'ShieldCheck', color: 'from-orange-500/20 to-orange-500/10' },
  { id: 'approval', label: 'Duyệt', icon: 'UserCheck', color: 'from-amber-500/20 to-amber-500/10' },
  { id: 'scheduled', label: 'Đã lên lịch', icon: 'Calendar', color: 'from-indigo-500/20 to-indigo-500/10' },
  { id: 'published', label: 'Đã đăng', icon: 'Send', color: 'from-emerald-500/20 to-emerald-500/10' },
  { id: 'analyzing', label: 'Phân tích', icon: 'BarChart3', color: 'from-pink-500/20 to-pink-500/10' },
];

export const AUTONOMY_LEVELS: { id: AgentAutonomyLevel; label: string; description: string }[] = [
  { id: 'human_in_loop', label: 'Human-in-the-loop', description: 'Duyệt từng bước trước khi tiếp tục' },
  { id: 'human_on_loop', label: 'Human-on-the-loop', description: 'Chạy tự động, review sau khi hoàn thành' },
  { id: 'full_auto', label: 'Tự động hoàn toàn', description: 'Chạy và publish tự động, chỉ nhận báo cáo' },
];

// ============================================
// SCRIPT COLLABORATION TYPES
// ============================================

export type ScriptApprovalStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected';

export interface ScriptVersion {
  id: string;
  script_id: string;
  version: number;
  content: string;
  topic?: string;
  duration?: number;
  video_type?: string;
  character_type?: string;
  storyboard?: unknown;
  analysis_cache?: unknown;
  change_summary?: string;
  created_by: string;
  created_at: string;
}

export interface ScriptApproval {
  id: string;
  script_id: string;
  requested_by: string;
  requested_at: string;
  reviewer_id?: string;
  reviewed_at?: string;
  status: ScriptApprovalStatus;
  notes?: string;
  version_at_request: number;
  organization_id?: string;
}

export interface ScriptCollaborationInfo {
  status: ScriptApprovalStatus;
  version: number;
  shared_with_org: boolean;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
}

export const APPROVAL_STATUS_CONFIG: Record<ScriptApprovalStatus, {
  label: string;
  labelVi: string;
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
  icon: string;
}> = {
  draft: {
    label: 'Draft',
    labelVi: 'Nháp',
    variant: 'secondary',
    icon: '📝',
  },
  pending_approval: {
    label: 'Pending Approval',
    labelVi: 'Chờ phê duyệt',
    variant: 'outline',
    icon: '⏳',
  },
  approved: {
    label: 'Approved',
    labelVi: 'Đã duyệt',
    variant: 'default',
    icon: '✅',
  },
  rejected: {
    label: 'Rejected',
    labelVi: 'Từ chối',
    variant: 'destructive',
    icon: '❌',
  },
};

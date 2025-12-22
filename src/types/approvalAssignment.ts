export interface ApprovalAssignment {
  id: string;
  organization_id: string;
  approver_id: string;
  creator_id: string;
  created_at: string;
  created_by: string | null;
}

export interface ApprovalAssignmentWithProfiles extends ApprovalAssignment {
  approver_profile?: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  creator_profile?: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

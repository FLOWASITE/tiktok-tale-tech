export interface SubRow {
  id: string;
  organization_id: string;
  user_id: string | null;
  plan_type: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  org_name: string;
  owner_email: string;
}

export type SortField = "org_name" | "plan_type" | "status" | "current_period_end" | "created_at";
export type SortOrder = "asc" | "desc";

export interface ConfirmAction {
  type: "change_plan" | "renew" | "cancel" | "bulk_renew" | "bulk_cancel";
  subId?: string;
  planType?: string;
  orgName?: string;
  currentPlan?: string;
  count?: number;
}

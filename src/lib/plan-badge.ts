export const PLAN_BADGE_CONFIG: Record<string, { label: string; className: string }> = {
  free: { label: "FREE", className: "bg-muted text-muted-foreground border-border" },
  starter: { label: "STARTER", className: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400" },
  pro: { label: "PRO", className: "bg-primary/10 text-primary border-primary/20" },
  enterprise: { label: "ENTERPRISE", className: "bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400" },
};

export function getPlanBadge(planType?: string | null) {
  return PLAN_BADGE_CONFIG[planType || "free"] || PLAN_BADGE_CONFIG.free;
}

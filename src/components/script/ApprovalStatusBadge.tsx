import { Badge } from '@/components/ui/badge';
import { ScriptApprovalStatus, APPROVAL_STATUS_CONFIG } from '@/types/scriptCollaboration';

interface ApprovalStatusBadgeProps {
  status: ScriptApprovalStatus;
  className?: string;
}

export function ApprovalStatusBadge({ status, className }: ApprovalStatusBadgeProps) {
  const config = APPROVAL_STATUS_CONFIG[status];
  
  return (
    <Badge variant={config.variant} className={className}>
      <span className="mr-1">{config.icon}</span>
      {config.labelVi}
    </Badge>
  );
}

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MemberAvatar } from '@/components/MemberAvatar';
import { useOrganizationSettings } from '@/hooks/useOrganizationSettings';
import { useApprovalAssignments } from '@/hooks/useApprovalAssignments';
import { useOrganizationMembers } from '@/hooks/useOrganizationMembers';
import { UserCheck, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface AssignedApproverInfoProps {
  creatorId: string | null | undefined;
  compact?: boolean;
}

export function AssignedApproverInfo({ creatorId, compact = false }: AssignedApproverInfoProps) {
  const { useSpecificApprovers, approverRoles, loading: settingsLoading } = useOrganizationSettings();
  const { assignments, loading: assignmentsLoading } = useApprovalAssignments();
  const { members, loading: membersLoading } = useOrganizationMembers();

  const approverInfo = useMemo(() => {
    if (!creatorId) return null;

    if (useSpecificApprovers) {
      // Get specific approvers assigned to this creator
      const approverIds = assignments
        .filter(a => a.creator_id === creatorId)
        .map(a => a.approver_id);
      
      const approverMembers = members.filter(m => approverIds.includes(m.user_id));
      
      return {
        mode: 'specific' as const,
        approvers: approverMembers,
      };
    } else {
      // Get all members with approver roles
      const approverMembers = members.filter(m => approverRoles.includes(m.role));
      
      return {
        mode: 'role' as const,
        approvers: approverMembers,
        roles: approverRoles,
      };
    }
  }, [creatorId, useSpecificApprovers, assignments, members, approverRoles]);

  const isLoading = settingsLoading || assignmentsLoading || membersLoading;

  if (isLoading) {
    return <Skeleton className="h-5 w-24" />;
  }

  if (!approverInfo || approverInfo.approvers.length === 0) {
    if (useSpecificApprovers) {
      return (
        <span className="text-xs text-muted-foreground italic">
          Chưa phân công người duyệt
        </span>
      );
    }
    return null;
  }

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-help">
            <UserCheck className="h-3 w-3" />
            <span>
              {approverInfo.mode === 'specific' 
                ? `${approverInfo.approvers.length} người duyệt`
                : `${approverInfo.approvers.length} có quyền duyệt`
              }
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <p className="text-xs font-medium">
              {approverInfo.mode === 'specific' 
                ? 'Người duyệt được phân công:'
                : 'Người có quyền duyệt (theo vai trò):'
              }
            </p>
            <div className="flex flex-wrap gap-1">
              {approverInfo.approvers.map(approver => (
                <Badge key={approver.user_id} variant="secondary" className="text-xs">
                  {approver.profile?.full_name || approver.profile?.email}
                </Badge>
              ))}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {approverInfo.mode === 'specific' ? (
          <UserCheck className="h-3.5 w-3.5 text-primary" />
        ) : (
          <Users className="h-3.5 w-3.5" />
        )}
        <span className="font-medium">
          {approverInfo.mode === 'specific' ? 'Người duyệt:' : 'Có quyền duyệt:'}
        </span>
      </div>
      
      <div className="flex items-center gap-1">
        {approverInfo.approvers.slice(0, 3).map(approver => (
          <Tooltip key={approver.user_id}>
            <TooltipTrigger asChild>
              <div>
                <MemberAvatar
                  avatarUrl={approver.profile?.avatar_url}
                  name={approver.profile?.full_name}
                  email={approver.profile?.email}
                  size="sm"
                  showStatus={false}
                  className="cursor-help"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <div className="text-xs">
                <p className="font-medium">{approver.profile?.full_name || approver.profile?.email}</p>
                <p className="text-muted-foreground">
                  {approver.role === 'owner' ? 'Chủ sở hữu' : approver.role === 'admin' ? 'Quản trị viên' : 'Thành viên'}
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
        
        {approverInfo.approvers.length > 3 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="text-xs cursor-help">
                +{approverInfo.approvers.length - 3}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <div className="space-y-1">
                {approverInfo.approvers.slice(3).map(approver => (
                  <p key={approver.user_id} className="text-xs">
                    {approver.profile?.full_name || approver.profile?.email}
                  </p>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
